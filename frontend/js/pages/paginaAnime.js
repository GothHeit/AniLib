import { searchId, searchAnimes, getEpisodes, getStream, streamProxyUrl } from "../api/animes.js";
import { logout } from "../api/http.js";
import { malStatus, updateList } from "../api/mal.js";
import { initNsfwToggle } from "../ui/nsfw.js";

const CHUNK = 100;

async function montarPlayer(animeId) {
  const info = document.querySelector(".anime-info");
  if (!info) return;

  const box = document.createElement("div");
  box.className = "player-box";
  box.innerHTML = `
    <h3>Assistir</h3>
    <video id="anime-player" controls playsinline></video>
    <p id="player-msg">Carregando episódios...</p>
    <div class="ep-controls" hidden>
      <label>Faixa: <select id="ep-range"></select></label>
      <label>Ir para: <input id="ep-jump" type="number" min="1" placeholder="ep"></label>
    </div>
    <div class="episodes-grid" id="episodes-grid"></div>`;
  info.appendChild(box);

  const player = box.querySelector("#anime-player");
  const msg = box.querySelector("#player-msg");
  const grid = box.querySelector("#episodes-grid");
  const controls = box.querySelector(".ep-controls");
  const rangeSel = box.querySelector("#ep-range");
  const jump = box.querySelector("#ep-jump");

  let episodes = [];
  try {
    const data = await getEpisodes(animeId);
    episodes = data.episodes || [];
  } catch {
    msg.textContent = "Não foi possível carregar os episódios (provedor indisponível).";
    return;
  }
  if (!episodes.length) {
    msg.textContent = "Nenhum episódio disponível neste provedor.";
    return;
  }
  msg.textContent = "";

  async function tocar(ep) {
    grid.querySelectorAll(".ep-btn").forEach((b) =>
      b.classList.toggle("ativo", Number(b.dataset.ep) === ep)
    );
    msg.textContent = `Carregando episódio ${ep}...`;
    try {
      const stream = await getStream(animeId, ep);
      if (stream.type === "hls") {
        msg.textContent = "Este episódio é HLS (.m3u8) — ainda não suportado no player.";
        return;
      }
      player.src = streamProxyUrl(animeId, ep);
      player.play().catch(() => {});
      msg.textContent = `Episódio ${ep} · ${stream.resolution}p`;
    } catch (err) {
      msg.textContent = err.message;
    }
  }

  function renderFaixa(start) {
    const slice = episodes.slice(start, start + CHUNK);
    grid.innerHTML = slice
      .map((ep) => `<button class="ep-btn" data-ep="${ep}">${ep}</button>`)
      .join("");
    grid.querySelectorAll(".ep-btn").forEach((btn) =>
      btn.addEventListener("click", () => tocar(Number(btn.dataset.ep)))
    );
  }

  if (episodes.length > CHUNK) {
    controls.hidden = false;
    for (let i = 0; i < episodes.length; i += CHUNK) {
      const fim = Math.min(i + CHUNK, episodes.length) - 1;
      const opt = document.createElement("option");
      opt.value = i;
      opt.textContent = `${episodes[i]} – ${episodes[fim]}`;
      rangeSel.appendChild(opt);
    }
    rangeSel.addEventListener("change", () => renderFaixa(Number(rangeSel.value)));
    jump.max = episodes[episodes.length - 1];
    jump.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      const n = Number(jump.value);
      const idx = episodes.indexOf(n);
      if (idx === -1) {
        msg.textContent = `Episódio ${n} não disponível.`;
        return;
      }
      const start = Math.floor(idx / CHUNK) * CHUNK;
      rangeSel.value = start;
      renderFaixa(start);
      tocar(n);
    });
  }

  renderFaixa(0);
}

const STATUS_OPTIONS = [
  ["watching", "Assistindo"],
  ["completed", "Completo"],
  ["on_hold", "Em espera"],
  ["dropped", "Abandonado"],
  ["plan_to_watch", "Planejo assistir"],
];

async function montarWatchlist(animeId) {
  const logado = document.cookie
  .split("; ")
  .find(row => row.startsWith("token="))
  ?.split("=")[1];

  if (!logado) return;

  let conectado = false;
  try {
    conectado = (await malStatus()).connected;
  } catch {
    return;
  }
  if (!conectado) return;

  const info = document.querySelector(".anime-info");
  if (!info) return;

  const box = document.createElement("div");
  box.className = "watchlist-box";
  box.innerHTML = `
    <h3>Adicionar à lista</h3>
    <select id="wl-status">
      ${STATUS_OPTIONS.map(([v, l]) => `<option value="${v}">${l}</option>`).join("")}
    </select>
    <input id="wl-score" type="number" min="0" max="10" placeholder="Nota">
    <input id="wl-eps" type="number" min="0" placeholder="Episódios">
    <button id="wl-save" class="mal-btn">Salvar</button>
    <span id="wl-msg"></span>`;
  info.appendChild(box);

  document.getElementById("wl-save").addEventListener("click", async () => {
    const msg = document.getElementById("wl-msg");
    const body = { status: document.getElementById("wl-status").value };
    const score = document.getElementById("wl-score").value;
    const eps = document.getElementById("wl-eps").value;
    if (score) body.score = Number(score);
    if (eps) body.num_watched_episodes = Number(eps);

    try {
      await updateList(animeId, body);
      msg.textContent = "Salvo!";
    } catch (err) {
      msg.textContent = err.message;
    }
  });
}
export async function paginaAnime(animeId) {
   const logado = document.cookie
  .split("; ")
  .find(row => row.startsWith("token="))
  ?.split("=")[1];
  
  const app = document.getElementById("app");
  let anime = {};
  try {
    anime = await searchId(animeId)
  } catch (error) {
    console.log(error)
  }

  console.log(anime);

  app.innerHTML = `
<header class="navbar">
  <div class="logo">
    <span class="logo-red">Ani</span>lib
  </div>

  <nav class="menu">
    <a href="#animes" >Animes</a>
    ${logado ? `<a href="#perfil">Perfil</a>` : ""}
    ${!logado ? `<a href="#login" id="login">Login</a>` : ""}
    ${!logado ? `<a href="#cadastro">Cadastro</a>` : ""}
    ${logado ? `<a id="logout">Logout</a>` : ""}
  </nav>

  <div class="search">
    <input id="search" type="text" placeholder="Search...">
    <div id="results"></div>
  </div>
</header>`;

 // initNsfwToggle();

  const loginBtn = document.getElementById("login");
  if (loginBtn) {
    loginBtn.addEventListener("click", () => {
      window.location.hash = "#login";
    });
  }

  const logoutBtn = document.getElementById("logout");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", logout);
  }
  const pesquisa = document.getElementById("search");
  const resultados = document.getElementById("results");
  let buscaTimer;
  let buscaSeq = 0;
  pesquisa.addEventListener("input", () => {
    clearTimeout(buscaTimer);
    const termo = pesquisa.value;
    if (termo.length <= 2) {
      resultados.innerHTML = "";
      return;
    }
    buscaTimer = setTimeout(async () => {
      const seq = ++buscaSeq;
      try {
        const data = await searchAnimes(termo);
        if (seq !== buscaSeq) return;
        resultados.innerHTML = data
          .map(
            (anime) => `
            <a href="#anime/${anime.node.id}" class="anime-link">
              <div class="anime-item">
                ${anime.node.main_picture?.medium ? `<img src="${anime.node.main_picture.medium}">` : ""}
                <h3>${anime.node.title}</h3>
              </div>
              </a>
            `,
          )
          .join("");
      } catch (err) {
        if (seq === buscaSeq) resultados.innerHTML = "";
      }
    }, 300);
  });
  
  const content = document.createElement("content");
  content.innerHTML = `
  <main id="conteudo">

  <div class="anime-page">

    <div class="anime-banner">
      ${
        anime.pictures?.map(
          (picture) => `
            <img src="${picture.large}">
          `
        ).join("") || ""
      }
    </div>

    <div class="anime-content">

      <div class="anime-poster">
        <img 
          src="${anime.pictures?.[0]?.large || anime.main_picture?.large}" 
          alt="${anime.title}"
        >
      </div>

      <div class="anime-info">

        <h1>${anime.title}</h1>

        <div class="anime-meta">
          <span><span class="meta-label">Nota</span> ${anime.mean || "N/A"}</span>
          <span><span class="meta-label">Rank</span> #${anime.rank || "N/A"}</span>
          <span><span class="meta-label">Popularidade</span> #${anime.popularity || "N/A"}</span>
          <span><span class="meta-label">Status</span> ${anime.status || "Unknown"}</span>
        </div>

        <div class="genres">
          ${
            anime.genres?.map(
              g => `
                <span class="genre">${g.name}</span>
              `
            ).join("") || ""
          }
        </div>

        <p class="synopsis">
          ${anime.synopsis || "No synopsis available"}
        </p>

        <div class="details">

          <div class="detail-card">
            <h3>Japanese</h3>
            <p>${anime.alternative_titles?.ja || "Unknown"}</p>
          </div>

          <div class="detail-card">
            <h3>English</h3>
            <p>${anime.alternative_titles?.en || "Unknown"}</p>
          </div>

          <div class="detail-card">
            <h3>Source</h3>
            <p>${anime.source || "Unknown"}</p>
          </div>

          <div class="detail-card">
            <h3>Episodes</h3>
            <p>${anime.num_episodes || "Airing"}</p>
          </div>

          <div class="detail-card">
            <h3>Season</h3>
            <p>
              ${anime.start_season?.season || "Unknown"} 
              ${anime.start_season?.year || ""}
            </p>
          </div>

          <div class="detail-card">
            <h3>Broadcast</h3>
            <p>
              ${anime.broadcast?.day_of_the_week || "Unknown"} 
              ${anime.broadcast?.start_time || ""}
            </p>
          </div>

        </div>

      </div>

    </div>

  </div>

</main>
  `;
  app.appendChild(content);

  montarPlayer(animeId);
  montarWatchlist(animeId);
}
