const params = new URLSearchParams(window.location.search);
const error = document.querySelector("#login-error");
const logoutMessage = document.querySelector("#logout-message");
const passwordInput = document.querySelector("#gate-password");
const nextInput = document.querySelector("#gate-next");
const toggle = document.querySelector("#password-toggle");

const requestedPath = params.get("next");
if (["/gate", "/gate-fundraising"].includes(requestedPath)) {
  nextInput.value = requestedPath;
}

if (params.get("error") === "1") error.hidden = false;
if (params.get("logged_out") === "1") logoutMessage.hidden = false;

toggle.addEventListener("click", () => {
  const reveal = passwordInput.type === "password";
  passwordInput.type = reveal ? "text" : "password";
  toggle.textContent = reveal ? "Sembunyikan" : "Lihat";
  toggle.setAttribute("aria-pressed", String(reveal));
  passwordInput.focus();
});
