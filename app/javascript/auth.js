const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const passwordRules = {
  length: (value) => value.length >= 8,
  upper: (value) => /[A-Z]/.test(value),
  lower: (value) => /[a-z]/.test(value),
  number: (value) => /\d/.test(value),
};

const parseI18n = (form) => {
  try {
    return JSON.parse(form.dataset.authI18n || "{}");
  } catch {
    return {};
  }
};

const passwordMeetsAll = (value) =>
  Object.values(passwordRules).every((rule) => rule(value));

const updateRequirements = (root, value) => {
  Object.entries(passwordRules).forEach(([key, matches]) => {
    root
      .querySelector(`[data-auth-req="${key}"]`)
      ?.classList.toggle("is-done", matches(value));
  });
};

const fieldInput = (form, key) => {
  const error = form.querySelector(`[data-auth-error="${key}"]`);
  return error?.closest(".auth-field")?.querySelector("input");
};

const fieldWrap = (form, key) => {
  const error = form.querySelector(`[data-auth-error="${key}"]`);
  return (
    error?.closest(".auth-field")?.querySelector(".auth-input") ||
    error?.closest(".auth-check") ||
    error?.closest(".auth-workspace")
  );
};

const setError = (form, key, message) => {
  const el = form.querySelector(`[data-auth-error="${key}"]`);
  const wrap = fieldWrap(form, key);
  const input = fieldInput(form, key);

  if (el) {
    el.hidden = !message;
    el.textContent = message || "";
  }

  wrap?.classList.toggle("is-invalid", Boolean(message));
  input?.setAttribute("aria-invalid", message ? "true" : "false");
};

const initPasswordToggles = (root, i18n) => {
  root.querySelectorAll("[data-auth-toggle-password]").forEach((button) => {
    button.addEventListener("click", () => {
      const wrap = button.closest(".auth-input");
      const input = wrap?.querySelector("[data-auth-password]");
      const showIcon = wrap?.querySelector('[data-auth-eye="show"]');
      const hideIcon = wrap?.querySelector('[data-auth-eye="hide"]');
      if (!input) return;

      const visible = input.type === "text";
      input.type = visible ? "password" : "text";
      if (showIcon) showIcon.style.display = visible ? "" : "none";
      if (hideIcon) hideIcon.style.display = visible ? "none" : "";
      button.setAttribute(
        "aria-label",
        visible ? i18n.show_password || "Show password" : i18n.hide_password || "Hide password",
      );
    });
  });
};

const loginErrors = (form, i18n) => {
  const email = form.querySelector("#user_email")?.value.trim() ?? "";
  const password = form.querySelector("#user_password")?.value ?? "";
  const errors = {};

  if (!email) errors.email = i18n.email_blank;
  else if (!EMAIL_PATTERN.test(email)) errors.email = i18n.email_invalid;
  if (!password) errors.password = i18n.password_blank;

  return errors;
};

const registerValues = (form) => ({
  fullName: form.querySelector("#user_full_name")?.value ?? "",
  email: form.querySelector("#user_email")?.value ?? "",
  password: form.querySelector("#user_password")?.value ?? "",
  confirm: form.querySelector("#user_password_confirmation")?.value ?? "",
  terms: form.querySelector("#terms")?.checked ?? false,
  workspaceType: form.querySelector("[data-auth-workspace-type]:checked")?.value ?? "",
  workspaceName: form.querySelector("#workspace_name")?.value ?? "",
});

const registerErrors = (values, i18n) => {
  const errors = {};
  const name = values.fullName.trim();
  const email = values.email.trim();

  if (values.workspaceType !== "individual" && values.workspaceType !== "school") {
    errors.workspace_type = i18n.workspace_type;
  } else if (values.workspaceType === "school" && !values.workspaceName.trim()) {
    errors.workspace_name = i18n.workspace_name;
  }

  if (!name) errors.full_name = i18n.name_blank;
  else if (name.length < 2) errors.full_name = i18n.name_short;

  if (!email) errors.email = i18n.email_blank;
  else if (!EMAIL_PATTERN.test(email)) errors.email = i18n.email_invalid;

  if (!values.password) errors.password = i18n.password_blank;
  else if (!passwordMeetsAll(values.password)) {
    errors.password = i18n.password_requirements;
  }

  if (!values.confirm) errors.password_confirmation = i18n.confirm_blank;
  else if (values.confirm !== values.password) {
    errors.password_confirmation = i18n.confirm_mismatch;
  }

  if (!values.terms) errors.terms = i18n.terms;

  return errors;
};

const applyErrors = (form, errors, keys) => {
  keys.forEach((key) => setError(form, key, errors[key] || ""));
};

const initLogin = (form) => {
  const i18n = parseI18n(form);
  const keys = ["email", "password"];

  initPasswordToggles(form, i18n);
  form.querySelector("#user_email")?.addEventListener("input", () => {
    setError(form, "email", "");
  });
  form.querySelector("#user_password")?.addEventListener("input", () => {
    setError(form, "password", "");
  });

  form.addEventListener("submit", (event) => {
    const errors = loginErrors(form, i18n);
    if (Object.keys(errors).length) {
      event.preventDefault();
      applyErrors(form, errors, keys);
    }
  });
};

const initRegister = (form) => {
  const i18n = parseI18n(form);
  const keys = [
    "workspace_type",
    "workspace_name",
    "full_name",
    "email",
    "password",
    "password_confirmation",
    "terms",
  ];
  const submit = form.querySelector("[data-auth-submit]");
  const submitLabel = form.querySelector("[data-auth-submit-label]");
  const password = form.querySelector("[data-auth-new-password]");
  const workspaceNameField = form.querySelector("[data-auth-workspace-name-field]");
  const workspaceNameInput = form.querySelector("#workspace_name");
  const workspaceRadios = [...form.querySelectorAll("[data-auth-workspace-type]")];
  const touched = {};
  let submitted = false;

  initPasswordToggles(form, i18n);

  const selectedWorkspace = () =>
    form.querySelector("[data-auth-workspace-type]:checked")?.value || "individual";

  const persistWorkspaceIntent = () => {
    const type = selectedWorkspace();
    window.sessionStorage.setItem(
      "danlio-registration-workspace",
      JSON.stringify({
        workspaceType: type,
        workspaceName: type === "school" ? (workspaceNameInput?.value || "").trim() : "",
      }),
    );
  };

  const syncWorkspaceField = () => {
    const school = selectedWorkspace() === "school";
    if (workspaceNameField) workspaceNameField.hidden = !school;
    if (!school && workspaceNameInput) {
      workspaceNameInput.value = "";
      touched.workspace_name = false;
      setError(form, "workspace_name", "");
    }
    if (workspaceNameInput) {
      workspaceNameInput.required = school;
      workspaceNameInput.disabled = !school;
    }
  };

  const sync = () => {
    const values = registerValues(form);
    updateRequirements(form, values.password);
    const errors = registerErrors(values, i18n);
    if (submit && !form.classList.contains("is-submitting")) {
      submit.disabled = Object.keys(errors).length > 0;
    }
    keys.forEach((key) => {
      if (touched[key] || submitted) setError(form, key, errors[key] || "");
    });
  };

  const mark = (key) => () => {
    touched[key] = true;
    sync();
  };

  const focusWorkspace = (value) => {
    form.querySelector(`[data-auth-workspace-type][value="${value}"]`)?.focus();
  };

  workspaceRadios.forEach((radio) => {
    radio.addEventListener("change", () => {
      syncWorkspaceField();
      sync();
    });
    radio.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
      event.preventDefault();
      const current = workspaceRadios.findIndex((item) => item.value === radio.value);
      const direction = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1;
      const next = workspaceRadios[(current + direction + workspaceRadios.length) % workspaceRadios.length];
      next.checked = true;
      syncWorkspaceField();
      sync();
      window.requestAnimationFrame(() => focusWorkspace(next.value));
    });
  });

  form.querySelector("#user_full_name")?.addEventListener("input", sync);
  form.querySelector("#user_full_name")?.addEventListener("blur", mark("full_name"));
  form.querySelector("#user_email")?.addEventListener("input", sync);
  form.querySelector("#user_email")?.addEventListener("blur", mark("email"));
  password?.addEventListener("input", sync);
  password?.addEventListener("blur", mark("password"));
  form
    .querySelector("#user_password_confirmation")
    ?.addEventListener("input", sync);
  form
    .querySelector("#user_password_confirmation")
    ?.addEventListener("blur", mark("password_confirmation"));
  workspaceNameInput?.addEventListener("input", sync);
  workspaceNameInput?.addEventListener("blur", mark("workspace_name"));
  form.querySelector("#terms")?.addEventListener("change", () => {
    touched.terms = true;
    sync();
  });

  const googleForm = document.querySelector("[data-auth-google-form]");
  googleForm?.addEventListener("submit", (event) => {
    persistWorkspaceIntent();
    const values = registerValues(form);
    const errors = {};
    if (values.workspaceType !== "individual" && values.workspaceType !== "school") {
      errors.workspace_type = i18n.workspace_type;
    } else if (values.workspaceType === "school" && !values.workspaceName.trim()) {
      errors.workspace_name = i18n.workspace_name;
    }
    if (!values.terms) errors.terms = i18n.terms;

    if (Object.keys(errors).length) {
      event.preventDefault();
      applyErrors(form, errors, ["workspace_type", "workspace_name", "terms"]);
      return;
    }

    const typeInput = googleForm.querySelector("[name='workspace_type']");
    const nameInput = googleForm.querySelector("[name='workspace_name']");
    const termsInput = googleForm.querySelector("[name='terms']");
    if (typeInput) typeInput.value = values.workspaceType;
    if (nameInput) nameInput.value = values.workspaceName;
    if (termsInput) termsInput.value = "1";
  });

  form.addEventListener("submit", (event) => {
    submitted = true;
    const errors = registerErrors(registerValues(form), i18n);
    applyErrors(form, errors, keys);

    if (Object.keys(errors).length || form.classList.contains("is-submitting")) {
      event.preventDefault();
      return;
    }

    persistWorkspaceIntent();
    form.classList.add("is-submitting");
    submit?.classList.add("is-loading");
    if (submit) submit.disabled = true;
    if (submitLabel && i18n.creating) submitLabel.textContent = i18n.creating;
    form.querySelectorAll(".auth-social-btn").forEach((button) => {
      button.disabled = true;
    });
  });

  syncWorkspaceField();
  sync();
};

const initAuthPage = () => {
  document.querySelectorAll("[data-auth-form]").forEach((form) => {
    if (form.dataset.authForm === "register") initRegister(form);
    else initLogin(form);
  });

  const password = document.querySelector("[data-auth-new-password]");
  if (password && !password.closest("[data-auth-form]")) {
    const form = password.closest("form") || document;
    updateRequirements(form, password.value);
    password.addEventListener("input", () => {
      updateRequirements(form, password.value);
    });
    initPasswordToggles(form, {});
  }
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAuthPage);
} else {
  initAuthPage();
}
