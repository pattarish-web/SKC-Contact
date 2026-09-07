import { DEFAULT_TARGET, runAudit } from "@/lib/audit";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const target = url.searchParams.get("target") || DEFAULT_TARGET;
  const report = await runAudit(target);
  return NextResponse.json(report);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { target?: string };
  const report = await runAudit(body.target || DEFAULT_TARGET);
  return NextResponse.json(report);
}
