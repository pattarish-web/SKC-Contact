"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ContractContext, ContractInputs } from "@/lib/contract";
import {
  buildClaudeMcpPrompt,
  DOC_TYPE_LABEL,
  FLOWACCOUNT_CLAUDE_GUIDE,
  FLOWACCOUNT_MCP_URL,
  type FlowAccountDocType,
} from "@/lib/flowaccount";
import { Check, Copy, ExternalLink, LoaderCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function FlowAccountPanel({
  inputs,
  ctx,
  onChange,
  canCreate,
}: {
  inputs: ContractInputs;
  ctx: ContractContext;
  onChange: <K extends keyof ContractInputs>(
    key: K,
    value: ContractInputs[K]
  ) => void;
  canCreate: boolean;
}) {
  const [docType, setDocType] = useState<FlowAccountDocType>("quotation");
  const [copied, setCopied] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const prompt = useMemo(
    () => buildClaudeMcpPrompt(ctx, docType),
    [ctx, docType]
  );

  useEffect(() => {
    let cancelled = false;
    fetch("/api/flowaccount/documents")
      .then((res) => res.json())
      .then((data: { configured?: boolean }) => {
        if (!cancelled) setConfigured(Boolean(data.configured));
      })
      .catch(() => {
        if (!cancelled) setConfigured(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function copyPrompt() {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function createViaApi() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/flowaccount/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docType, inputs }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        configured?: boolean;
        error?: string;
        hint?: string;
        result?: { data?: { documentSerial?: string; recordId?: number } };
      };
      if (!data.configured) {
        setMessage(
          "ยังไม่ได้ใส่รหัส Open API — คัดลอกคำสั่งด้านล่างไปวางใน Claude ที่เชื่อม FlowAccount MCP แล้วได้เลย"
        );
        return;
      }
      if (!res.ok || !data.ok) {
        setError(data.error || "สร้างเอกสารไม่สำเร็จ");
        return;
      }
      const serial = data.result?.data?.documentSerial;
      setMessage(
        serial
          ? `สร้างเอกสารใน FlowAccount แล้ว เลขที่ ${serial}`
          : "สร้างเอกสารใน FlowAccount แล้ว เปิดระบบบัญชีเพื่อตรวจเลขที่เอกสาร"
      );
    } catch {
      setError("เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold tracking-wide text-teal-800">
        FlowAccount — ออกบิลจากสัญญา
      </h2>
      <p className="text-xs leading-5 text-muted-foreground">
        สร้างใบเสนอราคาหรือใบวางบิลจากข้อมูลสัญญานี้ ผ่าน Claude + FlowAccount AI
        Connector (MCP) หรือผ่าน Open API ถ้าตั้งรหัสไว้แล้ว
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="เลขผู้เสียภาษีลูกค้า" htmlFor="client_tax_id">
          <Input
            id="client_tax_id"
            value={inputs.client_tax_id}
            onChange={(e) => onChange("client_tax_id", e.target.value)}
            placeholder="010xxxxxxxxxx"
          />
        </Field>
        <Field label="สาขา" htmlFor="client_branch">
          <Input
            id="client_branch"
            value={inputs.client_branch}
            onChange={(e) => onChange("client_branch", e.target.value)}
            placeholder="สำนักงานใหญ่"
          />
        </Field>
        <Field label="อีเมลบัญชี" htmlFor="client_email">
          <Input
            id="client_email"
            type="email"
            value={inputs.client_email}
            onChange={(e) => onChange("client_email", e.target.value)}
          />
        </Field>
        <Field label="โทรศัพท์" htmlFor="client_phone">
          <Input
            id="client_phone"
            value={inputs.client_phone}
            onChange={(e) => onChange("client_phone", e.target.value)}
          />
        </Field>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {(Object.keys(DOC_TYPE_LABEL) as FlowAccountDocType[]).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setDocType(type)}
            className={
              docType === type
                ? "rounded-full border border-teal-700 bg-teal-700 px-2.5 py-1 text-xs text-white"
                : "rounded-full border border-border bg-background px-2.5 py-1 text-xs hover:bg-muted"
            }
          >
            {DOC_TYPE_LABEL[type]}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          className="flex-1"
          onClick={copyPrompt}
          disabled={!canCreate}
        >
          {copied ? (
            <Check data-icon="inline-start" />
          ) : (
            <Copy data-icon="inline-start" />
          )}
          {copied ? "คัดลอกคำสั่งแล้ว" : "คัดลอกคำสั่งไป Claude"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={createViaApi}
          disabled={!canCreate || busy}
        >
          {busy ? (
            <LoaderCircle data-icon="inline-start" className="animate-spin" />
          ) : null}
          {configured ? "สร้างใน FlowAccount" : "ลองสร้างผ่าน Open API"}
        </Button>
      </div>

      {message ? (
        <p className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-xs text-teal-950">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-950">
          {error}
        </p>
      ) : null}

      <details className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs leading-5">
        <summary className="cursor-pointer font-medium text-teal-900">
          วิธีเชื่อม FlowAccount กับ Claude
        </summary>
        <ol className="mt-2 list-decimal space-y-1 pl-4 text-muted-foreground">
          <li>เปิด Claude.ai แล้วไปที่ Settings → Connectors</li>
          <li>กด Add custom connector</li>
          <li>
            ใส่ URL{" "}
            <code className="rounded bg-white px-1">{FLOWACCOUNT_MCP_URL}</code>
          </li>
          <li>ล็อกอิน FlowAccount แล้วเลือกบริษัท สั่งการ คลีน</li>
          <li>กลับมาที่แชท วางคำสั่งที่คัดลอกจากปุ่มด้านบน</li>
        </ol>
        <p className="mt-2">
          <a
            href={FLOWACCOUNT_CLAUDE_GUIDE}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-medium text-teal-800 underline-offset-2 hover:underline"
          >
            คู่มืออย่างเป็นทางการ
            <ExternalLink className="size-3" />
          </a>
        </p>
      </details>

      <pre className="max-h-48 overflow-auto rounded-lg bg-neutral-950 p-3 text-[11px] leading-5 whitespace-pre-wrap text-neutral-100">
        {prompt}
      </pre>
    </section>
  );
}
