const form = document.getElementById("adminLoginForm");
const password = document.getElementById("adminPassword");
const message = document.getElementById("adminLoginMessage");

async function checkLogin() {
  const response = await fetch("/api/auth/status", { cache: "no-store" });
  const data = await response.json();
  if (data.authenticated) location.href = "/admin";
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  message.textContent = "正在验证...";
  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: password.value })
    });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.message || "登录失败。");
    location.href = "/admin";
  } catch (error) {
    message.textContent = error.message;
    password.select();
  }
});

checkLogin();
