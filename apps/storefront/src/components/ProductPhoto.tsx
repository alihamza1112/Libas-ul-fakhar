import Image from "next/image";
import { altFor, imagesFor } from "@/lib/productImages";
import type { Product } from "@/lib/types";
import { ProductArt } from "./ProductArt";

type PhotoProduct = Pick<Product, "name" | "garment" | "colours" | "images" | "tags">;

/**
 * The product photo for a colour at a position (0 = main, 1 = hover/second view).
 * Falls back to the brand placeholder art when no photo exists yet.
 * `className` sizes the box (e.g. "aspect-[4/5] w-full" or "h-20 w-16"); photos are
 * cropped to fill it, centred.
 */
export function ProductPhoto({
  product,
  colour,
  index = 0,
  sizes,
  className = "",
  preload = false,
}: {
  product: PhotoProduct;
  colour?: string;
  index?: number;
  sizes: string;
  className?: string;
  preload?: boolean;
}) {
  const photos = imagesFor(product, colour);
  const photo = photos[index] ?? (index > 0 ? undefined : photos[0]);
  const hex = product.colours.find((c) => c.name === colour)?.hex ?? product.colours[0]?.hex ?? "#D8C3A5";
  return (
    // `fill` images need a positioned box; keep the caller's `absolute` if given
    <div className={`${/\babsolute\b/.test(className) ? "" : "relative "}overflow-hidden bg-cream ${className}`}>
      {photo ? (
        <Image
          src={photo.url}
          alt={altFor(product, photo, index)}
          fill
          sizes={sizes}
          preload={preload}
          className="object-cover"
        />
      ) : (
        <ProductArt
          garment={product.garment}
          hex={hex}
          view={index > 0 ? "detail" : "front"}
          embroidered={product.tags.includes("embroidered")}
          className="h-full w-full"
          title={`${product.name}${colour ? ` in ${colour}` : ""}`}
        />
      )}
    </div>
  );
}

/** Whether a second view exists (photo or the art's detail view always does). */
export function hasPhotos(product: Pick<Product, "images">, colour?: string): boolean {
  return imagesFor(product, colour).length > 0;
}
