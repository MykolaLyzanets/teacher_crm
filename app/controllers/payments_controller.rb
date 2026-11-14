# frozen_string_literal: true

class PaymentsController < AppController
  helper LessonsHelper

  before_action :require_finance_access!
  before_action :require_manage_access!, only: %i[
    create_student_payment confirm_payment reject_payment create_adjustment create_teacher_payout create_refund
  ]

  def modals
    return head :forbidden unless can_view_finance?

    render :modals, layout: turbo_frame_request? ? false : 'app'
  end

  def index
    return if @forbidden

    @school = current_workspace.blank? || current_workspace.school? || current_user.admin?
    page = page_data
    @overview = page.overview
    @balances = page.balance_rows
    @payouts = page.payout_rows
    @transactions = page.transaction_rows
    @students = page.student_filter_options
    @currencies = page.currencies
  end

  def create_student_payment
    student = student_profiles_scope.find(params.require(:student_profile_id))
    workspace = student.workspace
    service = Finance::AddStudentPayment.new(
      workspace:,
      student_profile: student,
      created_by: current_user,
      amount_cents: params.require(:amount_cents),
      method: params.require(:method),
      reference: params[:reference],
      internal_note: params[:internal_note],
      confirm: boolean_param(params[:confirm])
    )
    render_finance_result(service)
  end

  def confirm_payment
    payment = find_workspace_payment!(params.require(:payment_id))
    service = Finance::ConfirmPayment.new(payment:, confirmed_by: current_user)
    render_finance_result(service)
  end

  def reject_payment
    payment = find_workspace_payment!(params.require(:payment_id))
    service = Finance::RejectPayment.new(payment:)
    render_finance_result(service)
  end

  def create_adjustment
    student = student_profiles_scope.find(params.require(:student_profile_id))
    workspace = student.workspace
    service = Finance::ChangeStudentBalance.new(
      workspace:,
      student_profile: student,
      created_by: current_user,
      amount_cents: params.require(:amount_cents),
      reason: params.require(:reason)
    )
    render_finance_result(service)
  end

  def create_refund
    payment = find_workspace_payment!(params.require(:payment_id))
    if payment.confirmed?
      service = Finance::RefundPayment.new(
        payment:,
        created_by: current_user,
        amount_cents: params.require(:amount_cents),
        reason: params[:reason]
      )
      render_finance_result(service)
    else
      render json: { errors: [I18n.t('app.payments.refund_not_allowed')] }, status: :unprocessable_entity
    end
  end

  def create_teacher_payout
    teacher = teacher_profiles_scope.find(params.require(:teacher_profile_id))
    workspace = teacher.workspace
    paid_at = Time.zone.parse(params.require(:paid_at).to_s)
    service = Finance::PayTeacher.new(
      workspace:,
      teacher_profile: teacher,
      created_by: current_user,
      amount_cents: params.require(:amount_cents),
      method: params.require(:method),
      paid_at:,
      reference: params[:reference],
      note: params[:note]
    )
    render_finance_result(service)
  end

  private

  def page_data
    Payments::PageData.new(
      workspace: current_workspace,
      students: student_profiles_scope,
      teachers: teacher_profiles_scope
    )
  end

  def require_finance_access!
    return if can_view_finance?

    @forbidden = true
    head :forbidden if action_name != 'index'
  end

  def require_manage_access!
    return if can_manage_payments?

    render json: { errors: [I18n.t('app.payments.forbidden_text')] }, status: :forbidden
  end

  def find_workspace_payment!(id)
    scope = StudentTransaction.transaction_payment
    scope = scope.where(workspace_id: current_workspace.id) if current_workspace.present?
    scope.find(id)
  end

  def render_finance_result(service)
    if service.save
      render json: { ok: true }, status: :ok
    else
      render json: { errors: service.error_messages }, status: :unprocessable_entity
    end
  end

  def boolean_param(value)
    %w[1 true yes on].include?(value.to_s.downcase)
  end
end
