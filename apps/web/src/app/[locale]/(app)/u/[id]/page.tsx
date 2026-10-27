import { notFound } from "next/navigation";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";

import { Avatar } from "@/components/ui/Avatar";
import { ButtonLink } from "@/components/ui/Button";
import { PosterCard } from "@/components/ui/PosterCard";
import { Row } from "@/components/ui/Row";
import { animeHref, posterOf } from "@/lib/catalog";
import { serverApi, unwrap } from "@/lib/server-api";

export default async function ProfilePage({ params }: PageProps<"/[locale]/u/[id]">) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("profile");
  const format = await getFormatter();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) notFound();
  const api = await serverApi();

  // Anyone who isn't a friend gets a 403: say so, rather than showing an error page.
  const result = await api.GET("/users/{user_id}/profile", { params: { path: { user_id: id } } });
  if (result.response.status === 403) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-start gap-4 px-4 pb-8 pt-24 sm:px-8">
        <h1 className="text-3xl font-bold">{t("locked")}</h1>
        <p className="text-muted">{t("lockedHint")}</p>
        <ButtonLink href="/friends">{t("toFriends")}</ButtonLink>
      </div>
    );
  }
  const profile = await unwrap(Promise.resolve(result), locale);
  const { user } = profile;
  const date = (iso: string) => format.dateTime(new Date(iso), { dateStyle: "medium" });
  const shared = profile.stats && profile.watching && profile.recent;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 pb-8 pt-24 sm:px-8">
      <header className="flex flex-wrap items-center gap-5">
        <Avatar userId={user.id} username={user.username} avatar={user.avatar} size={96} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-3xl font-bold">{user.username}</h1>
          <p className="text-sm text-muted">
            {t("joined", { date: date(profile.joined_at) })}
            {profile.friends_since && ` · ${t("friendsSince", { date: date(profile.friends_since) })}`}
          </p>
        </div>
        {profile.relation === "self" && (
          <ButtonLink href="/settings" variant="secondary">
            {t("edit")}
          </ButtonLink>
        )}
      </header>

      {!shared ? (
        <p className="text-muted">{profile.relation === "self" ? t("ownPrivate") : t("private", { name: user.username })}</p>
      ) : (
        <>
          {profile.relation === "self" && !profile.activity_shared && <p className="text-muted">{t("ownPrivate")}</p>}
          <dl className="grid grid-cols-3 gap-3">
            {(["titles", "episodes", "friends"] as const).map((key) => (
              <div key={key} className="rounded-ui border border-line bg-surface p-4">
                <dd className="text-2xl font-bold">{format.number(profile.stats![key])}</dd>
                <dt className="text-sm text-muted">{t(`stats.${key}`)}</dt>
              </div>
            ))}
          </dl>
          {profile.watching!.length > 0 && (
            <Row title={t("watching")}>
              {profile.watching!.map(({ anime, episode }) => (
                <PosterCard key={anime.id} href={animeHref(anime.id)} title={anime.title} image={posterOf(anime)} caption={t("episode", { n: episode })} />
              ))}
            </Row>
          )}
          {profile.recent!.length > 0 && (
            <Row title={t("recent")}>
              {profile.recent!.map(({ anime, episode }) => (
                <PosterCard key={anime.id} href={animeHref(anime.id)} title={anime.title} image={posterOf(anime)} caption={t("finished", { n: episode })} />
              ))}
            </Row>
          )}
          {profile.watching!.length === 0 && profile.recent!.length === 0 && <p className="text-muted">{t("emptyWatching")}</p>}
        </>
      )}
    </div>
  );
}
