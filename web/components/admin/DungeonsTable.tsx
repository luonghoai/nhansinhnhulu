"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { DungeonDTO } from "@/lib/dto";

export function DungeonsTable({ initialDungeons }: { initialDungeons: DungeonDTO[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [size, setSize] = useState<"6" | "12">("6");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/admin/dungeons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, size: Number(size), description }),
    });

    setSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Failed to create dungeon");
      return;
    }

    setName("");
    setDescription("");
    router.refresh();
  }

  async function toggleActive(dungeon: DungeonDTO) {
    await fetch(`/api/admin/dungeons/${dungeon.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !dungeon.isActive }),
    });
    router.refresh();
  }

  async function remove(dungeon: DungeonDTO) {
    const res = await fetch(`/api/admin/dungeons/${dungeon.id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Failed to delete dungeon");
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <form onSubmit={handleCreate} className="mb-6 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium text-zinc-700">
            Name
          </label>
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-56 rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          />
        </div>
        <div>
          <label htmlFor="size" className="mb-1 block text-sm font-medium text-zinc-700">
            Size
          </label>
          <select
            id="size"
            value={size}
            onChange={(e) => setSize(e.target.value as "6" | "12")}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          >
            <option value="6">6</option>
            <option value="12">12</option>
          </select>
        </div>
        <div>
          <label htmlFor="description" className="mb-1 block text-sm font-medium text-zinc-700">
            Description
          </label>
          <input
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-72 rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="cursor-pointer rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Creating..." : "Create"}
        </button>
      </form>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {initialDungeons.length === 0 ? (
        <p className="text-sm text-zinc-500">No dungeons yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Size</th>
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {initialDungeons.map((dungeon) => (
                <tr key={dungeon.id}>
                  <td className="px-4 py-3 font-medium text-zinc-900">{dungeon.name}</td>
                  <td className="px-4 py-3">{dungeon.size}-man</td>
                  <td className="px-4 py-3 text-zinc-500">{dungeon.description || "—"}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => toggleActive(dungeon)}
                      className={`cursor-pointer rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
                        dungeon.isActive
                          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                          : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
                      }`}
                    >
                      {dungeon.isActive ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => remove(dungeon)}
                      className="cursor-pointer rounded-md border border-zinc-300 px-2 py-1 text-xs transition-colors hover:bg-red-50 hover:text-red-700"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
