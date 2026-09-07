"use client";

import { useEffect, useState } from "react";
import { ContractDocument } from "@/components/contract-document";
import { HomeBackButton } from "@/components/home-back-button";
import { buildContractContext, type ContractInputs } from "@/lib/contract";
import { readPrintPayload } from "@/lib/draft-store";
import { printClean } from "@/lib/print";
import { Button } from "@/components/ui/button";

type PrintState =
  | { status: "loading" }
  | { status: "ready"; inputs: ContractInputs }
  | { status: "empty" };

export default function PrintPage() {
  const [state, setState] = useState<PrintState>({ status: "loading" });

  useEffect(() => {
    const id = window.setTimeout(() => {
      const payload = readPrintPayload();
      if (payload) setState({ status: "ready", inputs: payload });
      else setState({ status: "empty" });
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (state.status !== "ready") return;
    let cancelled = false;

    const waitForLayout = async () => {
      try {
        await document.fonts.ready;
      } catch {
        /* ignore */
      }
      const deadline = Date.now() + 8000;
      while (!cancelled && Date.now() < deadline) {
        const ready =
          document.querySelectorAll('[data-paged-article="ready"]').length >= 3;
        if (ready) {
          await new Promise<void>((resolve) => {
            requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
          });
          return;
        }
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      }
    };

    void waitForLayout().then(() => {
      if (!cancelled) printClean();
    });
    return () => {
      cancelled = true;
    };
  }, [state]);

  if (state.status === "loading") {
    return (
      <main className="flex min-h-screen flex-col bg-white">
        <div className="no-print sticky top-0 z-10 flex items-center gap-3 border-b border-zinc-200 bg-white/95 px-4 py-3">
          <HomeBackButton />
        </div>
        <div className="flex flex-1 items-center justify-center p-8 text-sm text-zinc-600">
          กำลังเตรียมเอกสาร…
        </div>
      </main>
    );
  }

  if (state.status === "empty") {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col bg-white">
        <div className="no-print sticky top-0 z-10 flex items-center gap-3 border-b border-zinc-200 bg-white/95 px-4 py-3">
          <HomeBackButton />
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
          <h1 className="font-serif text-2xl text-zinc-900">
            ไม่พบข้อมูลสัญญาสำหรับพิมพ์
          </h1>
          <p className="text-sm text-zinc-600">
            กลับไปหน้าสร้างสัญญา แล้วกดปุ่มพิมพ์อีกครั้ง —
            ข้อมูลจะถูกส่งมาที่หน้านี้ชั่วคราว
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <HomeBackButton size="default" />
            <Button type="button" variant="outline" onClick={() => window.close()}>
              ปิดหน้าต่าง
            </Button>
          </div>
        </div>
      </main>
    );
  }

  const ctx = buildContractContext(state.inputs);

  return (
    <main className="print-root bg-white text-zinc-900">
      <div className="no-print sticky top-0 z-10 flex flex-col gap-2 border-b border-zinc-200 bg-white/95 px-4 py-3 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <HomeBackButton className="shrink-0" />
          <div className="min-w-0 text-sm text-zinc-700">
            <p>หากกล่องพิมพ์ไม่เปิดอัตโนมัติ ให้กดปุ่มพิมพ์ด้านขวา</p>
            <p className="mt-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-950">
              เลือกกระดาษ <span className="font-semibold">A4</span>{" "}
              ตั้งระยะขอบเป็นน้อยที่สุดหรือไม่มี
              และปิดหัวท้ายหน้าในหน้าต่างพิมพ์
            </p>
          </div>
        </div>
        <Button type="button" onClick={() => printClean()}>
          พิมพ์ / บันทึก PDF
        </Button>
      </div>
      <div className="print-document mx-auto max-w-[210mm] px-2 py-6 sm:px-4 print:max-w-none print:p-0">
        <ContractDocument ctx={ctx} />
      </div>
    </main>
  );
}
