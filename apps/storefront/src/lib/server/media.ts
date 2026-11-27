import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { randomBytes } from "crypto";
import sharp, { type Metadata } from "sharp";
import { fitPlan, IMAGE_ID, imageUrl, TARGET_RATIO, type FitPlan } from "../productImages";
import type { ProductImage } from "../types";

// Product photo storage. Uploads are decoded and re-encoded by sharp, which
// rejects anything that isn't really an image, auto-rotates phone photos and
// strips EXIF (including GPS). Every photo is reshaped to a 4:5 portrait (at most
// 1600×2000) and compressed, so admins can upload photos straight from a phone.
// Transparency is kept (WebP supports it); the store shows photos on cream. Files live outside /public so they are served by
// a route and can be moved to S3-compatible storage + CDN later (BRD 5.2).

export const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads", "products");
// The editor shrinks bigger photos in the browser first; this is the server's backstop
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
const MIN_SHORT_SIDE = 500;
// Stored WebP files aim to stay under this; quality steps down until they do
const TARGET_BYTES = 600 * 1024;
const QUALITIES = [82, 74, 66, 58];
// An edge counts as one plain colour when its pixels vary less than this (0–255 scale)
const PLAIN_EDGE_STDEV = 18;
const LIMIT = { limitInputPixels: 60_000_000 };
// In-between steps stay lossless; only the final WebP is compressed
const LOSSLESS = { compressionLevel: 0 };
const ACCEPTED = new Set(["jpeg", "png", "webp"]);

export class UploadError extends Error {}

export function mediaPath(id: string): string {
  if (!IMAGE_ID.test(id)) throw new UploadError("Invalid image id.");
  return path.join(UPLOAD_DIR, `${id}.webp`);
}

export async function storeUpload(input: Buffer): Promise<ProductImage> {
  if (input.byteLength > MAX_UPLOAD_BYTES) throw new UploadError("Photo is larger than 25 MB.");
  let meta: Metadata;
  try {
    meta = await sharp(input, LIMIT).metadata();
  } catch {
    throw new UploadError("This file isn’t a readable image.");
  }
  if (meta.format === "heif") throw new UploadError("HEIC photos aren’t supported yet – export as JPEG (iPhone: Settings → Camera → Formats → Most Compatible).");
  if (!meta.format || !ACCEPTED.has(meta.format)) throw new UploadError("Upload a JPEG, PNG or WebP photo.");
  // orientation 5–8 means the image is stored rotated 90°
  const [w, h] = (meta.orientation ?? 1) >= 5 ? [meta.height ?? 0, meta.width ?? 0] : [meta.width ?? 0, meta.height ?? 0];
  if (Math.min(w, h) < MIN_SHORT_SIDE) throw new UploadError(`Photo is too small (${w}×${h}). Use at least ${MIN_SHORT_SIDE}px on the short side; 1600×2000 is ideal.`);

  const plan = fitPlan(w, h);
  // rotate applies EXIF orientation (metadata is dropped on output); transparency is kept
  const shaped =
    plan.mode === "pad"
      ? await padToFrame(input, w, h, plan)
      : await sharp(input, LIMIT).rotate().resize({ width: plan.width, height: plan.height, fit: "cover", position: "centre" }).png(LOSSLESS).toBuffer();
  let out = await sharp(shaped).webp({ quality: QUALITIES[0] }).toBuffer({ resolveWithObject: true });
  for (const quality of QUALITIES.slice(1)) {
    if (out.data.byteLength <= TARGET_BYTES) break;
    out = await sharp(shaped).webp({ quality }).toBuffer({ resolveWithObject: true });
  }
  const { data, info } = out;

  const id = randomBytes(8).toString("hex");
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const file = mediaPath(id);
  await fs.writeFile(`${file}.tmp`, data);
  await fs.rename(`${file}.tmp`, file);
  return { id, url: imageUrl(id), width: info.width, height: info.height };
}

type Side = "top" | "bottom" | "left" | "right";
type Fill = { r: number; g: number; b: number; alpha: number };
const TRANSPARENT: Fill = { r: 255, g: 255, b: 255, alpha: 0 };

/**
 * Fits the whole photo into the 4:5 frame and fills the two new bands. Each band
 * continues the edge it touches: a plain edge (wall, backdrop) lends the band its
 * colour; a busy one (furniture, floor, the garment itself) leaves the band
 * transparent, so the store's cream background shows instead of a wrong colour.
 */
async function padToFrame(input: Buffer, w: number, h: number, plan: FitPlan): Promise<Buffer> {
  const wide = w / h > TARGET_RATIO; // bands above and below; otherwise left and right
  const scale = wide ? plan.width / w : plan.height / h;
  const pw = Math.min(plan.width, Math.round(w * scale));
  const ph = Math.min(plan.height, Math.round(h * scale));
  const photo = await sharp(input, LIMIT).rotate().resize(pw, ph, { fit: "fill" }).png(LOSSLESS).toBuffer();

  const [first, second]: [Side, Side] = wide ? ["top", "bottom"] : ["left", "right"];
  const gap = wide ? plan.height - ph : plan.width - pw;
  const fills = [await edgeFill(photo, pw, ph, first), await edgeFill(photo, pw, ph, second)];
  let img = fills.some((f) => f.alpha === 0) ? await sharp(photo).ensureAlpha().png(LOSSLESS).toBuffer() : photo;
  img = await sharp(img).extend({ [first]: Math.floor(gap / 2), background: fills[0] }).png(LOSSLESS).toBuffer();
  return sharp(img).extend({ [second]: gap - Math.floor(gap / 2), background: fills[1] }).png(LOSSLESS).toBuffer();
}

/** The colour to extend one edge with, or transparent when that edge isn't one plain colour. */
async function edgeFill(photo: Buffer, width: number, height: number, side: Side): Promise<Fill> {
  const across = side === "top" || side === "bottom";
  const t = Math.max(2, Math.round((across ? height : width) * 0.02));
  const region =
    side === "top" ? { left: 0, top: 0, width, height: t }
    : side === "bottom" ? { left: 0, top: height - t, width, height: t }
    : side === "left" ? { left: 0, top: 0, width: t, height }
    : { left: width - t, top: 0, width: t, height };
  // stats() reads its input, not the pipeline, so cut the strip out first
  const strip = await sharp(photo).extract(region).png(LOSSLESS).toBuffer();
  const { channels } = await sharp(strip).stats();
  // 1–2 channels: greyscale (+ alpha); 3–4: colour (+ alpha)
  const colour = channels.length >= 3 ? channels.slice(0, 3) : [channels[0], channels[0], channels[0]];
  const alpha = channels.length % 2 === 0 ? channels[channels.length - 1] : undefined;
  const plain = colour.every((c) => c.stdev <= PLAIN_EDGE_STDEV) && (!alpha || alpha.min === 255);
  if (!plain) return TRANSPARENT;
  const [r, g, b] = colour.map((c) => Math.round(c.mean));
  return { r, g, b, alpha: 1 };
}

export async function readMedia(id: string): Promise<Buffer | undefined> {
  try {
    return await fs.readFile(mediaPath(id));
  } catch {
    return undefined;
  }
}

export async function mediaExists(id: string): Promise<boolean> {
  try {
    return (await fs.stat(mediaPath(id))).isFile();
  } catch {
    return false;
  }
}

export async function deleteMedia(ids: string[]): Promise<void> {
  await Promise.all(ids.filter((id) => IMAGE_ID.test(id)).map((id) => fs.rm(mediaPath(id), { force: true })));
}

/** Removes uploads no product references (e.g. uploaded, then the edit was abandoned). */
export async function deleteOrphans(referenced: Set<string>, olderThanMs: number): Promise<number> {
  let files: string[];
  try {
    files = await fs.readdir(UPLOAD_DIR);
  } catch {
    return 0;
  }
  const cutoff = Date.now() - olderThanMs;
  let n = 0;
  for (const f of files) {
    const id = f.replace(/\.webp$/, "");
    if (!IMAGE_ID.test(id) || referenced.has(id)) continue;
    const stat = await fs.stat(path.join(UPLOAD_DIR, f)).catch(() => undefined);
    if (stat && stat.mtimeMs < cutoff) {
      await fs.rm(path.join(UPLOAD_DIR, f), { force: true });
      n++;
    }
  }
  return n;
}
