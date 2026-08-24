# frozen_string_literal: true

class PaymentsController < AppController
  helper LessonsHelper

  def index
    unless can_view_finance?
      @forbidden = true
      return
    end

    @overview = Demo::Finance.workspace_overview
    @school = current_workspace.blank? || current_workspace.school? || current_user.admin?
    @balances = student_balance_rows
    @payouts = teacher_payout_rows
    @transactions = unified_transactions
    @students = Demo::Catalog.active_students
    @currencies = @transactions.map { |item| item[:currency] }.uniq.sort
  end

  private

  def can_view_finance?
    current_user.owner? || current_user.admin?
  end

  def student_balance_rows
    Demo::Catalog.active_students.map do |student|
      student_id = student[:id]
      pricing = Demo::Finance.pricing_for(student_id)
      next_lesson = Demo::Finance.next_lesson_for_student(student)
      {
        student: student,
        name: Demo::Catalog.student_name(student),
        teacher: student[:teacher].presence || t('app.common.unassigned'),
        availableCents: Demo::Finance.available_balance_cents(student_id),
        debtCents: Demo::Finance.debt_cents(student_id),
        currency: pricing&.dig(:currency).presence || 'EUR',
        lessonsCovered: lessons_covered(student_id, pricing),
        nextLessonDate: next_lesson&.dig(:date),
        status: Demo::Finance.student_balance_status(student_id)
      }.with_indifferent_access
    end.sort_by { |row| -row[:debtCents].to_i }
  end

  def lessons_covered(student_id, pricing)
    price = pricing&.dig(:defaultPriceCents).to_i
    return 0 unless price.positive?

    Demo::Finance.available_balance_cents(student_id) / price
  end

  def teacher_payout_rows
    Demo::Catalog.teachers.map do |teacher|
      summary = Demo::Finance.teacher_payout_summary(teacher[:id])
      {
        teacher: teacher,
        name: Demo::Catalog.teacher_name(teacher),
        summary: summary
      }.with_indifferent_access
    end
  end

  def unified_transactions
    rows = Demo::Catalog.transactions.map do |item|
      {
        id: item[:id],
        date: item[:date],
        kind: item[:type],
        party: item[:student],
        description: item[:description],
        amountCents: item[:amountCents],
        currency: item[:currency],
        status: item[:confirmationStatus]
      }
    end

    Demo::Catalog.earnings.each do |item|
      rows << {
        id: item[:id],
        date: item[:createdAt].to_s[0, 10],
        kind: 'teacher_earning',
        party: item[:teacher],
        description: item[:kind].to_s == 'cancellation_charged' ? 'Charged cancellation' : 'Lesson completed',
        amountCents: item[:earningCents],
        currency: item[:currency],
        status: item[:reversedAt].present? ? 'reversed' : nil
      }
    end

    Demo::Catalog.payouts.each do |item|
      rows << {
        id: item[:id],
        date: item[:date],
        kind: 'teacher_payout',
        party: item[:teacher],
        description: item[:note].presence || 'Teacher payout',
        amountCents: -item[:amountCents].to_i,
        currency: item[:currency],
        status: nil
      }
    end

    rows.map(&:with_indifferent_access).sort_by { |item| item[:date].to_s }.reverse
  end
end
