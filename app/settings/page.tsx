"use client";

import Link from "next/link";
import { useSyncExternalStore, type FormEvent } from "react";

type Role = "student" | "administrator" | "signed-out";
type Message = { id: string; author: string; body: string };
type Thread = { id: string; subject: string; messages: Message[] };
type Settings = { role: Role; name: string; campus: string; threads: Thread[] };

const KEY = "dormcycle-settings-demo";
const INITIAL: Settings = {
  role: "student",
  name: "Demo student",
  campus: "Dakota State University",
  threads: [],
};

function readSettings(): Settings {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "null") ?? INITIAL;
  } catch {
    return INITIAL;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(KEY, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(KEY, onChange);
  };
}

function updateSettings(update: (settings: Settings) => Settings) {
  localStorage.setItem(KEY, JSON.stringify(update(readSettings())));
  window.dispatchEvent(new Event(KEY));
}

function getSnapshot() {
  return JSON.stringify(readSettings());
}

function getServerSnapshot() {
  return JSON.stringify(INITIAL);
}

function field(form: FormData, name: string) {
  return String(form.get(name) ?? "").trim();
}

export default function SettingsPage() {
  const settings: Settings = JSON.parse(useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot));
  const isAdmin = settings.role === "administrator";

  function setRole(role: Role) {
    updateSettings((current) => ({ ...current, role }));
  }

  function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = field(form, "name");
    const campus = field(form, "campus");
    if (name && campus) updateSettings((current) => ({ ...current, name, campus }));
  }

  function sendMessage(event: FormEvent<HTMLFormElement>, threadId?: string) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const subject = field(form, "subject");
    const body = field(form, "message");
    if (!body || (!threadId && !subject)) return;

    const message = {
      id: crypto.randomUUID(),
      author: isAdmin ? "Office administrator" : settings.name,
      body,
    };
    updateSettings((current) => ({
      ...current,
      threads: threadId
        ? current.threads.map((thread) =>
            thread.id === threadId ? { ...thread, messages: [...thread.messages, message] } : thread)
        : [{ id: message.id, subject, messages: [message] }, ...current.threads],
    }));
    event.currentTarget.reset();
  }

  return (
    <main className="mx-auto w-full max-w-4xl space-y-5 px-4 py-8">
      <Link href="/" className="text-sm font-semibold text-brand hover:underline">← Marketplace</Link>
      <header>
        <h1 className="mt-2 text-3xl font-extrabold">Settings</h1>
        <p className="mt-1 text-sm text-slate-600">Demo data and office conversations are saved in this browser.</p>
      </header>

      {settings.role === "signed-out" ? (
        <section className="card space-y-3 p-5">
          <h2 className="text-lg font-bold">Logged out of the demo</h2>
          <button className="btn btn-primary" onClick={() => setRole("student")}>Resume student demo</button>
        </section>
      ) : (
        <>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Demo view">
            <button className="btn btn-outline" aria-pressed={!isAdmin} onClick={() => setRole("student")}>Student demo</button>
            <button className="btn btn-outline" aria-pressed={isAdmin} onClick={() => setRole("administrator")}>Administrator demo</button>
          </div>

          {!isAdmin && (
            <>
              <section className="card p-5">
                <h2 className="mb-3 text-lg font-bold">Profile</h2>
                <form key={JSON.stringify([settings.name, settings.campus])} onSubmit={saveProfile} className="space-y-3">
                  <label className="label">Display name
                    <input name="name" className="input mt-1" defaultValue={settings.name} required maxLength={80} />
                  </label>
                  <label className="label">Campus
                    <input name="campus" className="input mt-1" defaultValue={settings.campus} required maxLength={100} />
                  </label>
                  <button className="btn btn-primary">Save profile</button>
                </form>
              </section>

              <div className="grid gap-4 sm:grid-cols-2">
                <section className="card p-5">
                  <h2 className="text-lg font-bold">Transaction history</h2>
                  <p className="mt-1 text-sm text-slate-600">No transactions yet. Marketplace payments are pending integration.</p>
                </section>
                <section className="card p-5">
                  <h2 className="text-lg font-bold">Banking information</h2>
                  <p className="mt-1 text-sm text-slate-600">No payout account connected. Bank setup will be available when payments launch.</p>
                </section>
              </div>
            </>
          )}

          <section className="card space-y-4 p-5">
            <h2 className="text-lg font-bold">{isAdmin ? "Office inbox" : "Contact the office"}</h2>
            {!isAdmin && (
              <form onSubmit={sendMessage} className="space-y-3">
                <label className="label">Subject
                  <input name="subject" className="input mt-1" required maxLength={120} />
                </label>
                <label className="label">Message
                  <textarea name="message" className="input mt-1" rows={3} required maxLength={2000} />
                </label>
                <button className="btn btn-primary">Send message</button>
              </form>
            )}

            {settings.threads.length === 0 && <p className="text-sm text-slate-600">No office conversations yet.</p>}
            {settings.threads.map((thread) => (
              <article key={thread.id} className="space-y-3 rounded-lg border border-slate-200 p-4">
                <h3 className="break-words font-semibold">{thread.subject}</h3>
                <ul className="space-y-2" aria-label="Messages">
                  {thread.messages.map((message) => (
                    <li key={message.id} className="break-words rounded-lg bg-slate-50 p-3 text-sm">
                      <p className="font-semibold">{message.author}</p>
                      <p className="whitespace-pre-wrap text-slate-700">{message.body}</p>
                    </li>
                  ))}
                </ul>
                <form onSubmit={(event) => sendMessage(event, thread.id)} className="space-y-2">
                  <label className="label">Reply to {thread.subject}
                    <textarea name="message" className="input mt-1" rows={2} required maxLength={2000} />
                  </label>
                  <button className="btn btn-outline">Send reply</button>
                </form>
              </article>
            ))}
          </section>

          <button className="btn btn-danger" onClick={() => setRole("signed-out")}>Log out</button>
        </>
      )}
    </main>
  );
}
