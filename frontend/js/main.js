import { loginPage } from "./pages/login.js";
import { paginaPrincipal } from "./pages/dashboard.js";
import { cadastro } from "./pages/cadastro.js";
import { paginaAnime } from "./pages/paginaAnime.js";
import { perfil } from "./pages/perfil.js";
function router() {
  const path = window.location.hash;

  if (path === "#login") {
    loginPage();
  } else if (path === "#dashboard") {
    paginaPrincipal();
  } else if (path === "#cadastro") {
    cadastro();
  } else if (path === "#perfil") {
    perfil();
  } else if (path.startsWith("#anime/")) {
    const animeId = path.split("/")[1]; 
    paginaAnime(animeId);
  } else {
    paginaPrincipal();
  }
}

router();

window.addEventListener("hashchange", router);
