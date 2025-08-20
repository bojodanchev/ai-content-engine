export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST() { return new Response(JSON.stringify({ error: "blob disabled" }), { status: 404 }); }
// cleaned duplicates


