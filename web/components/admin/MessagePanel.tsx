"use client";

import { useRef, useState } from "react";
import type { MemberDTO } from "@/lib/dto";

const MAX_LEN = 2000;

type MentionState = {
  query: string;
  textNode: Text;
  atIndex: number;
} | null;

/** Recursively turn the editor DOM into Discord message content + mentioned ids. */
function serializeNode(node: Node, ids: string[]): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
  if (!(node instanceof HTMLElement)) return "";
  const id = node.dataset.discordId;
  if (id) {
    ids.push(id);
    return `<@${id}>`;
  }
  if (node.tagName === "BR") return "\n";
  let inner = "";
  node.childNodes.forEach((c) => {
    inner += serializeNode(c, ids);
  });
  if (node.tagName === "DIV" || node.tagName === "P") return `\n${inner}`;
  return inner;
}

function serialize(root: HTMLElement): { content: string; ids: string[] } {
  const ids: string[] = [];
  let content = "";
  root.childNodes.forEach((c) => {
    content += serializeNode(c, ids);
  });
  return { content: content.trim(), ids: [...new Set(ids)] };
}

export function MessagePanel({ members }: { members: MemberDTO[] }) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [mention, setMention] = useState<MentionState>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [length, setLength] = useState(0);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const matches = mention
    ? members
        .filter((m) => m.discordName.toLowerCase().includes(mention.query.toLowerCase()))
        .slice(0, 8)
    : [];

  function refreshLength() {
    if (editorRef.current) setLength(serialize(editorRef.current).content.length);
  }

  /** Detect a `@query` token immediately before the collapsed caret. */
  function detectMention() {
    const sel = window.getSelection();
    if (!sel || !sel.isCollapsed || sel.rangeCount === 0) {
      setMention(null);
      return;
    }
    const node = sel.anchorNode;
    if (!node || node.nodeType !== Node.TEXT_NODE) {
      setMention(null);
      return;
    }
    const textNode = node as Text;
    const before = (textNode.textContent ?? "").slice(0, sel.anchorOffset);
    const m = before.match(/(?:^|\s)@(\S*)$/);
    if (!m) {
      setMention(null);
      return;
    }
    setMention({
      query: m[1],
      textNode,
      atIndex: sel.anchorOffset - m[1].length - 1,
    });
  }

  function handleInput() {
    setSuccess(false);
    setError(null);
    setActiveIndex(0);
    refreshLength();
    detectMention();
  }

  function insertMention(member: MemberDTO) {
    const ctx = mention;
    const editor = editorRef.current;
    if (!ctx || !editor) return;

    const caretOffset = ctx.atIndex + 1 + ctx.query.length;
    const range = document.createRange();
    range.setStart(ctx.textNode, ctx.atIndex);
    range.setEnd(ctx.textNode, caretOffset);
    range.deleteContents();

    const chip = document.createElement("span");
    chip.contentEditable = "false";
    chip.dataset.discordId = member.discordId;
    chip.className =
      "mx-0.5 rounded bg-indigo-100 px-1.5 py-0.5 text-indigo-700 font-medium";
    chip.textContent = `@${member.discordName}`;
    range.insertNode(chip);

    const space = document.createTextNode(" ");
    chip.after(space);

    const sel = window.getSelection();
    const after = document.createRange();
    after.setStartAfter(space);
    after.collapse(true);
    sel?.removeAllRanges();
    sel?.addRange(after);

    setMention(null);
    refreshLength();
    editor.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!mention || matches.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % matches.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + matches.length) % matches.length);
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      insertMention(matches[activeIndex]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setMention(null);
    }
  }

  async function handleSend() {
    const editor = editorRef.current;
    if (!editor) return;
    const { content, ids } = serialize(editor);
    if (content.length === 0) {
      setError("Message is empty.");
      return;
    }
    if (content.length > MAX_LEN) {
      setError(`Message is too long (${content.length}/${MAX_LEN}).`);
      return;
    }

    setSending(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch("/api/admin/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, mentionUserIds: ids }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? "Failed to send message.");
        return;
      }
      editor.innerHTML = "";
      setMention(null);
      setLength(0);
      setSuccess(true);
    } catch {
      setError("Network error — could not send message.");
    } finally {
      setSending(false);
    }
  }

  const overLimit = length > MAX_LEN;

  return (
    <div className="max-w-2xl">
      <div className="relative">
        <div
          ref={editorRef}
          contentEditable={!sending}
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          data-placeholder="Type your message… use @ to mention a member"
          onInput={handleInput}
          onKeyUp={detectMention}
          onClick={detectMention}
          onKeyDown={handleKeyDown}
          onBlur={() => setTimeout(() => setMention(null), 120)}
          className="min-h-32 w-full whitespace-pre-wrap break-words rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 empty:before:text-zinc-400 empty:before:content-[attr(data-placeholder)]"
        />

        {mention && matches.length > 0 && (
          <ul className="absolute left-0 right-0 z-10 mt-1 max-h-64 overflow-auto rounded-xl border border-zinc-200 bg-white py-1 shadow-lg">
            {matches.map((m, i) => (
              <li key={m.id}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    insertMention(m);
                  }}
                  onMouseEnter={() => setActiveIndex(i)}
                  className={`flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm ${
                    i === activeIndex ? "bg-indigo-50 text-indigo-700" : "text-zinc-700"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={m.discordAvatar}
                    alt=""
                    className="h-5 w-5 rounded-full"
                  />
                  <span className="font-medium">{m.discordName}</span>
                  {m.class && <span className="text-xs text-zinc-400">{m.class}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between">
        <div className="text-xs">
          {error && <span className="text-red-600">{error}</span>}
          {success && !error && <span className="text-emerald-600">Message sent.</span>}
        </div>
        <span className={`text-xs ${overLimit ? "text-red-600" : "text-zinc-400"}`}>
          {length}/{MAX_LEN}
        </span>
      </div>

      <div className="mt-3">
        <button
          type="button"
          onClick={handleSend}
          disabled={sending || length === 0 || overLimit}
          className="cursor-pointer rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {sending ? "Sending…" : "Send"}
        </button>
      </div>
    </div>
  );
}
