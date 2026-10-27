import { getTranslations } from "next-intl/server";

import { PosterCard } from "@/components/ui/PosterCard";
import { Row } from "@/components/ui/Row";
import { animeHref, posterOf } from "@/lib/catalog";
import type { ActivityOut } from "@/lib/friends";

/** What friends finished lately. Renders nothing when there is none. */
export async function FriendsActivity({ items }: { items: ActivityOut[] }) {
  if (items.length === 0) return null;
  const t = await getTranslations("friends");
  return (
    <div className="pb-6">
      <Row title={t("activity")}>
        {items.map(({ user, anime, episode }) => (
          <PosterCard
            key={`${user.id}-${anime.id}`}
            href={animeHref(anime.id)}
            title={anime.title}
            image={posterOf(anime)}
            caption={t("activityLine", { name: user.username, n: episode })}
          />
        ))}
      </Row>
    </div>
  );
}
