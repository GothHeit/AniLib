"use client";

import { createApiClient } from "@app/api-client";

// Browser calls go through the web server's proxy route, which adds the session token from the
// httpOnly cookie and refreshes it when needed. The browser never sees a token.
export const api = createApiClient("/api/proxy", () => null);
