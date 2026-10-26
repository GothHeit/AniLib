import { errorCode } from "@app/api-client";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(code);
  }
}

export function toApiError(status: number, body: unknown): ApiError {
  return new ApiError(status, errorCode(body));
}
