const initAuthPage = () => {
  document.querySelectorAll("[data-auth-toggle-password]").forEach((button) => {
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
    });
  });

  const password = document.querySelector("[data-auth-new-password]");
  if (!password) return;

  const rules = {
    length: (value) => value.length >= 8,
    upper: (value) => /[A-Z]/.test(value),
    lower: (value) => /[a-z]/.test(value),
    number: (value) => /\d/.test(value),
  };

  const update = () => {
    const value = password.value;
    Object.entries(rules).forEach(([key, matches]) => {
      document
        .querySelector(`[data-auth-req="${key}"]`)
        ?.classList.toggle("is-done", matches(value));
    });
  };

  password.addEventListener("input", update);
  update();
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAuthPage);
} else {
  initAuthPage();
}
