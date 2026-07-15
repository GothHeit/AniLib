import { malStatus, connectMal, disconnectMal, getAnimelist, removeFromList } from "../api/mal.js";
import { logout } from "../api/http.js";
import { initNsfwToggle } from "../ui/nsfw.js";

const STATUS_LABELS = {
  watching: "Assistindo",
  completed: "Completo",
  on_hold: "Em espera",
  dropped: "Abandonado",
  plan_to_watch: "Planejo assistir",
};

const GRUPOS = [
  { titulo: "Minha watchlist", status: ["watching", "plan_to_watch"] },
  { titulo: "Já assistidos", status: ["completed"] },
  { titulo: "Em espera / abandonados", status: ["on_hold", "dropped"] },
];

function nomeUsuario(token) {
  try {
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(payload)).sub;
  } catch {
    return "Usuário";
  }
}

export async function perfil() {
  const token = document.cookie
  .split("; ")
  .find(row => row.startsWith("token="))
  ?.split("=")[1];
  
  if (!token) {
    window.location.hash = "#login";
    return;
  }

  const app = document.getElementById("app");

  app.innerHTML = `
<header class="navbar">
  <div class="logo"><span class="logo-red">Ani</span>lib</div>
  <nav class="menu">
    <a href="#dashboard">Animes</a>
    <a href="#perfil">Perfil</a>
    <a id="logout">Logout</a>
  </nav>
</header>

<main id="conteudo">
  <section class="perfil">
    <h1>Olá, ${nomeUsuario(token)}</h1>
    <div id="mal-card" class="mal-card">Carregando...</div>
  </section>

  <div id="listas"></div>
</main>`;

  document.getElementById("logout").addEventListener("click", logout);
  //initNsfwToggle();

  const card = document.getElementById("mal-card");

  let status;
  try {
    status = await malStatus();
  } catch (err) {
    card.textContent = err.message;
    return;
  }

  if (!status.connected) {
    card.innerHTML = `
      <p>Conecte sua conta do MyAnimeList para ver e editar sua watchlist.</p>
      <button id="connect" class="mal-btn">Conectar MAL</button>`;
    document.getElementById("connect").addEventListener("click", () => connectMal());
    return;
  }

  const st = status.mal_statistics;
  const stats = st
    ? `
      <div class="mal-stats">
        <span><b>${st.num_items_completed ?? 0}</b> completos</span>
        <span><b>${st.num_episodes ?? 0}</b> episódios</span>
        <span><b>${st.num_days ?? 0}</b> dias</span>
      </div>`
    : "";

  card.innerHTML = `
    <div class="mal-profile">
      ${status.mal_picture ? `<img class="mal-avatar" src="${status.mal_picture}" alt="">` : ""}
      <div class="mal-profile-info">
        <p>Conectado como <strong>${status.mal_username || "conta MAL"}</strong></p>
        ${stats}
        <button id="disconnect" class="mal-btn ghost">Desconectar</button>
      </div>
    </div>`;
  document.getElementById("disconnect").addEventListener("click", async () => {
    await disconnectMal();
    perfil();
  });

  carregarListas();
}

function cardItem(item) {
  const node = item.node;
  const st = item.list_status?.status;
  const label = STATUS_LABELS[st] || st || "";
  const img = node.main_picture?.medium
    ? `<img src="${node.main_picture.medium}" alt="${node.title}">`
    : "";
  return `
    <div class="wl-card">
      <div class="wl-poster">
        <a href="#anime/${node.id}">${img}</a>
        ${label ? `<span class="wl-status">${label}</span>` : ""}
        <button class="wl-remove" data-id="${node.id}" title="Remover da lista" aria-label="Remover">✕</button>
      </div>
      <a href="#anime/${node.id}" class="wl-title">${node.title}</a>
    </div>`;
}

function confirmarRemocao(titulo) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <h3>Remover da lista?</h3>
        <p class="modal-msg"></p>
        <div class="modal-actions">
          <button class="mal-btn ghost" data-acao="cancelar">Cancelar</button>
          <button class="mal-btn" data-acao="confirmar">Remover</button>
        </div>
      </div>`;
    overlay.querySelector(".modal-msg").textContent =
      `"${titulo}" será removido da sua lista no MyAnimeList.`;
    document.body.appendChild(overlay);

    function fechar(resultado) {
      overlay.remove();
      document.removeEventListener("keydown", onKey);
      resolve(resultado);
    }
    function onKey(e) {
      if (e.key === "Escape") fechar(false);
    }

    overlay.addEventListener("click", (e) => {
      const acao = e.target.dataset.acao;
      if (e.target === overlay || acao === "cancelar") fechar(false);
      if (acao === "confirmar") fechar(true);
    });
    document.addEventListener("keydown", onKey);
    overlay.querySelector('[data-acao="cancelar"]').focus();
  });
}

async function carregarListas() {
  const container = document.getElementById("listas");

  let lista;
  try {
    lista = await getAnimelist();
  } catch (err) {
    container.innerHTML = `<p style="padding:0 2rem">${err.message}</p>`;
    return;
  }

  const itens = Array.isArray(lista.data) ? lista.data : [];
  if (itens.length === 0) {
    container.innerHTML = `<p style="padding:0 2rem">Sua lista está vazia.</p>`;
    return;
  }

  container.innerHTML = GRUPOS.map((grupo) => {
    const doGrupo = itens.filter((i) => grupo.status.includes(i.list_status?.status));
    if (doGrupo.length === 0) return "";
    return `
      <section class="watchlist">
        <h2>${grupo.titulo}</h2>
        <div class="animes">${doGrupo.map(cardItem).join("")}</div>
      </section>`;
  }).join("");

  container.querySelectorAll(".wl-remove").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const titulo =
        btn.closest(".wl-card")?.querySelector(".wl-title")?.textContent?.trim() ||
        "este anime";
      const ok = await confirmarRemocao(titulo);
      if (!ok) return;

      btn.disabled = true;
      try {
        await removeFromList(btn.dataset.id);
        carregarListas();
      } catch {
        btn.disabled = false;
      }
    });
  });
}
