import { API_URL } from '../config.js';

export function logout() {
  document.cookie = "token=; path=/; max-age=0";
  window.location.hash = "#login";
}

export async function authFetch(path, options = {}) {
   const token = document.cookie
  .split("; ")
  .find(row => row.startsWith("token="))
  ?.split("=")[1];

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 401) {
    logout();
    throw new Error("Sessão expirada");
  }

  return response;
}
