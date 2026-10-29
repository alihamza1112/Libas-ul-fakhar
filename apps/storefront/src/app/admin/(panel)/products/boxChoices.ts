import { imagesFor } from "@/lib/productImages";
import type { Product } from "@/lib/types";
import type { BoxChoice } from "./BoxContents";

/** Everything that can go inside a gift box: any product except other boxes and archived ones. */
export function boxChoicesFrom(products: Product[]): BoxChoice[] {
  return products
    .filter((p) => !p.bundle && p.status !== "archived")
    .map((p) => ({
      id: p.id,
      name: p.name,
      department: p.department,
      status: p.status,
      garment: p.garment,
      price: p.price,
      variants: p.variants.map((v) => ({
        sku: v.sku,
        colour: v.colour,
        size: v.size,
        stock: v.stock,
        hex: p.colours.find((c) => c.name === v.colour)?.hex ?? "#D8C3A5",
        image: imagesFor(p, v.colour)[0]?.url,
      })),
    }));
}
