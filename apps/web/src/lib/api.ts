"use client";

import { createApiClient, type Tokens } from "@app/api-client";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const STORAGE_KEY = "auth";

// Phase 0 keeps tokens in localStorage. Phase 1 moves the refresh token to an
// httpOnly cookie set by the web server.
export function saveTokens(tokens: Tokens) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
}

export function loadTokens(): Tokens | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Tokens) : null;
  } catch {
    return null;
  }
}

export function clearTokens() {
  localStorage.removeItem(STORAGE_KEY);
}

export const api = createApiClient(API_URL, () => loadTokens()?.access_token ?? null);
