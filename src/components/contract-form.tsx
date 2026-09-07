"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ContractContext, ContractInputs } from "@/lib/contract";
import {
  POSITION_PRESETS,
  WORK_DAY_PRESETS,
  WORK_HOUR_PRESETS,
} from "@/lib/contract";
import { formatMoney } from "@/lib/thai";
import { cn } from "cn";
import { RotateCcw, Sparkles } from "lucide-react";

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
      {hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

function Chip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-2.5 py-1 text-xs transition-colors",
        active
          ? "border-teal-700 bg-teal-700 text-white"
          : "border-border bg-background text-foreground hover:bg-muted"
      )}
    >
      {children}
    </button>
  );
}

export function ContractForm({
  inputs,
  ctx,
  onChange,
  onFillSample,
  onReset,
}: {
  inputs: ContractInputs;
  ctx: ContractContext;
  onChange: <K extends keyof ContractInputs>(
    key: K,
    value: ContractInputs[K]
  ) => void;
  onFillSample?: () => void;
  onReset?: () => void;
}) {
  return (
    <div className="space-y-6">
      {onFillSample || onReset ? (
        <div className="flex gap-2">
          {onFillSample ? (
            <Button type="button" variant="outline" className="flex-1" onClick={onFillSample}>
              <Sparkles data-icon="inline-start" />
              ใส่ข้อมูลตัวอย่าง
            </Button>
          ) : null}
          {onReset ? (
            <Button type="button" variant="outline" className="flex-1" onClick={onReset}>
              <RotateCcw data-icon="inline-start" />
              ล้างฟอร์ม
            </Button>
          ) : null}
        </div>
      ) : null}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wide text-teal-800">
          ข้อมูลสัญญา
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="เลขที่สัญญา" htmlFor="contract_no">
            <Input
              id="contract_no"
              value={inputs.contract_no}
              onChange={(e) => onChange("contract_no", e.target.value)}
              placeholder="SC-2569-001"
            />
          </Field>
          <Field label="วันที่ทำสัญญา" htmlFor="contract_date">
            <Input
              id="contract_date"
              type="date"
              value={inputs.contract_date}
              onChange={(e) => onChange("contract_date", e.target.value)}
            />
          </Field>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wide text-teal-800">
          ผู้ว่าจ้าง
        </h2>
        <Field label="ชื่อหน่วยงาน / บริษัท" htmlFor="client_name">
          <Input
            id="client_name"
            value={inputs.client_name}
            onChange={(e) => onChange("client_name", e.target.value)}
            placeholder="บริษัท ลูกค้า จำกัด"
          />
        </Field>
        <Field label="ที่อยู่" htmlFor="client_address">
          <Textarea
            id="client_address"
            rows={3}
            value={inputs.client_address}
            onChange={(e) => onChange("client_address", e.target.value)}
            placeholder="เลขที่ ถนน แขวง เขต จังหวัด รหัสไปรษณีย์"
          />
        </Field>
        <Field label="ผู้มีอำนาจลงนาม" htmlFor="client_authorized">
          <Input
            id="client_authorized"
            value={inputs.client_authorized}
            onChange={(e) => onChange("client_authorized", e.target.value)}
            placeholder="ชื่อ-นามสกุล"
          />
        </Field>
        <Field label="ตำแหน่ง" htmlFor="client_position">
          <Input
            id="client_position"
            value={inputs.client_position}
            onChange={(e) => onChange("client_position", e.target.value)}
          />
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {POSITION_PRESETS.map((item) => (
              <Chip
                key={item}
                active={inputs.client_position === item}
                onClick={() => onChange("client_position", item)}
              >
                {item}
              </Chip>
            ))}
          </div>
        </Field>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wide text-teal-800">
          ระยะเวลาสัญญา
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="วันเริ่มสัญญา" htmlFor="start_date">
            <Input
              id="start_date"
              type="date"
              value={inputs.start_date}
              onChange={(e) => onChange("start_date", e.target.value)}
            />
          </Field>
          <Field
            label="จำนวนเดือน"
            htmlFor="contract_months"
            hint="วันสิ้นสุดคำนวณให้อัตโนมัติ"
          >
            <Input
              id="contract_months"
              type="number"
              min={1}
              max={120}
              value={inputs.contract_months}
              onChange={(e) => onChange("contract_months", e.target.value)}
            />
          </Field>
          <Field
            label="วันสิ้นสุดสัญญา"
            htmlFor="end_date"
            hint="แก้เองได้ ระบบจะปรับจำนวนเดือนให้"
          >
            <Input
              id="end_date"
              type="date"
              value={inputs.end_date}
              onChange={(e) => onChange("end_date", e.target.value)}
            />
          </Field>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wide text-teal-800">
          พนักงานและค่าบริการ
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="จำนวนพนักงาน (คน)" htmlFor="staff_count">
            <Input
              id="staff_count"
              type="number"
              min={1}
              value={inputs.staff_count}
              onChange={(e) => onChange("staff_count", e.target.value)}
            />
          </Field>
          <Field label="ค่าจ้างต่อคน (บาท/เดือน)" htmlFor="price_per_head">
            <Input
              id="price_per_head"
              inputMode="decimal"
              value={inputs.price_per_head}
              onChange={(e) => onChange("price_per_head", e.target.value)}
              placeholder="15000"
            />
          </Field>
        </div>
        <Field label="วันปฏิบัติงาน" htmlFor="work_days">
          <Input
            id="work_days"
            value={inputs.work_days}
            onChange={(e) => onChange("work_days", e.target.value)}
          />
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {WORK_DAY_PRESETS.map((item) => (
              <Chip
                key={item}
                active={inputs.work_days === item}
                onClick={() => onChange("work_days", item)}
              >
                {item}
              </Chip>
            ))}
          </div>
        </Field>
        <Field label="เวลาปฏิบัติงาน" htmlFor="work_hours">
          <Input
            id="work_hours"
            value={inputs.work_hours}
            onChange={(e) => onChange("work_hours", e.target.value)}
          />
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {WORK_HOUR_PRESETS.map((item) => (
              <Chip
                key={item}
                active={inputs.work_hours === item}
                onClick={() => onChange("work_hours", item)}
              >
                {item}
              </Chip>
            ))}
          </div>
        </Field>
        <Field
          label="ค่าล่วงเวลา (บาท/ชั่วโมง)"
          htmlFor="ot_rate"
          hint="ใช้ในหมายเหตุแนบท้ายสัญญา ข้อ 3"
        >
          <Input
            id="ot_rate"
            inputMode="decimal"
            value={inputs.ot_rate}
            onChange={(e) => onChange("ot_rate", e.target.value)}
          />
        </Field>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wide text-teal-800">
          เงื่อนไขข้อ 6 — อุปกรณ์
        </h2>
        <label className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-3">
          <Checkbox
            checked={inputs.include_equipment}
            onCheckedChange={(checked) =>
              onChange("include_equipment", Boolean(checked))
            }
            className="mt-0.5"
          />
          <span className="text-sm leading-6">
            <span className="font-medium">รวมค่าอุปกรณ์และน้ำยาในค่าจ้าง</span>
            <span className="mt-1 block text-muted-foreground">
              {ctx.equipment_clause}
            </span>
          </span>
        </label>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wide text-teal-800">
          ผู้ลงนามฝ่ายผู้รับจ้าง (ไม่บังคับ)
        </h2>
        <Field
          label="ชื่อผู้ลงนาม สั่งการ คลีน"
          htmlFor="contractor_authorized"
          hint="เว้นว่างได้ หากจะลงลายมือชื่อในเอกสารทีหลัง"
        >
          <Input
            id="contractor_authorized"
            value={inputs.contractor_authorized}
            onChange={(e) => onChange("contractor_authorized", e.target.value)}
          />
        </Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="พยานฝ่ายผู้ว่าจ้าง" htmlFor="witness_client">
            <Input
              id="witness_client"
              value={inputs.witness_client}
              onChange={(e) => onChange("witness_client", e.target.value)}
            />
          </Field>
          <Field label="พยานฝ่ายผู้รับจ้าง" htmlFor="witness_contractor">
            <Input
              id="witness_contractor"
              value={inputs.witness_contractor}
              onChange={(e) => onChange("witness_contractor", e.target.value)}
            />
          </Field>
        </div>
      </section>

      <section className="rounded-xl border border-teal-200 bg-teal-50/80 p-4">
        <h2 className="text-sm font-semibold text-teal-900">สรุปค่าบริการ</h2>
        <dl className="mt-3 space-y-1.5 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-teal-800">ค่าจ้างรายเดือน</dt>
            <dd className="font-semibold tabular-nums">
              {formatMoney(ctx.monthly_total_raw)} บาท
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-teal-800">
              ทั้งสัญญา ({ctx.contract_months || 0} เดือน)
            </dt>
            <dd className="font-semibold tabular-nums">
              {formatMoney(ctx.total_contract_price_raw)} บาท
            </dd>
          </div>
          <div className="flex justify-between gap-4 text-muted-foreground">
            <dt>VAT 7% (ยังไม่รวมในสัญญา)</dt>
            <dd className="tabular-nums">{formatMoney(ctx.vat_amount)} บาท</dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-teal-200 pt-2">
            <dt className="font-medium text-teal-900">รวม VAT</dt>
            <dd className="font-semibold tabular-nums">
              {formatMoney(ctx.total_with_vat)} บาท
            </dd>
          </div>
        </dl>
        {ctx.total_contract_price_raw > 0 ? (
          <p className="mt-2 text-xs leading-5 text-teal-800">
            ({ctx.total_price_text})
          </p>
        ) : null}
      </section>

      <p className="text-center text-xs text-muted-foreground">
        ร่างสัญญาบันทึกอัตโนมัติในเบราว์เซอร์นี้
      </p>
    </div>
  );
}
