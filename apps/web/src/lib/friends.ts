import type { components } from "@app/api-client";

export type UserSummary = components["schemas"]["UserSummary"];
export type LookupOut = components["schemas"]["LookupOut"];
export type FriendOut = components["schemas"]["FriendOut"];
export type RequestsOut = components["schemas"]["RequestsOut"];
export type ActivityOut = components["schemas"]["ActivityOut"];
export type ProfileOut = components["schemas"]["ProfileOut"];

export const profileHref = (userId: string) => `/u/${userId}`;
