"use client";

import { SheetSetup } from "@/components/sheet-setup";
import { SHEET_EDIT_URL } from "@/lib/sheets";

export function CentralLibrary() {
  return (
    <div className="mx-auto max-w-5xl space-y-4 px-4 py-6 sm:px-6">
      <div>
        <h1 className="text-lg font-semibold text-teal-950">คลังกลาง Google Sheet</h1>
        <p className="text-sm text-muted-foreground">
          สัญญาทั้งหมดอยู่ที่ชีต sck-contact ไม่ใช้เซิร์ฟเวอร์ Node
        </p>
      </div>
      <SheetSetup />
      <iframe
        title="Google Sheet คลังสัญญา"
        src={`${SHEET_EDIT_URL}&widget=true&headers=false`}
        className="h-[70vh] w-full rounded-xl border border-border bg-white"
      />
    </div>
  );
}
