import { nsfwEnabled, setNsfwEnabled } from "../config.js";

export function initNsfwToggle() {
    const navbar = document.querySelector(".navbar");
    if (!navbar || navbar.querySelector(".nsfw-toggle")) return;

    const label = document.createElement("label");
    label.className = "nsfw-toggle";
    label.title = "Mostrar conteúdo adulto (NSFW)";
    label.innerHTML = `
        <span>NSFW</span>
        <input type="checkbox" ${nsfwEnabled() ? "checked" : ""}>
        <span class="switch"></span>`;

    const search = navbar.querySelector(".search");
    if (search) {
        const group = document.createElement("div");
        group.className = "nav-right";
        navbar.insertBefore(group, search);
        group.appendChild(label);
        group.appendChild(search);
    } else {
        navbar.appendChild(label);
    }

    label.querySelector("input").addEventListener("change", (e) => {
        setNsfwEnabled(e.target.checked);
        window.dispatchEvent(new Event("hashchange"));
    });
}
