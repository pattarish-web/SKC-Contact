"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { withBasePath } from "@/lib/paths";
import {
  getSheetsWebAppUrl,
  setSheetsWebAppUrl,
  SHEET_EDIT_URL,
} from "@/lib/sheets";
import { Copy, ExternalLink, Sheet } from "lucide-react";
import { useState } from "react";

export function SheetSetup({ onReady }: { onReady?: () => void }) {
  const [url, setUrl] = useState(() =>
    typeof window === "undefined" ? "" : getSheetsWebAppUrl()
  );
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const writerReady = Boolean(url.trim());

  async function copyScript() {
    const res = await fetch(withBasePath("/sheet-library.gs"), { cache: "no-store" });
    const text = await res.text();
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2500);
  }

  function saveUrl() {
    setSheetsWebAppUrl(url);
    setSaved(true);
    onReady?.();
    window.setTimeout(() => window.location.reload(), 300);
  }

  return (
    <div className="rounded-xl border border-teal-200 bg-white p-4 text-sm shadow-sm">
      <div className="flex items-start gap-2">
        <Sheet className="mt-0.5 size-4 text-teal-800" />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-teal-950">คลังกลางคือ Google Sheet</p>
          <p className="mt-1 text-muted-foreground">
            {writerReady
              ? "เครื่องนี้เขียนลงชีตได้แล้ว ทุกคนที่ใช้ลิงก์เว็บแอปเดียวกันเห็นสัญญาชุดเดียวกัน"
              : "อ่านชีตได้แล้ว แต่ยังบันทึกข้ามเครื่องไม่ได้ จนกว่าจะวางลิงก์เว็บแอปด้านล่าง"}
          </p>
          <a
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-teal-800 underline-offset-2 hover:underline"
            href={SHEET_EDIT_URL}
            target="_blank"
            rel="noreferrer"
          >
            เปิดชีต sck-contact
            <ExternalLink className="size-3" />
          </a>
        </div>
      </div>

      <ol className="mt-3 list-decimal space-y-1 pl-5 text-xs text-muted-foreground">
        <li>เปิดชีต แล้วไปที่ ส่วนขยาย → Apps Script</li>
        <li>ลบโค้ดเดิม แล้ววางสคริปต์จากปุ่มด้านล่าง</li>
        <li>Deploy → New deployment → ชนิด Web app</li>
        <li>Execute as: Me · Who has access: Anyone</li>
        <li>คัดลอกลิงก์เว็บแอปมาวางในช่องนี้</li>
      </ol>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          variant="outline"
          className="h-11 sm:h-8"
          onClick={() => void copyScript()}
        >
          <Copy data-icon="inline-start" />
          {copied ? "คัดลอกสคริปต์แล้ว" : "คัดลอกสคริปต์ Apps Script"}
        </Button>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
        <Input
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://script.google.com/macros/s/…/exec"
          className="h-11 sm:h-8"
        />
        <Button type="button" className="h-11 sm:h-8" onClick={saveUrl}>
          {saved ? "บันทึกแล้ว" : "ใช้ลิงก์นี้"}
        </Button>
      </div>
    </div>
  );
}
