import { API_URL } from '../config.js';
import { authFetch } from './http.js';

export async function getUsers() {
    const response = await authFetch("/users");
    if (!response.ok) throw new Error("Erro ao buscar usuários");
    return await response.json();
}

export async function login(username, password) {
    const response = await fetch(`${API_URL}/users/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ username, password })
    });

    if (!response.ok) throw new Error("Login invalido");
    return await response.json();
}

export async function cadastroapi(username, password) {
    const response = await fetch(`${API_URL}/users`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ username, password })
    });

    if (!response.ok) throw new Error("Cadastro invalido");
    return await response.json();
}
