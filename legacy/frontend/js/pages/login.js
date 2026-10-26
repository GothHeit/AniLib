import { login } from "../api/users.js";

export function loginPage() {
  const app = document.getElementById("app");

  app.innerHTML = `
  <form id="login" class="login">
    <h1>Login</h1>
    <input type="text" id="username" placeholder="Username">
    <input type="password" id="password" placeholder="Password">
    <button type="submit">Entrar</button>
    <p id="alerta"></p>
  </form>
`;

  const form = document.getElementById("login");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    const alerta = document.getElementById("alerta");
    try {
      const data = await login(username, password);
      document.cookie = `token=${data.access_token}; path=/; max-age=86400`;
      alert("login feito.");
      window.location.hash = "#dashboard";
    } catch (err) {
      alerta.textContent = err.message;
    }
  });
}
