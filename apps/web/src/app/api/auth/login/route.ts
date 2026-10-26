import { tokenRoute } from "@/lib/auth-route";

export const POST = (request: Request) => tokenRoute("/auth/login", request);
