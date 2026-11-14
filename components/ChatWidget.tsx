"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Message } from "@/lib/data";

type Conversation = { id: string; otherName: string; title: string; last: string; lastAt: string; unread: number };

const time = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

export default function ChatWidget({
  userId,
  open,
  setOpen,
  activeId,
  setActiveId,
  onNeedLogin,
}: {
  userId: string | null;
  open: boolean;
  setOpen: (v: boolean) => void;
  activeId: string | null;
  setActiveId: (id: string | null) => void;
  onNeedLogin: () => void;
}) {
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const bottom = useRef<HTMLDivElement>(null);
  const activeRef = useRef<string | null>(null);
  const openRef = useRef(false);

  useEffect(() => {
    activeRef.current = activeId;
    openRef.current = open;
  }, [activeId, open]);

  const loadConvs = useCallback(async () => {
    if (!userId) return setConvs([]);
    const { data: rows } = await supabase.from("conversations").select("id,buyer_id,seller_id,created_at,products(title)");
    const list = rows ?? [];
    if (list.length === 0) return setConvs([]);
    const others = [...new Set(list.map((c) => (c.buyer_id === userId ? c.seller_id : c.buyer_id)))];
    const [{ data: people }, { data: recent }] = await Promise.all([
      supabase.from("profiles").select("id,full_name").in("id", others),
      supabase
        .from("messages")
        .select("conversation_id,sender_id,message_text,created_at,read_at")
        .in("conversation_id", list.map((c) => c.id))
        .order("created_at", { ascending: false })
        .limit(400),
    ]);
    const names = new Map((people ?? []).map((p) => [p.id, p.full_name as string]));
    const out: Conversation[] = list.map((c) => {
      const mine = (recent ?? []).filter((m) => m.conversation_id === c.id);
      const prod = (Array.isArray(c.products) ? c.products[0] : c.products) as { title?: string } | null;
      return {
        id: c.id,
        otherName: names.get(c.buyer_id === userId ? c.seller_id : c.buyer_id) || "Student",
        title: prod?.title ?? "Listing",
        last: mine[0]?.message_text ?? "No messages yet",
        lastAt: mine[0]?.created_at ?? c.created_at,
        unread: mine.filter((m) => !m.read_at && m.sender_id !== userId).length,
      };
    });
    out.sort((a, b) => +new Date(b.lastAt) - +new Date(a.lastAt));
    setConvs(out);
  }, [userId]);

  // Conversation list + live updates for every conversation this user is part of (RLS limits what arrives).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await loadConvs();
      if (cancelled) return;
    })();
    if (!userId) return;
    const channel = supabase
      .channel(`inbox:${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const m = payload.new as Message;
        if (m.conversation_id === activeRef.current && openRef.current) {
          setMsgs((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
          if (m.sender_id !== userId) supabase.rpc("mark_read", { p_conversation_id: m.conversation_id }).then(() => loadConvs());
        } else {
          loadConvs();
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, (payload) => {
        const m = payload.new as Message;
        setMsgs((prev) => prev.map((x) => (x.id === m.id ? m : x)));
      })
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [userId, loadConvs]);

  // Load the open thread.
  useEffect(() => {
    if (!userId || !activeId || !open) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("messages").select("*").eq("conversation_id", activeId).order("created_at").limit(300);
      if (cancelled) return;
      setMsgs((data ?? []) as Message[]);
      await supabase.rpc("mark_read", { p_conversation_id: activeId });
      await loadConvs();
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, activeId, open, loadConvs]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs.length, activeId, open]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || !userId || !activeId) return;
    setText("");
    setError("");
    const { data, error: err } = await supabase
      .from("messages")
      .insert({ conversation_id: activeId, sender_id: userId, message_text: body })
      .select()
      .single();
    if (err) {
      setError("Message not sent. Try again.");
      setText(body);
    } else if (data) {
      setMsgs((prev) => (prev.some((x) => x.id === data.id) ? prev : [...prev, data as Message]));
      loadConvs();
    }
  }

  const unread = convs.reduce((s, c) => s + c.unread, 0);
  const active = convs.find((c) => c.id === activeId);

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-3">
      {open && (
        <div className="card flex h-[30rem] max-h-[75vh] w-[22rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden shadow-xl">
          <div className="flex items-center gap-2 bg-brand px-3 py-2.5 text-white">
            {activeId && (
              <button onClick={() => { setActiveId(null); setMsgs([]); }} aria-label="Back to conversations" className="rounded px-1 text-lg hover:bg-white/10">‹</button>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{active ? active.otherName : "Messages"}</p>
              {active && <p className="truncate text-xs text-white/75">{active.title}</p>}
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close messages" className="rounded px-1.5 text-lg hover:bg-white/10">×</button>
          </div>

          {!userId ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center text-sm text-ink">
              <p>Log in to message buyers and sellers.</p>
              <button onClick={onNeedLogin} className="btn btn-primary">Log in</button>
            </div>
          ) : !activeId ? (
            <div className="flex-1 divide-y divide-slate-100 overflow-y-auto">
              {convs.length === 0 && <p className="p-6 text-center text-sm text-ink">No conversations yet. Tap “Message seller” or “Buy” on any listing to start one.</p>}
              {convs.map((c) => (
                <button key={c.id} onClick={() => setActiveId(c.id)} className="flex w-full items-center gap-2 p-3 text-left hover:bg-mist">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-brand">{c.otherName} <span className="font-normal text-ink">· {c.title}</span></p>
                    <p className={`truncate text-xs ${c.unread ? "font-semibold text-slate-900" : "text-ink"}`}>{c.last}</p>
                  </div>
                  {c.unread > 0 && <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-white">{c.unread}</span>}
                </button>
              ))}
            </div>
          ) : (
            <>
              <div className="flex-1 space-y-2 overflow-y-auto bg-surface p-3">
                {msgs.map((m) => {
                  const mine = m.sender_id === userId;
                  return (
                    <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] rounded-2xl px-3 py-1.5 text-sm ${mine ? "bg-brand text-white" : "bg-white text-slate-900"}`}>
                        <p className="whitespace-pre-wrap break-words">{m.message_text}</p>
                        <p className={`text-[10px] ${mine ? "text-white/70" : "text-ink/70"}`}>
                          {time(m.created_at)}{mine ? (m.read_at ? " · Read" : " · Sent") : ""}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottom} />
              </div>
              {error && <p className="px-3 pt-1 text-xs text-red-600">{error}</p>}
              <form onSubmit={send} className="flex gap-2 border-t border-slate-200 p-2">
                <input value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} placeholder="Type a message…" className="input" aria-label="Message" />
                <button className="btn btn-accent">Send</button>
              </form>
            </>
          )}
        </div>
      )}
      <button onClick={() => setOpen(!open)} aria-label="Messages" className="relative flex h-14 w-14 items-center justify-center rounded-full bg-brand text-white shadow-lg hover:bg-brand-dark">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />
        </svg>
        {unread > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-accent px-1.5 py-0.5 text-xs font-bold">{unread}</span>}
      </button>
    </div>
  );
}
