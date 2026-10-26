import { cadastroapi } from "../api/users.js";

export function cadastro() {
  const app = document.getElementById("app");

  app.innerHTML = `
  <form id="cadastro" class="cadastro">
    <h1>Cadastro</h1>
    <input type="text" id="username" placeholder="Username">
    <input type="password" id="password" placeholder="Password">
    <input type="password" id="passwordReply" placeholder="Confirmar Password">
    <button type="submit" id="btn">Cadastrar</button>
    <p id="alerta"></p>
  </form>
`;

  const form = document.getElementById("cadastro");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("username").value;
    const alerta = document.getElementById("alerta");
    const password1 = document.getElementById("password").value;
    const password2 = document.getElementById("passwordReply").value;

    if (password1 !== password2) {
      alerta.textContent = "Senhas diferentes";
      return;
    }

    try {
      await cadastroapi(username, password2);
      alert("Cadastro feito.");
      window.location.hash = "#dashboard";
    } catch (err) {
      alerta.textContent = err.message;
    }
  });
}
