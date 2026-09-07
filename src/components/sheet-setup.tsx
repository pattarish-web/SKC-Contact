"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { withBasePath } from "@/lib/paths";
import {
  getSheetsWebAppUrl,
  getSheetsWriteToken,
  setSheetsWebAppUrl,
  setSheetsWriteToken,
  SHEET_EDIT_URL,
} from "@/lib/sheets";
import { ChevronDown, Copy, ExternalLink, Sheet } from "lucide-react";
import { useState } from "react";

export function SheetSetup({ onReady }: { onReady?: () => void }) {
  const [url, setUrl] = useState(() => getSheetsWebAppUrl());
  const [token, setToken] = useState(() =>
    typeof window === "undefined" ? "" : getSheetsWriteToken()
  );
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [changing, setChanging] = useState(false);
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
    setSheetsWriteToken(token);
    setUrl(getSheetsWebAppUrl());
    setSaved(true);
    setChanging(false);
    onReady?.();
  }

  if (writerReady && !changing) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-teal-200/80 bg-white px-3 py-2 text-xs shadow-sm">
        <span className="inline-flex min-w-0 items-center gap-2 font-medium text-teal-950">
          <Sheet className="size-3.5 shrink-0 text-teal-800" />
          เชื่อมคลังสัญญาแล้ว
        </span>
        <div className="flex items-center gap-3">
          <a
            className="inline-flex items-center gap-1 text-teal-800 underline-offset-2 hover:underline"
            href={SHEET_EDIT_URL}
            target="_blank"
            rel="noreferrer"
          >
            เปิดชีต
            <ExternalLink className="size-3" />
          </a>
          <button
            type="button"
            className="text-muted-foreground underline-offset-2 hover:underline"
            onClick={() => setChanging(true)}
          >
            เปลี่ยนการเชื่อมต่อ
          </button>
        </div>
      </div>
    );
  }

  return (
    <details
      open
      className="group rounded-lg border border-teal-200/80 bg-white text-xs shadow-sm"
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 [&::-webkit-details-marker]:hidden">
        <Sheet className="size-3.5 shrink-0 text-teal-800" />
        <span className="min-w-0 flex-1 truncate font-medium text-teal-950">
          ตั้งค่าคลังสัญญา
        </span>
        <a
          className="inline-flex shrink-0 items-center gap-1 text-teal-800 underline-offset-2 hover:underline"
          href={SHEET_EDIT_URL}
          target="_blank"
          rel="noreferrer"
          onClick={(event) => event.stopPropagation()}
        >
          เปิดชีต
          <ExternalLink className="size-3" />
        </a>
        <ChevronDown className="size-3.5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="space-y-2 border-t border-teal-100 px-3 py-2">
        <p className="text-muted-foreground">
          วางลิงก์เว็บแอปเมื่อต้องเปลี่ยนการเชื่อมต่อ ลิงก์ที่วางจะถูกใช้ก่อนค่าที่อบไว้ในแอป
        </p>
        <ol className="list-decimal space-y-0.5 pl-4 text-muted-foreground">
          <li>เปิดชีต → ส่วนขยาย → Apps Script</li>
          <li>วางสคริปต์จากปุ่มด้านล่าง แล้ว Deploy เป็น Web app / Anyone</li>
          <li>วางลิงก์ /exec ในช่องนี้</li>
          <li>ถ้าตั้ง WRITE_TOKEN ในสคริปต์ ให้วางรหัสในช่องรหัสเขียน</li>
        </ol>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => void copyScript()}
          >
            <Copy data-icon="inline-start" />
            {copied ? "คัดลอกแล้ว" : "คัดลอกสคริปต์"}
          </Button>
          {writerReady ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8"
              onClick={() => setChanging(false)}
            >
              ยกเลิก
            </Button>
          ) : null}
        </div>
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <Input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://script.google.com/macros/s/…/exec"
            className="h-8 text-xs"
          />
          <Button type="button" size="sm" className="h-8" onClick={saveUrl}>
            {saved ? "บันทึกแล้ว" : "ใช้ลิงก์นี้"}
          </Button>
        </div>
        <Input
          value={token}
          onChange={(event) => setToken(event.target.value)}
          placeholder="รหัสเขียนคลัง (ไม่บังคับ)"
          className="h-8 text-xs"
        />
      </div>
    </details>
  );
}
