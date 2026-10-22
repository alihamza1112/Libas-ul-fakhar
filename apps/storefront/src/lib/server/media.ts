import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { randomBytes } from "crypto";
import sharp, { type Metadata } from "sharp";
import { IMAGE_ID, imageUrl } from "../productImages";
import type { ProductImage } from "../types";

// Product photo storage. Uploads are decoded and re-encoded by sharp, which
// rejects anything that isn't really an image, auto-rotates phone photos and
// strips EXIF (including GPS). Files live outside /public so they are served by
// a route and can be moved to S3-compatible storage + CDN later (BRD 5.2).

export const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads", "products");
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const MIN_SHORT_SIDE = 500;
const MAX_W = 2000;
const MAX_H = 2500;
const ACCEPTED = new Set(["jpeg", "png", "webp"]);

export class UploadError extends Error {}

export function mediaPath(id: string): string {
  if (!IMAGE_ID.test(id)) throw new UploadError("Invalid image id.");
  return path.join(UPLOAD_DIR, `${id}.webp`);
}

export async function storeUpload(input: Buffer): Promise<ProductImage> {
  if (input.byteLength > MAX_UPLOAD_BYTES) throw new UploadError("Photo is larger than 10 MB.");
  let meta: Metadata;
  try {
    meta = await sharp(input, { limitInputPixels: 60_000_000 }).metadata();
  } catch {
    throw new UploadError("This file isn’t a readable image.");
  }
  if (meta.format === "heif") throw new UploadError("HEIC photos aren’t supported yet – export as JPEG (iPhone: Settings → Camera → Formats → Most Compatible).");
  if (!meta.format || !ACCEPTED.has(meta.format)) throw new UploadError("Upload a JPEG, PNG or WebP photo.");
  // orientation 5–8 means the image is stored rotated 90°
  const [w, h] = (meta.orientation ?? 1) >= 5 ? [meta.height ?? 0, meta.width ?? 0] : [meta.width ?? 0, meta.height ?? 0];
  if (Math.min(w, h) < MIN_SHORT_SIDE) throw new UploadError(`Photo is too small (${w}×${h}). Use at least ${MIN_SHORT_SIDE}px on the short side; 1600×2000 is ideal.`);

  const { data, info } = await sharp(input, { limitInputPixels: 60_000_000 })
    .rotate() // apply EXIF orientation, then metadata is dropped on output
    .resize({ width: MAX_W, height: MAX_H, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 84 })
    .toBuffer({ resolveWithObject: true });

  const id = randomBytes(8).toString("hex");
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const file = mediaPath(id);
  await fs.writeFile(`${file}.tmp`, data);
  await fs.rename(`${file}.tmp`, file);
  return { id, url: imageUrl(id), width: info.width, height: info.height };
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
