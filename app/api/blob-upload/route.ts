// Removed: no longer needed; using pre-signed PUT URL flow
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST() { return new Response(JSON.stringify({ error: "deprecated" }), { status: 404 }); }


