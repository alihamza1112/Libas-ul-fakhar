import type { Colour, Product, ProductImage } from "./types";

// Product photos (BRD 3.2 Imagery: portrait 4:5, 4–6 per product). Each photo is
// either tied to one colour or shared by all colours. The array order is the
// display order; the first photo of a colour is its main image, the second is
// the hover image on product cards.

export const MAX_IMAGES_PER_PRODUCT = 40;
export const MAX_IMAGES_PER_COLOUR = 10;
export const IMAGE_ID = /^[a-f0-9]{16}$/;
export const TARGET_RATIO = 4 / 5;

export function imageUrl(id: string): string {
  return `/media/products/${id}.webp`;
}

/** Photos for a colour: that colour's own photos first, then shared ones. */
export function imagesFor(p: Pick<Product, "images">, colour?: string): ProductImage[] {
  const all = p.images ?? [];
  const own = colour ? all.filter((i) => i.colour === colour) : [];
  const shared = all.filter((i) => !i.colour);
  const list = [...own, ...shared];
  // A colour with no photos of its own still shows something if other colours have photos
  return list.length ? list : colour ? [] : all;
}

export function altFor(p: Pick<Product, "name">, img: ProductImage, index: number): string {
  if (img.alt) return img.alt;
  return `${p.name}${img.colour ? ` in ${img.colour}` : ""}${index ? ` – view ${index + 1}` : ""}`;
}

/** Largest stored photo: 1600×2000, the 4:5 size the storefront is designed around. */
export const OUTPUT_WIDTH = 1600;
/** Up to this share of a photo may be cropped away to reach 4:5; beyond it the photo is padded instead. */
export const MAX_CROP_SHARE = 0.2;

export interface FitPlan {
  /** crop: trim the long side evenly from both ends; pad: extend the short side with the edge colour. */
  mode: "none" | "crop" | "pad";
  width: number;
  height: number;
}

/**
 * How an uploaded photo of `width`×`height` becomes an exact 4:5 portrait no larger
 * than OUTPUT_WIDTH wide. Small differences are cropped; large ones (e.g. a landscape
 * shot) are padded so the garment is never cut off. Never enlarges.
 */
export function fitPlan(width: number, height: number): FitPlan {
  const r = width / height;
  const off = Math.abs(r - TARGET_RATIO) / TARGET_RATIO;
  const mode = off <= 0.01 ? "none" : 1 - Math.min(r / TARGET_RATIO, TARGET_RATIO / r) <= MAX_CROP_SHARE ? "crop" : "pad";
  // Width of the 4:5 frame at the photo's own resolution
  const tooWide = r > TARGET_RATIO;
  const frameW = mode === "pad" ? (tooWide ? width : height * TARGET_RATIO) : tooWide ? height * TARGET_RATIO : width;
  const w = Math.max(1, Math.round(Math.min(frameW, OUTPUT_WIDTH)));
  return { mode, width: w, height: Math.round(w / TARGET_RATIO) };
}

/** Whether a photo is close enough to the 4:5 portrait the storefront crops to. */
export function ratioWarning(img: Pick<ProductImage, "width" | "height">): string | undefined {
  const r = img.width / img.height;
  if (Math.abs(r - TARGET_RATIO) <= 0.06) return undefined;
  return r > TARGET_RATIO ? "Wider than 4:5 – the sides will be cropped" : "Taller than 4:5 – top and bottom will be cropped";
}

/**
 * Cleans an image list from the editor or the store:
 * drops unknown/duplicate ids, re-points photos of removed colours to "all colours",
 * and enforces limits. Returns the list plus an error message if limits are exceeded.
 */
export function normaliseImages(input: unknown, colours: Colour[]): { images: ProductImage[]; error?: string } {
  if (!Array.isArray(input)) return { images: [] };
  const names = new Set(colours.map((c) => c.name));
  const seen = new Set<string>();
  const images: ProductImage[] = [];
  for (const raw of input as Partial<ProductImage>[]) {
    const id = String(raw?.id ?? "");
    if (!IMAGE_ID.test(id) || seen.has(id)) continue;
    seen.add(id);
    const width = Math.round(Number(raw.width));
    const height = Math.round(Number(raw.height));
    if (!(width > 0 && height > 0)) continue;
    const colour = raw.colour && names.has(raw.colour) ? raw.colour : undefined;
    const alt = typeof raw.alt === "string" && raw.alt.trim() ? raw.alt.trim().slice(0, 140) : undefined;
    images.push({ id, url: imageUrl(id), width, height, ...(colour ? { colour } : {}), ...(alt ? { alt } : {}) });
  }
  if (images.length > MAX_IMAGES_PER_PRODUCT) return { images, error: `A product can have at most ${MAX_IMAGES_PER_PRODUCT} photos.` };
  for (const c of colours) {
    if (images.filter((i) => i.colour === c.name).length > MAX_IMAGES_PER_COLOUR) return { images, error: `${c.name} has more than ${MAX_IMAGES_PER_COLOUR} photos.` };
  }
  return { images };
}

/** Ids referenced before but not after an edit — candidates for file deletion. */
export function removedImageIds(before: ProductImage[] | undefined, after: ProductImage[] | undefined): string[] {
  const keep = new Set((after ?? []).map((i) => i.id));
  return (before ?? []).map((i) => i.id).filter((id) => !keep.has(id));
}
