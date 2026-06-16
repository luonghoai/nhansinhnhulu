"use client";

import Image from "next/image";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { classIconSrc } from "@/lib/assets";
import type { MemberDTO } from "@/lib/dto";

interface MemberPickerProps {
  members: MemberDTO[];
  value: string | null;
  onChange: (memberId: string | null) => void;
  /** Member ids that are already taken elsewhere and shouldn't be selectable. */
  disabledIds?: Set<string>;
  placeholder?: string;
}

/**
 * Searchable member combobox: shows the chosen member as a button; clicking opens a
 * popover with a type-to-filter input over `discordName` + `class`. Keyboard: ArrowUp/Down
 * to move, Enter to pick, Escape to close. Closes on outside click.
 */
export function MemberPicker({
  members,
  value,
  onChange,
  disabledIds,
  placeholder = "— open —",
}: MemberPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [rawActiveIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();

  const selected = useMemo(
    () => members.find((m) => m.id === value) ?? null,
    [members, value]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) =>
        m.discordName.toLowerCase().includes(q) ||
        (m.class ?? "").toLowerCase().includes(q)
    );
  }, [members, query]);

  // Focus the search input once the popover renders.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Clamp the highlight to the current results instead of tracking it in an effect.
  const activeIndex = Math.min(rawActiveIndex, Math.max(0, filtered.length - 1));

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function isDisabled(member: MemberDTO) {
    return member.id !== value && (disabledIds?.has(member.id) ?? false);
  }

  function pick(memberId: string | null) {
    onChange(memberId);
    setOpen(false);
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const member = filtered[activeIndex];
      if (member && !isDisabled(member)) pick(member.id);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative flex-1">
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          setQuery("");
          setActiveIndex(0);
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-md border border-zinc-300 px-2 py-1 text-left text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
      >
        {selected ? (
          <MemberLabel member={selected} className="flex-1 truncate" />
        ) : (
          <span className="flex-1 truncate text-zinc-400">{placeholder}</span>
        )}
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-zinc-400" />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-md border border-zinc-200 bg-white shadow-lg">
          <div className="flex items-center gap-2 border-b border-zinc-100 px-2">
            <Search className="h-4 w-4 shrink-0 text-zinc-400" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Type to filter…"
              role="combobox"
              aria-controls={listboxId}
              aria-expanded
              className="w-full py-2 text-sm focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  inputRef.current?.focus();
                }}
                className="shrink-0 text-zinc-400 hover:text-zinc-600"
                aria-label="Clear filter"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <ul id={listboxId} role="listbox" className="max-h-56 overflow-y-auto py-1">
            <li role="option" aria-selected={value === null}>
              <button
                type="button"
                onClick={() => pick(null)}
                className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm text-zinc-500 hover:bg-zinc-50"
              >
                <span className="h-4 w-4 shrink-0" />
                <span className="flex-1">{placeholder}</span>
                {value === null && <Check className="h-4 w-4 text-zinc-900" />}
              </button>
            </li>

            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-zinc-400">No members found.</li>
            ) : (
              filtered.map((member, index) => {
                const disabled = isDisabled(member);
                const isSelected = member.id === value;
                return (
                  <li key={member.id} role="option" aria-selected={isSelected}>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => pick(member.id)}
                      onMouseEnter={() => setActiveIndex(index)}
                      className={`flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm ${
                        index === activeIndex ? "bg-zinc-100" : ""
                      } ${disabled ? "cursor-not-allowed opacity-40" : "hover:bg-zinc-50"}`}
                    >
                      <Check
                        className={`h-4 w-4 shrink-0 ${isSelected ? "text-zinc-900" : "text-transparent"}`}
                      />
                      <MemberLabel member={member} className="flex-1 truncate" />
                      {disabled && (
                        <span className="shrink-0 text-xs text-zinc-400">taken</span>
                      )}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

function MemberLabel({ member, className }: { member: MemberDTO; className?: string }) {
  const iconSrc = classIconSrc(member.classIcon);
  return (
    <span className={`flex items-center gap-2 ${className ?? ""}`}>
      {iconSrc && (
        <Image
          src={iconSrc}
          alt=""
          width={18}
          height={18}
          className="shrink-0 rounded-full"
          unoptimized={iconSrc.endsWith(".svg")}
        />
      )}
      <span className="truncate text-zinc-900">{member.discordName}</span>
      {member.class && <span className="truncate text-xs text-zinc-400">{member.class}</span>}
    </span>
  );
}
