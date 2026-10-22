import { exportData, getCustomer } from "@/lib/server/customers";

// Data export on request (FR-ACC-08).
export async function GET() {
  const c = await getCustomer();
  if (!c) return new Response("Not signed in", { status: 401 });
  return new Response(JSON.stringify(await exportData(c), null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="libas-ul-fakhar-my-data.json"`,
      "cache-control": "private, no-store",
    },
  });
}
