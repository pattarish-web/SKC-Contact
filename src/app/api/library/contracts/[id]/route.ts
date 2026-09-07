import { authorize, corsHeaders, json } from "@/lib/central-api";
import { removeContract } from "@/lib/central-db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  if (!authorize(request)) {
    return json(request, { error: "รหัสคลังกลางไม่ถูกต้อง" }, 401);
  }
  const { id } = await context.params;
  const snapshot = await removeContract(id);
  return json(request, snapshot);
}
