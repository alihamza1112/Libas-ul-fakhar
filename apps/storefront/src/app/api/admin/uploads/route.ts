import { after } from "next/server";
import { isAdmin } from "@/lib/server/adminAuth";
import { MAX_UPLOAD_BYTES, storeUpload, UploadError } from "@/lib/server/media";
import { rateLimit } from "@/lib/server/rateLimit";
import { cleanupUploads } from "@/lib/server/store";

// One photo per request so the editor can show per-file progress and errors.
// (A route handler, not a server action: actions cap request bodies at 1 MB.)
export async function POST(req: Request) {
  if (!(await isAdmin())) return Response.json({ error: "Please sign in again." }, { status: 401 });
  if (!rateLimit("admin-upload", 120, 60_000)) return Response.json({ error: "Too many uploads at once. Wait a minute and retry." }, { status: 429 });
  const length = Number(req.headers.get("content-length") ?? 0);
  if (length > MAX_UPLOAD_BYTES + 64 * 1024) return Response.json({ error: "Photo is larger than 10 MB." }, { status: 413 });

  let file: FormDataEntryValue | null;
  try {
    file = (await req.formData()).get("file");
  } catch {
    return Response.json({ error: "Invalid upload." }, { status: 400 });
  }
  if (!(file instanceof File) || file.size === 0) return Response.json({ error: "No file received." }, { status: 400 });

  try {
    const image = await storeUpload(Buffer.from(await file.arrayBuffer()));
    after(() => cleanupUploads().catch(() => undefined)); // tidy abandoned uploads off the request path
    return Response.json({ image }, { status: 201 });
  } catch (e) {
    if (e instanceof UploadError) return Response.json({ error: e.message }, { status: 422 });
    console.error("[upload] failed", e);
    return Response.json({ error: "Could not process this photo." }, { status: 500 });
  }
}
