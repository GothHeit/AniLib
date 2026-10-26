import { createApiClient } from "@app/api-client";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { redirect } from "@/i18n/navigation";

import { API_URL } from "./config";
import { ACCESS_COOKIE } from "./cookies";
import { toApiError } from "./errors";

/** API client for server components, authenticated with the session cookie. */
export async function serverApi() {
  const access = (await cookies()).get(ACCESS_COOKIE)?.value ?? null;
  return createApiClient(API_URL, () => access);
}

type Result<T> = { data?: T; error?: unknown; response: Response };

/**
 * Unwraps an API result. 404 shows the not-found page, 401 sends the user to sign in and any
 * other failure throws an ApiError for the nearest error boundary.
 */
export async function unwrap<T>(result: Promise<Result<T>>, locale: string): Promise<T> {
  const { data, error, response } = await result;
  if (data !== undefined) return data;
  if (response.status === 404) notFound();
  if (response.status === 401) redirect({ href: "/login", locale });
  throw toApiError(response.status, error);
}
