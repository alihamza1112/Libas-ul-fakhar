import { readMedia } from "@/lib/server/media";
import { IMAGE_ID } from "@/lib/productImages";

// Serves stored product photos. File names are random and never reused, so they
// can be cached forever; next/image resizes them to AVIF/WebP per device.
export async function GET(_req: Request, ctx: RouteContext<"/media/products/[file]">) {
  const { file } = await ctx.params;
  const id = file.replace(/\.webp$/, "");
  if (!file.endsWith(".webp") || !IMAGE_ID.test(id)) return new Response("Not found", { status: 404 });
  const data = await readMedia(id);
  if (!data) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(data), {
    headers: {
      "content-type": "image/webp",
      "cache-control": "public, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
    },
  });
}
