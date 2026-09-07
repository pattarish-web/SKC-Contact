"use client";

import { BrandMark } from "@/components/brand-mark";
import { ContractDocument } from "@/components/contract-document";
import { ContractForm } from "@/components/contract-form";
import { Button } from "@/components/ui/button";
import { COMPANY } from "@/lib/company";
import {
  buildContractContext,
  missingRequiredFields,
  nextContractNo,
  SAMPLE_INPUTS,
  type ContractInputs,
} from "@/lib/contract";
import { clearDraft, useContractDraft } from "@/lib/draft-store";
import { appPath } from "@/lib/paths";
import { endDateFromStart, monthsFromRange } from "@/lib/thai";
import { FileText, Printer, RotateCcw, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

type MobilePane = "form" | "preview";

export function ContractApp() {
  const [inputs, setInputs] = useContractDraft();
  const [pane, setPane] = useState<MobilePane>("form");

  const ctx = useMemo(() => buildContractContext(inputs), [inputs]);
  const missing = useMemo(() => missingRequiredFields(inputs), [inputs]);

  function update<K extends keyof ContractInputs>(
    key: K,
    value: ContractInputs[K]
  ) {
    setInputs((prev) => {
      const next = { ...prev, [key]: value };

      if (key === "start_date") {
        const months = Number(next.contract_months) || 12;
        next.end_date = endDateFromStart(String(value), months);
      }

      if (key === "contract_months") {
        const months = Number(value) || 0;
        if (next.start_date && months > 0) {
          next.end_date = endDateFromStart(next.start_date, months);
        }
      }

      if (key === "end_date" && next.start_date && value) {
        next.contract_months = String(
          monthsFromRange(next.start_date, String(value))
        );
      }

      return next;
    });
  }

  function resetForm() {
    if (!window.confirm("ล้างข้อมูลที่กรอกทั้งหมด และเริ่มสัญญาใหม่?")) {
      return;
    }
    clearDraft();
  }

  function fillSample() {
    setInputs({
      ...SAMPLE_INPUTS,
      contract_no: nextContractNo(inputs.contract_no),
    });
  }

  function printContract() {
    window.open(appPath("/print"), "_blank");
  }

  return (
    <div className="min-h-full bg-[oklch(0.97_0.01_175)]">
      <header className="no-print sticky top-0 z-20 border-b border-teal-900/10 bg-[oklch(0.99_0.01_175)]/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] items-center gap-3 px-4 py-3 sm:px-6">
          <BrandMark className="size-10" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-teal-950 sm:text-base">
              {COMPANY.shortName}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              จัดทำสัญญาบริการทำความสะอาด
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={fillSample}>
              <Sparkles data-icon="inline-start" />
              ตัวอย่าง
            </Button>
            <Button variant="outline" size="sm" onClick={resetForm}>
              <RotateCcw data-icon="inline-start" />
              ล้างฟอร์ม
            </Button>
            <Button size="sm" onClick={printContract}>
              <Printer data-icon="inline-start" />
              พิมพ์ / บันทึก PDF
            </Button>
          </div>
        </div>
      </header>

      <div className="app-shell mx-auto grid max-w-[1600px] grid-cols-1 gap-6 px-4 py-4 lg:grid-cols-[minmax(320px,420px)_minmax(0,1fr)] lg:items-start lg:px-6 lg:py-6">
        <div className="no-print flex gap-2 lg:hidden">
          <Button
            variant={pane === "form" ? "default" : "outline"}
            className="flex-1"
            onClick={() => setPane("form")}
          >
            <FileText data-icon="inline-start" />
            กรอกข้อมูล
          </Button>
          <Button
            variant={pane === "preview" ? "default" : "outline"}
            className="flex-1"
            onClick={() => setPane("preview")}
          >
            ดูสัญญา
          </Button>
        </div>

        {missing.length > 0 ? (
          <div className="no-print rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-950 lg:col-span-2">
            ยังไม่ได้กรอก: {missing.join(" · ")}
          </div>
        ) : (
          <div className="no-print rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-xs text-teal-950 lg:col-span-2">
            ข้อมูลครบแล้ว พร้อมพิมพ์สัญญาได้ · ร่างถูกบันทึกในเบราว์เซอร์นี้
          </div>
        )}

        <aside
          className={`no-print rounded-2xl border border-border bg-white p-4 shadow-sm sm:p-5 ${
            pane === "form" ? "block" : "hidden lg:block"
          }`}
        >
          <ContractForm
            inputs={inputs}
            ctx={ctx}
            onChange={update}
            onFillSample={fillSample}
            onReset={resetForm}
          />
        </aside>

        <section
          className={`print-visible space-y-3 ${
            pane === "preview" ? "block" : "hidden lg:block"
          }`}
        >
          <div className="no-print flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-teal-900">
              ตัวอย่างสัญญา
            </h2>
            <p className="text-xs text-muted-foreground">
              2 หน้า · A4 · กดพิมพ์จะเปิดหน้าสัญญาใหม่ แล้วเลือก Save as PDF
            </p>
          </div>
          <div className="preview-frame overflow-auto rounded-2xl border border-border bg-neutral-200/70 p-3 sm:p-6">
            <ContractDocument ctx={ctx} />
          </div>
        </section>
      </div>

      <div className="no-print sticky bottom-0 z-20 border-t border-border bg-white/95 p-3 backdrop-blur md:hidden">
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={fillSample}>
            ตัวอย่าง
          </Button>
          <Button className="flex-1" onClick={printContract}>
            <Printer data-icon="inline-start" />
            พิมพ์สัญญา
          </Button>
        </div>
      </div>
    </div>
  );
}
