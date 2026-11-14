"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Notification = {
  id: string;
  type: string;
  payload: { title?: string; body?: string; href?: string };
  read_at: string | null;
  created_at: string;
};

const when = (iso: string) => {
  const mins = Math.round((Date.now() - +new Date(iso)) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

export default function NotificationBell({
  userId,
  onOpenConversation,
  onNeedLogin,
}: {
  userId: string | null;
  onOpenConversation: (conversationId: string) => void;
  onNeedLogin: () => void;
}) {
  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("notifications")
      .select("id,type,payload,read_at,created_at")
      .order("created_at", { ascending: false })
      .limit(30);
    setItems((data ?? []) as Notification[]);
  }, [userId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await load();
      if (cancelled) return;
    })();
    if (!userId) return;
    // Notifications are written by a database trigger whenever a message arrives,
    // so reloading on new messages keeps the badge current.
    const channel = supabase
      .channel(`notify:${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => load())
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [userId, load]);

  // Signed-out visitors never see another account's notifications.
  const visible = userId ? items : [];
  const unread = visible.filter((n) => !n.read_at).length;

  async function openPanel() {
    if (!userId) return onNeedLogin();
    const next = !open;
    setOpen(next);
    if (next) await load();
  }

  async function markAllRead() {
    if (!userId) return;
    const now = new Date().toISOString();
    setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? now })));
    await supabase.from("notifications").update({ read_at: now }).eq("user_id", userId).is("read_at", null);
  }

  async function activate(n: Notification) {
    if (!n.read_at) {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)));
      await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", n.id);
    }
    const match = /^\/messages\/([0-9a-f-]{36})$/i.exec(n.payload.href ?? "");
    if (match) {
      setOpen(false);
      onOpenConversation(match[1]);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={openPanel}
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-brand hover:bg-mist"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-accent px-1 text-[10px] font-bold leading-4 text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="card absolute right-0 z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
              <p className="text-sm font-bold text-brand">Notifications</p>
              {unread > 0 && (
                <button onClick={markAllRead} className="text-xs font-semibold text-accent">Mark all read</button>
              )}
            </div>
            <div className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
              {visible.length === 0 ? (
                <p className="p-6 text-center text-sm text-ink">
                  Nothing yet. You&apos;ll be notified here when someone messages you about a listing.
                </p>
              ) : (
                visible.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => activate(n)}
                    className={`block w-full px-3 py-2.5 text-left hover:bg-mist ${n.read_at ? "" : "bg-mist/60"}`}
                  >
                    <p className="truncate text-sm font-semibold text-brand">{n.payload.title ?? n.type}</p>
                    {n.payload.body && <p className="truncate text-xs text-ink">{n.payload.body}</p>}
                    <p className="mt-0.5 text-[11px] text-ink/70">{when(n.created_at)}</p>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
