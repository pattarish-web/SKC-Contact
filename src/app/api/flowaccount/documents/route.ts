import {
  buildFlowAccountDocument,
  flowAccountEndpoint,
  type FlowAccountDocType,
} from "@/lib/flowaccount";
import { buildContractContext, type ContractInputs } from "@/lib/contract";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function apiBase(): string {
  return (
    process.env.FLOWACCOUNT_API_BASE?.replace(/\/$/, "") ||
    "https://openapi.flowaccount.com/test"
  );
}

function hasCredentials(): boolean {
  return Boolean(
    process.env.FLOWACCOUNT_CLIENT_ID && process.env.FLOWACCOUNT_CLIENT_SECRET
  );
}

async function getAccessToken(): Promise<string> {
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    scope: "flowaccount-api",
    client_id: process.env.FLOWACCOUNT_CLIENT_ID ?? "",
    client_secret: process.env.FLOWACCOUNT_CLIENT_SECRET ?? "",
  });

  const response = await fetch(`${apiBase()}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const data = (await response.json()) as {
    access_token?: string;
    message?: string;
    error?: string;
  };

  if (!response.ok || !data.access_token) {
    throw new Error(
      data.message || data.error || `ขอ token จาก FlowAccount ไม่สำเร็จ (${response.status})`
    );
  }

  return data.access_token;
}

export async function GET() {
  return NextResponse.json({
    configured: hasCredentials(),
    base: hasCredentials() ? apiBase() : null,
  });
}

export async function POST(request: Request) {
  const payload = (await request.json()) as {
    docType?: FlowAccountDocType;
    inputs?: ContractInputs;
  };

  const docType = payload.docType === "billing-note" ? "billing-note" : "quotation";
  if (!payload.inputs) {
    return NextResponse.json({ error: "ไม่มีข้อมูลสัญญา" }, { status: 400 });
  }

  const ctx = buildContractContext(payload.inputs);
  if (!ctx.client_name || ctx.monthly_total_raw <= 0) {
    return NextResponse.json(
      { error: "กรอกชื่อลูกค้า จำนวนพนักงาน และค่าจ้างให้ครบก่อนออกเอกสาร" },
      { status: 400 }
    );
  }

  const document = buildFlowAccountDocument(ctx, docType);

  if (!hasCredentials()) {
    return NextResponse.json({
      ok: false,
      configured: false,
      document,
      hint: "ยังไม่ได้ตั้ง FLOWACCOUNT_CLIENT_ID / FLOWACCOUNT_CLIENT_SECRET — ใช้คำสั่ง Claude MCP แทนได้",
    });
  }

  try {
    const token = await getAccessToken();
    const endpoint = `${apiBase()}${flowAccountEndpoint(docType)}`;
    const created = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(document),
    });

    const result = (await created.json()) as Record<string, unknown>;
    if (!created.ok) {
      return NextResponse.json(
        {
          ok: false,
          configured: true,
          error:
            (typeof result.message === "string" && result.message) ||
            "สร้างเอกสารใน FlowAccount ไม่สำเร็จ",
          result,
        },
        { status: created.status }
      );
    }

    return NextResponse.json({ ok: true, configured: true, result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "เชื่อม FlowAccount ไม่สำเร็จ";
    return NextResponse.json(
      { ok: false, configured: true, error: message },
      { status: 502 }
    );
  }
}
