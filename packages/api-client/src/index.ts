import createClient, { type Middleware } from "openapi-fetch";

import type { components, paths } from "./schema";

export type { components, paths };
export type Tokens = components["schemas"]["TokensOut"];
export type Me = components["schemas"]["MeOut"];

/** Error body every API error uses. `code` is what translations key on. */
export type ApiErrorBody = { error: { code: string; message: string } };

export function createApiClient(baseUrl: string, getAccessToken: () => string | null) {
  const client = createClient<paths>({ baseUrl });
  const auth: Middleware = {
    onRequest({ request }) {
      const token = getAccessToken();
      if (token) request.headers.set("Authorization", `Bearer ${token}`);
      return request;
    },
  };
  client.use(auth);
  return client;
}

export function errorCode(error: unknown): string {
  const code = (error as ApiErrorBody | undefined)?.error?.code;
  return typeof code === "string" ? code : "unknown";
}
