"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { classIconSrc } from "@/lib/assets";
import { NSNL_CLASSES, iconKeyForClass } from "@/lib/classes";
import type { MemberDTO } from "@/lib/dto";

export function MembersTable({ initialMembers }: { initialMembers: MemberDTO[] }) {
  const router = useRouter();
  const [discordId, setDiscordId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState<Record<string, { class: string; classIcon: string }>>(
    {}
  );

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/admin/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ discordId }),
    });

    setSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Failed to add member");
      return;
    }

    setDiscordId("");
    router.refresh();
  }

  function startEdit(member: MemberDTO) {
    setEditing((prev) => ({
      ...prev,
      [member.id]: { class: member.class ?? "", classIcon: member.classIcon ?? "" },
    }));
  }

  async function saveEdit(id: string) {
    const draft = editing[id];
    if (!draft) return;

    await fetch(`/api/admin/members/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        class: draft.class || null,
        classIcon: draft.classIcon || null,
      }),
    });

    setEditing((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    router.refresh();
  }

  async function toggleActive(member: MemberDTO) {
    await fetch(`/api/admin/members/${member.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !member.isActive }),
    });
    router.refresh();
  }

  async function resync(id: string) {
    await fetch(`/api/admin/members/${id}/resync`, { method: "POST" });
    router.refresh();
  }

  return (
    <div>
      <form onSubmit={handleAdd} className="mb-6 flex items-end gap-3">
        <div>
          <label htmlFor="discordId" className="mb-1 block text-sm font-medium text-zinc-700">
            Add member by Discord ID
          </label>
          <input
            id="discordId"
            value={discordId}
            onChange={(e) => setDiscordId(e.target.value)}
            placeholder="123456789012345678"
            required
            pattern="\d+"
            className="w-64 rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="cursor-pointer rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Adding..." : "Add"}
        </button>
      </form>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {initialMembers.length === 0 ? (
        <p className="text-sm text-zinc-500">No members synced yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">Member</th>
                <th className="px-4 py-3 font-medium">Discord ID</th>
                <th className="px-4 py-3 font-medium">Class</th>
                <th className="px-4 py-3 font-medium">Class Icon</th>
                <th className="px-4 py-3 font-medium">Active</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {initialMembers.map((member) => {
                const draft = editing[member.id];
                return (
                  <tr key={member.id}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Image
                          src={member.discordAvatar}
                          alt={member.discordName}
                          width={28}
                          height={28}
                          className="rounded-full"
                        />
                        <span className="font-medium text-zinc-900">{member.discordName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-500">
                      {member.discordId}
                    </td>
                    <td className="px-4 py-3">
                      {draft ? (
                        // Selecting a class auto-fills its canonical icon key (see
                        // `lib/classes.ts`), so the icon column stays in sync — no free typing.
                        <select
                          value={draft.class}
                          onChange={(e) =>
                            setEditing((prev) => ({
                              ...prev,
                              [member.id]: {
                                ...prev[member.id],
                                class: e.target.value,
                                classIcon: iconKeyForClass(e.target.value) ?? "",
                              },
                            }))
                          }
                          className="w-32 cursor-pointer rounded-md border border-zinc-300 px-2 py-1 text-sm"
                        >
                          <option value="">— Unassigned —</option>
                          {NSNL_CLASSES.map((c) => (
                            <option key={c.iconKey} value={c.name}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        member.class ?? <span className="text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {(() => {
                        const iconKey = draft ? draft.classIcon : member.classIcon;
                        const src = classIconSrc(iconKey);
                        if (!src) return <span className="text-zinc-400">—</span>;
                        return (
                          <div className="flex items-center gap-2">
                            <Image
                              src={src}
                              alt=""
                              width={24}
                              height={24}
                              className="rounded-full"
                              unoptimized={src.endsWith(".svg")}
                            />
                            <span className="font-mono text-xs text-zinc-500">{iconKey}</span>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => toggleActive(member)}
                        className={`cursor-pointer rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
                          member.isActive
                            ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                            : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
                        }`}
                      >
                        {member.isActive ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {draft ? (
                          <button
                            type="button"
                            onClick={() => saveEdit(member.id)}
                            className="cursor-pointer rounded-md border border-zinc-300 px-2 py-1 text-xs transition-colors hover:bg-zinc-100"
                          >
                            Save
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => startEdit(member)}
                            className="cursor-pointer rounded-md border border-zinc-300 px-2 py-1 text-xs transition-colors hover:bg-zinc-100"
                          >
                            Edit
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => resync(member.id)}
                          className="cursor-pointer rounded-md border border-zinc-300 px-2 py-1 text-xs transition-colors hover:bg-zinc-100"
                        >
                          Re-sync
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
