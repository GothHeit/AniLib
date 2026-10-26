import { redirect } from "@/i18n/navigation";

// MAL's OAuth callback returns the browser to /profile?mal=<result>; the account page lives at /settings.
export default async function ProfileRedirect({ params, searchParams }: PageProps<"/[locale]/profile">) {
  const { locale } = await params;
  const { mal } = await searchParams;
  redirect({ href: { pathname: "/settings", query: typeof mal === "string" ? { mal } : {} }, locale });
}
