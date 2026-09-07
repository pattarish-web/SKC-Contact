"use client";

import { ContractDocument } from "@/components/contract-document";
import { Button } from "@/components/ui/button";
import { buildContractContext } from "@/lib/contract";
import { useContractDraft } from "@/lib/draft-store";
import { ArrowLeft, Printer } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

export default function PrintPage() {
  const [inputs] = useContractDraft();
  const ctx = useMemo(() => buildContractContext(inputs), [inputs]);

  return (
    <div className="min-h-full bg-neutral-200">
      <div className="no-print sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b bg-white px-4 py-3">
        <Link href="/" className="text-sm text-teal-800 hover:underline">
          <span className="inline-flex items-center gap-1">
            <ArrowLeft className="size-4" />
            กลับไปแก้สัญญา
          </span>
        </Link>
        <Button type="button" onClick={() => window.print()}>
          <Printer data-icon="inline-start" />
          พิมพ์ / บันทึก PDF
        </Button>
      </div>
      <div className="preview-frame mx-auto max-w-[210mm] p-4 sm:p-8">
        <ContractDocument ctx={ctx} />
      </div>
    </div>
  );
}
