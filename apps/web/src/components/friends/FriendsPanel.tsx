"use client";

import { errorCode } from "@app/api-client";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";

import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { Link, useRouter } from "@/i18n/navigation";
import { api } from "@/lib/api";
import { profileHref, type FriendOut, type LookupOut, type RequestsOut, type UserSummary } from "@/lib/friends";

type Props = { friends: FriendOut[]; requests: RequestsOut };

function Person({ user, children }: { user: UserSummary; children?: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 rounded-ui border border-line bg-surface p-3">
      <Avatar userId={user.id} username={user.username} avatar={user.avatar} size={40} />
      <span className="min-w-0 flex-1 truncate font-medium">{user.username}</span>
      {children}
    </li>
  );
}

export function FriendsPanel({ friends, requests }: Props) {
  const t = useTranslations("friends");
  const tErr = useTranslations("errors");
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState("");
  const [found, setFound] = useState<LookupOut | null>(null);
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState<UserSummary | null>(null);

  function fail(error: unknown) {
    const code = errorCode(error);
    toast(tErr.has(code) ? tErr(code) : t("actionFailed"), "error");
  }

  async function run(work: () => Promise<{ ok: boolean; error?: unknown }>, done?: () => void) {
    setBusy(true);
    try {
      const result = await work();
      if (!result.ok) return fail(result.error);
      done?.();
      router.refresh();
    } catch {
      toast(t("actionFailed"), "error");
    } finally {
      setBusy(false);
    }
  }

  async function find(e: FormEvent) {
    e.preventDefault();
    const username = name.trim();
    if (!username) return;
    setBusy(true);
    setFound(null);
    try {
      const { data, error } = await api.GET("/users/lookup", { params: { query: { username } } });
      if (data) setFound(data);
      else fail(error);
    } catch {
      toast(t("actionFailed"), "error");
    } finally {
      setBusy(false);
    }
  }

  const send = (user: UserSummary) => {
    let accepted = false;
    return run(
      async () => {
        const { data, error } = await api.POST("/friends/requests", { body: { username: user.username } });
        accepted = data?.relation === "friends";
        return { ok: !!data, error };
      },
      () => {
        toast(accepted ? t("acceptedToast", { name: user.username }) : t("sentToast", { name: user.username }), "success");
        setFound(null);
        setName("");
      },
    );
  };

  const accept = (user: UserSummary) =>
    run(
      async () => {
        const { data, error } = await api.POST("/friends/requests/{user_id}/accept", { params: { path: { user_id: user.id } } });
        return { ok: !!data, error };
      },
      () => toast(t("acceptedToast", { name: user.username }), "success"),
    );

  const dropRequest = (user: UserSummary) =>
    run(async () => {
      const { response, error } = await api.DELETE("/friends/requests/{user_id}", { params: { path: { user_id: user.id } } });
      return { ok: response.ok, error };
    });

  const unfriend = (user: UserSummary) =>
    run(
      async () => {
        const { response, error } = await api.DELETE("/friends/{user_id}", { params: { path: { user_id: user.id } } });
        return { ok: response.ok, error };
      },
      () => setRemoving(null),
    );

  const relationNote = found && found.relation !== "none" ? t(`relation${found.relation[0].toUpperCase()}${found.relation.slice(1)}` as "relationSelf") : null;
  // An incoming request can still be answered by asking back, which accepts it.
  const canSend = found && (found.relation === "none" || found.relation === "incoming");

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <form onSubmit={find} className="flex flex-wrap items-end gap-3">
          <label className="flex w-full flex-col gap-1 sm:w-auto">
            <span className="text-sm text-muted">{t("addLabel")}</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={32}
              autoComplete="off"
              autoCapitalize="none"
              placeholder={t("addPlaceholder")}
              className="w-full rounded-ui border border-line bg-bg px-3 py-2 text-fg sm:w-64"
            />
          </label>
          <Button type="submit" variant="secondary" disabled={busy || !name.trim()}>
            {busy ? t("finding") : t("find")}
          </Button>
        </form>
        {found && (
          <ul>
            <Person user={found.user}>
              {relationNote && <span className="text-sm text-muted">{relationNote}</span>}
              {canSend && (
                <Button onClick={() => send(found.user)} disabled={busy}>
                  {busy ? t("sending") : t("send")}
                </Button>
              )}
            </Person>
          </ul>
        )}
      </section>

      {requests.incoming.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">{t("incoming")}</h2>
          <ul className="flex flex-col gap-2">
            {requests.incoming.map(({ user }) => (
              <Person key={user.id} user={user}>
                <Button onClick={() => accept(user)} disabled={busy}>
                  {t("accept")}
                </Button>
                <Button variant="ghost" onClick={() => dropRequest(user)} disabled={busy}>
                  {t("decline")}
                </Button>
              </Person>
            ))}
          </ul>
        </section>
      )}

      {requests.outgoing.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">{t("outgoing")}</h2>
          <ul className="flex flex-col gap-2">
            {requests.outgoing.map(({ user }) => (
              <Person key={user.id} user={user}>
                <Button variant="ghost" onClick={() => dropRequest(user)} disabled={busy}>
                  {t("cancel")}
                </Button>
              </Person>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">{t("list")}</h2>
        {friends.length === 0 ? (
          <p className="text-muted">{t("emptyList")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {friends.map(({ user }) => (
              <Person key={user.id} user={user}>
                <Link href={profileHref(user.id)} aria-label={t("viewProfile", { name: user.username })} className="rounded-ui px-3 py-2 text-sm text-accent hover:bg-line">
                  {t("viewProfile", { name: user.username })}
                </Link>
                <Button variant="ghost" onClick={() => setRemoving(user)} disabled={busy}>
                  {t("remove")}
                </Button>
              </Person>
            ))}
          </ul>
        )}
      </section>

      <Modal open={removing !== null} onClose={() => setRemoving(null)} title={t("removeTitle", { name: removing?.username ?? "" })}>
        <p className="mb-4 text-muted">{t("removeBody")}</p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setRemoving(null)}>
            {t("back")}
          </Button>
          <Button onClick={() => removing && unfriend(removing)} disabled={busy}>
            {t("removeConfirm")}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
