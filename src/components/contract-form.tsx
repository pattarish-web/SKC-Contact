"use client";

import { AttachmentPanel } from "@/components/attachment-panel";
import { ConsumablesPanel } from "@/components/consumables-panel";
import { PresetField } from "@/components/preset-field";
import { SowChecklist } from "@/components/sow-checklist";
import { StaffRolesPanel } from "@/components/staff-roles-panel";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ContractContext, ContractInputs } from "@/lib/contract";
import {
  DEFAULT_SOW_ELECTRICAL,
  DEFAULT_SOW_SHARED_MATERIALS,
  DEFAULT_SOW_TOOLS,
  POSITION_PRESETS,
  SOW_ELECTRICAL_OPTIONS,
  SOW_SHARED_MATERIAL_OPTIONS,
  SOW_TOOL_OPTIONS,
  WORK_DAY_PRESETS,
  WORK_HOUR_PRESETS,
  peekNextContractNo,
} from "@/lib/contract";
import { formatMoney } from "@/lib/thai";
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

export function ContractForm({
  inputs,
  ctx,
  onChange,
  onFillSample,
  onReset,
  activeId,
  savedContractNos = [],
}: {
  inputs: ContractInputs;
  ctx: ContractContext;
  onChange: <K extends keyof ContractInputs>(
    key: K,
    value: ContractInputs[K]
  ) => void;
  onFillSample?: () => void;
  onReset?: () => void;
  activeId?: string | null;
  /** Used to preview the next number from saved contracts only. */
  savedContractNos?: readonly string[];
}) {
  return (
    <div className="space-y-6">
      {onFillSample || onReset ? (
        <div className="flex gap-2">
          {onFillSample ? (
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onFillSample}
            >
              <Sparkles data-icon="inline-start" />
              ใส่ข้อมูลตัวอย่าง
            </Button>
          ) : null}
          {onReset ? (
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onReset}
            >
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
          <Field
            label="เลขที่สัญญา"
            htmlFor="contract_no"
            hint="รูปแบบ SC-ปีพ.ศ.-เดือน-ลำดับ เช่น SC-2569-09-001"
          >
            <div className="flex gap-2">
              <Input
                id="contract_no"
                value={inputs.contract_no}
                onChange={(e) => onChange("contract_no", e.target.value)}
                placeholder="SC-2569-09-001"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() =>
                  onChange(
                    "contract_no",
                    peekNextContractNo(inputs.contract_date, savedContractNos)
                  )
                }
                title="แสดงเลขถัดไปจากสัญญาที่บันทึกแล้ว (ยังไม่จองจนกว่าจะกดบันทึก)"
              >
                เลขใหม่
              </Button>
            </div>
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
        <PresetField
          label="ตำแหน่ง"
          htmlFor="client_position"
          value={inputs.client_position}
          onChange={(value) => onChange("client_position", value)}
          builtins={POSITION_PRESETS}
          group="client_position"
          placeholder="เช่น ผู้จัดการฝ่ายอาคาร"
        />
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
        <StaffRolesPanel
          roles={inputs.staff_roles}
          onChange={(roles) => onChange("staff_roles", roles)}
        />
        <PresetField
          label="วันปฏิบัติงาน"
          htmlFor="work_days"
          value={inputs.work_days}
          onChange={(value) => onChange("work_days", value)}
          builtins={WORK_DAY_PRESETS}
          group="work_days"
          placeholder="เช่น จันทร์-พฤหัสบดี"
        />
        <PresetField
          label="เวลาปฏิบัติงาน"
          htmlFor="work_hours"
          value={inputs.work_hours}
          onChange={(value) => onChange("work_hours", value)}
          builtins={WORK_HOUR_PRESETS}
          group="work_hours"
          placeholder="เช่น 06.00-15.00 น."
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field
            label="ค่าล่วงเวลา (บาท/ชั่วโมง)"
            htmlFor="ot_rate"
            hint="หมายเหตุแนบท้าย ข้อ 3"
          >
            <Input
              id="ot_rate"
              inputMode="decimal"
              value={inputs.ot_rate}
              onChange={(e) => onChange("ot_rate", e.target.value)}
            />
          </Field>
          <Field
            label="ค่าบริการวันหยุดนักขัตฤกษ์ (บาท/คน/วัน)"
            htmlFor="holiday_rate"
            hint="เมื่อผู้ว่าจ้างต้องการให้ทำงานในวันหยุดนักขัตฤกษ์"
          >
            <Input
              id="holiday_rate"
              inputMode="decimal"
              value={inputs.holiday_rate}
              onChange={(e) => onChange("holiday_rate", e.target.value)}
            />
          </Field>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wide text-teal-800">
          เอกสารแนบท้าย 2 — ขอบเขตงาน / อุปกรณ์
        </h2>
        <Field
          label="ขอบเขตงาน (Scope of Work)"
          htmlFor="sow_scope"
          hint="รายละเอียดพื้นที่ ขั้นตอน และวิธีการทำความสะอาด"
        >
          <Textarea
            id="sow_scope"
            rows={4}
            value={inputs.sow_scope}
            onChange={(e) => onChange("sow_scope", e.target.value)}
            placeholder="เช่น ทำความสะอาดโถงทางเดิน ห้องน้ำ พื้นที่สำนักงาน ตามรอบเช้า-เย็น"
          />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              onChange("sow_tools", DEFAULT_SOW_TOOLS);
              onChange("sow_electrical", DEFAULT_SOW_ELECTRICAL);
              onChange("sow_shared_materials", DEFAULT_SOW_SHARED_MATERIALS);
            }}
          >
            ติ๊กรายการมาตรฐานทั้งหมด
          </Button>
        </div>
        <SowChecklist
          label="2.1 อุปกรณ์ / เครื่องมือทั่วไป"
          hint="ไม้กวาด ม็อบ ถัง แปรง ฯลฯ — ไม่รวมเครื่องใช้ไฟฟ้า"
          options={SOW_TOOL_OPTIONS}
          value={inputs.sow_tools}
          onChange={(next) => onChange("sow_tools", next)}
        />
        <SowChecklist
          label="2.2 เครื่องใช้ไฟฟ้า"
          hint="เครื่องดูดฝุ่น เครื่องขัดพื้น สายไฟ ฯลฯ"
          options={SOW_ELECTRICAL_OPTIONS}
          value={inputs.sow_electrical}
          onChange={(next) => onChange("sow_electrical", next)}
        />
        <SowChecklist
          label="2.3 วัสดุและน้ำยาที่ใช้ร่วมกัน"
          hint="วัสดุสิ้นเปลืองประจำวัน (ถุงขยะ/กระดาษชำระ) ดูที่ข้อวัสดุสิ้นเปลืองด้านล่าง"
          options={SOW_SHARED_MATERIAL_OPTIONS}
          value={inputs.sow_shared_materials}
          onChange={(next) => onChange("sow_shared_materials", next)}
        />
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
        <ConsumablesPanel
          items={inputs.consumables}
          onChange={(items) => onChange("consumables", items)}
        />
        {ctx.consumable_lines.length > 0 ? (
          <div className="rounded-lg border border-teal-100 bg-teal-50/60 px-3 py-2 text-xs leading-5 text-teal-950">
            <p className="font-medium">ข้อความที่จะปรากฏในสัญญา</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4">
              {ctx.consumable_lines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        ) : null}
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
        <div className="space-y-2">
          <PresetField
            label="ตำแหน่งผู้ลงนามฝ่ายผู้รับจ้าง"
            htmlFor="contractor_position"
            value={inputs.contractor_position}
            onChange={(value) => onChange("contractor_position", value)}
            builtins={POSITION_PRESETS}
            group="client_position"
            placeholder="เช่น ผู้จัดการ"
            hint="ใช้ตัวเลือกเดียวกับตำแหน่งผู้ว่าจ้างด้านบน หรือพิมพ์เองแล้วกดเพิ่ม"
          />
          {inputs.client_position.trim() &&
          inputs.client_position.trim() !== inputs.contractor_position.trim() ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                onChange("contractor_position", inputs.client_position.trim())
              }
            >
              ใช้ตำแหน่งผู้ว่าจ้างด้านบน ({inputs.client_position.trim()})
            </Button>
          ) : null}
        </div>
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
            <dt className="text-teal-800">
              พนักงานทั้งหมด ({ctx.staff_count || 0} คน · {ctx.staff_roles.length}{" "}
              ตำแหน่ง)
            </dt>
            <dd className="font-semibold tabular-nums">
              {formatMoney(ctx.monthly_total_raw)} บาท/เดือน
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

      <AttachmentPanel contractId={activeId ?? null} />

      <p className="text-center text-xs text-muted-foreground">
        ร่างสัญญาบันทึกอัตโนมัติในเบราว์เซอร์นี้
      </p>
    </div>
  );
}
