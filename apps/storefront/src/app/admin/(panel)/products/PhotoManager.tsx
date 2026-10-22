"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { MAX_IMAGES_PER_COLOUR, ratioWarning } from "@/lib/productImages";
import type { ProductImage } from "@/lib/types";

export interface EditorImage extends ProductImage {
  /** Editor colour row key, or null for "all colours". */
  colourKey: string | null;
}

interface ColourRef {
  key: string;
  name: string;
  hex: string;
}

interface Pending {
  tempId: string;
  name: string;
  colourKey: string | null;
  error?: string;
}

const ACCEPT = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 10 * 1024 * 1024;
const PARALLEL = 3;

export function PhotoManager({ images, onChange, colours }: { images: EditorImage[]; onChange: (next: EditorImage[]) => void; colours: ColourRef[] }) {
  const [pending, setPending] = useState<Pending[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overGroup, setOverGroup] = useState<string | null>(null);
  // Uploads finish asynchronously; keep the latest list so results append to it
  const latest = useRef(images);
  useEffect(() => {
    latest.current = images;
  }, [images]);

  const groups: { key: string | null; label: string; hex?: string }[] = [
    ...colours.map((c) => ({ key: c.key, label: c.name || "Unnamed colour", hex: c.hex })),
    { key: null, label: "All colours" },
  ];

  const inGroup = (key: string | null) => images.filter((i) => i.colourKey === key);

  const commit = (next: EditorImage[]) => {
    latest.current = next;
    onChange(next);
  };

  async function upload(files: FileList | File[], colourKey: string | null) {
    const list = Array.from(files);
    const queue: { file: File; tempId: string }[] = [];
    const rejected: Pending[] = [];
    for (const file of list) {
      const tempId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      if (!ACCEPT.includes(file.type)) rejected.push({ tempId, name: file.name, colourKey, error: /heic|heif/i.test(file.type + file.name) ? "HEIC isn’t supported – export as JPEG." : "Use JPEG, PNG or WebP." });
      else if (file.size > MAX_BYTES) rejected.push({ tempId, name: file.name, colourKey, error: "Larger than 10 MB." });
      else queue.push({ file, tempId });
    }
    setPending((p) => [...p, ...rejected, ...queue.map((q) => ({ tempId: q.tempId, name: q.file.name, colourKey }))]);

    const results = new Map<string, ProductImage>();
    let cursor = 0;
    const worker = async () => {
      while (cursor < queue.length) {
        const { file, tempId } = queue[cursor++];
        const fd = new FormData();
        fd.append("file", file);
        try {
          const r = await fetch("/api/admin/uploads", { method: "POST", body: fd });
          const j = await r.json().catch(() => ({}));
          if (!r.ok) throw new Error(j.error ?? `Upload failed (${r.status}).`);
          results.set(tempId, j.image as ProductImage);
          setPending((p) => p.filter((x) => x.tempId !== tempId));
        } catch (e) {
          setPending((p) => p.map((x) => (x.tempId === tempId ? { ...x, error: e instanceof Error ? e.message : "Upload failed." } : x)));
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(PARALLEL, queue.length) }, worker));
    // Append in the order the files were chosen, not the order they finished
    const added = queue.flatMap((q) => (results.has(q.tempId) ? [{ ...results.get(q.tempId)!, colourKey }] : []));
    if (added.length) commit([...latest.current, ...added]);
  }

  /** Moves `id` to sit before `beforeId` (or to the end of `colourKey` group). */
  function move(id: string, colourKey: string | null, beforeId?: string) {
    const item = images.find((i) => i.id === id);
    if (!item || id === beforeId) return;
    const rest = images.filter((i) => i.id !== id);
    const moved = { ...item, colourKey };
    const at = beforeId ? rest.findIndex((i) => i.id === beforeId) : -1;
    if (at >= 0) rest.splice(at, 0, moved);
    else {
      const lastInGroup = rest.map((i) => i.colourKey).lastIndexOf(colourKey);
      rest.splice(lastInGroup + 1 || rest.length, 0, moved);
    }
    commit(rest);
  }

  function step(id: string, dir: -1 | 1) {
    const item = images.find((i) => i.id === id)!;
    const group = inGroup(item.colourKey);
    const idx = group.findIndex((i) => i.id === id);
    const target = group[idx + dir];
    if (!target) return;
    const a = images.indexOf(item);
    const b = images.indexOf(target);
    const next = [...images];
    [next[a], next[b]] = [next[b], next[a]];
    commit(next);
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted">
        Portrait 4:5 photos look best (e.g. 1600×2000). The first photo of each colour is the main image; the second appears on hover in listings.
        “All colours” photos (details, flat-lays) show after each colour’s own photos. Changes are saved with the product.
      </p>
      {groups.map((g) => {
        const items = inGroup(g.key);
        const waiting = pending.filter((p) => p.colourKey === g.key);
        const groupId = g.key ?? "__all";
        const full = g.key !== null && items.length >= MAX_IMAGES_PER_COLOUR;
        return (
          <div
            key={groupId}
            className={`border p-3 transition-colors ${overGroup === groupId ? "border-ink bg-cream" : "border-line"}`}
            onDragOver={(e) => {
              e.preventDefault();
              setOverGroup(groupId);
            }}
            onDragLeave={() => setOverGroup((o) => (o === groupId ? null : o))}
            onDrop={(e) => {
              e.preventDefault();
              setOverGroup(null);
              if (e.dataTransfer.files.length) upload(e.dataTransfer.files, g.key);
              else if (dragId) move(dragId, g.key);
              setDragId(null);
            }}
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="flex items-center gap-2 text-sm font-medium">
                {g.hex && <span className="h-4 w-4 rounded-full border border-line" style={{ backgroundColor: g.hex }} />}
                {g.label} <span className="font-normal text-muted">({items.length})</span>
              </p>
              <label className={`btn btn-secondary min-h-9 cursor-pointer px-3 text-[0.7rem] ${full ? "pointer-events-none opacity-40" : ""}`}>
                Upload photos
                <input
                  type="file"
                  accept={ACCEPT.join(",")}
                  multiple
                  className="sr-only"
                  disabled={full}
                  onChange={(e) => {
                    if (e.target.files?.length) upload(e.target.files, g.key);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>

            {items.length === 0 && waiting.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted">Drop photos here or use Upload. {g.key ? "Until then the store shows placeholder art in this colour." : ""}</p>
            ) : (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {items.map((img, i) => {
                  const warn = ratioWarning(img);
                  return (
                    <li
                      key={img.id}
                      draggable
                      onDragStart={(e) => {
                        setDragId(img.id);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onDragEnd={() => setDragId(null)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        if (!dragId) return;
                        e.preventDefault();
                        e.stopPropagation();
                        setOverGroup(null);
                        move(dragId, g.key, img.id);
                        setDragId(null);
                      }}
                      className={`space-y-1.5 bg-white ${dragId === img.id ? "opacity-40" : ""}`}
                    >
                      <div className="relative aspect-[4/5] cursor-grab overflow-hidden bg-cream active:cursor-grabbing">
                        <Image src={img.url} alt={img.alt || `${g.label} photo ${i + 1}`} fill sizes="200px" className="object-cover" />
                        {g.key !== null && i === 0 && <span className="absolute start-1 top-1 bg-ink px-1.5 py-0.5 text-[10px] uppercase tracking-[0.1em] text-ivory">Main</span>}
                        {g.key !== null && i === 1 && <span className="absolute start-1 top-1 bg-ivory px-1.5 py-0.5 text-[10px] uppercase tracking-[0.1em]">Hover</span>}
                        {warn && <span className="absolute inset-x-1 bottom-1 bg-amber-100/95 px-1.5 py-0.5 text-[10px] leading-tight" title={warn}>{warn}</span>}
                      </div>
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => step(img.id, -1)} disabled={i === 0} className="h-7 w-7 border border-line text-xs disabled:opacity-30" aria-label="Move earlier">←</button>
                        <button type="button" onClick={() => step(img.id, 1)} disabled={i === items.length - 1} className="h-7 w-7 border border-line text-xs disabled:opacity-30" aria-label="Move later">→</button>
                        <select
                          value={img.colourKey ?? ""}
                          onChange={(e) => move(img.id, e.target.value || null)}
                          className="h-7 min-w-0 flex-1 border border-line bg-white px-1 text-xs"
                          aria-label="Colour for this photo"
                        >
                          {colours.map((c) => <option key={c.key} value={c.key}>{c.name || "Unnamed"}</option>)}
                          <option value="">All colours</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => commit(images.filter((x) => x.id !== img.id))}
                          className="h-7 px-1.5 text-xs text-muted hover:text-sale"
                          aria-label={`Remove photo ${i + 1}`}
                        >
                          ✕
                        </button>
                      </div>
                      <input
                        value={img.alt ?? ""}
                        onChange={(e) => commit(images.map((x) => (x.id === img.id ? { ...x, alt: e.target.value } : x)))}
                        placeholder="Alt text (optional)"
                        aria-label="Alt text"
                        maxLength={140}
                        className="w-full border border-line px-1.5 py-1 text-xs"
                      />
                    </li>
                  );
                })}
                {waiting.map((p) => (
                  <li key={p.tempId} className="space-y-1.5">
                    <div className={`grid aspect-[4/5] place-items-center p-2 text-center text-xs ${p.error ? "bg-sale/10 text-sale" : "animate-pulse bg-sand text-muted"}`}>
                      {p.error ? (
                        <span>
                          {p.error}
                          <button type="button" className="mt-2 block w-full underline" onClick={() => setPending((x) => x.filter((y) => y.tempId !== p.tempId))}>Dismiss</button>
                        </span>
                      ) : (
                        "Uploading…"
                      )}
                    </div>
                    <p className="truncate text-[11px] text-muted" title={p.name}>{p.name}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
