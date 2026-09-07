import { authorize, corsHeaders, json } from "@/lib/central-api";
import { readLibrary, replaceLibrary, saveContract } from "@/lib/central-db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

export function GET(request: Request) {
  if (!authorize(request)) {
    return json(request, { error: "รหัสคลังกลางไม่ถูกต้อง" }, 401);
  }
  return json(request, readLibrary());
}

export async function PUT(request: Request) {
  if (!authorize(request)) {
    return json(request, { error: "รหัสคลังกลางไม่ถูกต้อง" }, 401);
  }
  try {
    const body = await request.json();
    const snapshot = await replaceLibrary(body);
    return json(request, snapshot);
  } catch (error) {
    return json(
      request,
      { error: error instanceof Error ? error.message : "บันทึกคลังไม่สำเร็จ" },
      400
    );
  }
}

export async function POST(request: Request) {
  if (!authorize(request)) {
    return json(request, { error: "รหัสคลังกลางไม่ถูกต้อง" }, 401);
  }
  try {
    const body = await request.json();
    const snapshot = await saveContract(body);
    return json(request, snapshot);
  } catch (error) {
    return json(
      request,
      { error: error instanceof Error ? error.message : "บันทึกสัญญาไม่สำเร็จ" },
      400
    );
  }
}
