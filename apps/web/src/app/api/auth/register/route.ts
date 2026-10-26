import { tokenRoute } from "@/lib/auth-route";

export const POST = (request: Request) => tokenRoute("/auth/register", request);
