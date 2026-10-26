import { authFetch } from "./http.js";
import { nsfwEnabled } from "../config.js";

export async function malStatus() {
  const response = await authFetch("/me/mal");
  if (!response.ok) throw new Error("Erro ao verificar conexão");
  return response.json();
}

export async function connectMal() {
  const response = await authFetch("/auth/mal/start");
  if (!response.ok) throw new Error("Erro ao iniciar conexão");
  const { auth_url } = await response.json();
  window.location.href = auth_url;
}

export async function disconnectMal() {
  const response = await authFetch("/me/mal", { method: "DELETE" });
  if (!response.ok) throw new Error("Erro ao desconectar");
  return response.json();
}

export async function getAnimelist(status) {
  const params = new URLSearchParams({ nsfw: nsfwEnabled() });
  if (status) params.set("status", status);
  const response = await authFetch(`/me/animelist?${params}`);
  if (!response.ok) throw new Error("Erro ao buscar a lista");
  return response.json();
}

export async function updateList(animeId, body) {
  const response = await authFetch(`/me/animelist/${animeId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error("Erro ao atualizar a lista");
  return response.json();
}

export async function removeFromList(animeId) {
  const response = await authFetch(`/me/animelist/${animeId}`, { method: "DELETE" });
  if (!response.ok) throw new Error("Erro ao remover");
  return response.json();
}
