import { deleteAccount, endSession, getCustomer } from "@/lib/server/customers";

// Account deletion (FR-ACC-08). A route handler rather than a server action, so the
// client can do a full reload afterwards (clearing this account's data from the
// device) instead of the framework re-rendering a page the user can no longer see.
export async function POST(req: Request) {
  const c = await getCustomer();
  if (!c) return Response.json({ error: "Please sign in again." }, { status: 401 });
  const { confirm } = (await req.json().catch(() => ({}))) as { confirm?: string };
  if (String(confirm ?? "").trim().toUpperCase() !== "DELETE") return Response.json({ error: "Type DELETE to confirm." }, { status: 422 });
  await deleteAccount(c.id);
  await endSession();
  return Response.json({ ok: true });
}
