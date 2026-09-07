"use client";

import { useEffect, useState } from "react";
import { ContractDocument } from "@/components/contract-document";
import { buildContractContext, type ContractInputs } from "@/lib/contract";
import { readPrintPayload } from "@/lib/draft-store";
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
    const id = window.setTimeout(() => window.print(), 350);
    return () => window.clearTimeout(id);
  }, [state]);

  if (state.status === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white p-8 text-sm text-zinc-600">
        กำลังเตรียมเอกสาร…
      </main>
    );
  }

  if (state.status === "empty") {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-4 bg-white p-8 text-center">
        <h1 className="font-serif text-2xl text-zinc-900">
          ไม่พบข้อมูลสัญญาสำหรับพิมพ์
        </h1>
        <p className="text-sm text-zinc-600">
          กลับไปหน้าสร้างสัญญา แล้วกดปุ่มพิมพ์อีกครั้ง — ข้อมูลจะถูกส่งมาที่หน้านี้ชั่วคราว
        </p>
        <Button type="button" onClick={() => window.close()}>
          ปิดหน้าต่าง
        </Button>
      </main>
    );
  }

  const ctx = buildContractContext(state.inputs);

  return (
    <main className="print-root bg-white text-zinc-900">
      <div className="no-print sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-zinc-200 bg-white/95 px-4 py-3 backdrop-blur">
        <p className="text-sm text-zinc-600">
          หากกล่องพิมพ์ไม่เปิดอัตโนมัติ ให้กดปุ่มพิมพ์ด้านขวา
        </p>
        <Button type="button" onClick={() => window.print()}>
          พิมพ์ / บันทึก PDF
        </Button>
      </div>
      <div className="mx-auto max-w-[210mm] px-2 py-6 sm:px-4">
        <ContractDocument ctx={ctx} />
      </div>
    </main>
  );
}
