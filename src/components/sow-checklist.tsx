"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatSowChecklist, parseSowChecklist } from "@/lib/contract";
import { useMemo, useState } from "react";

export function SowChecklist({
  label,
  hint,
  options,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  options: readonly string[];
  value: string;
  onChange: (next: string) => void;
}) {
  const parsed = useMemo(
    () => parseSowChecklist(value, options),
    [value, options]
  );
  const selected = new Set(parsed.selected);
  const [extraDraft, setExtraDraft] = useState<{
    value: string;
    text: string;
  } | null>(null);
  const extra =
    extraDraft && extraDraft.value === value ? extraDraft.text : parsed.extra;

  function commit(nextSelected: string[], nextExtra: string) {
    setExtraDraft(null);
    onChange(formatSowChecklist(nextSelected, nextExtra));
  }

  function toggle(option: string, checked: boolean) {
    const next = checked
      ? [...parsed.selected, option]
      : parsed.selected.filter((item) => item !== option);
    // Keep catalog order
    const ordered = options.filter((item) => next.includes(item));
    commit(ordered, extra);
  }

  function selectAll() {
    commit([...options], extra);
  }

  function clearAll() {
    commit([], extra);
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <Label className="text-sm font-medium">{label}</Label>
          {hint ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
          ) : null}
        </div>
        <div className="flex gap-1">
          <Button type="button" variant="outline" size="sm" onClick={selectAll}>
            เลือกทั้งหมด
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={clearAll}>
            ล้าง
          </Button>
        </div>
      </div>

      <div className="grid max-h-56 grid-cols-1 gap-1.5 overflow-y-auto rounded-xl border border-border bg-muted/20 p-3 sm:grid-cols-2">
        {options.map((option, index) => {
          const checked = selected.has(option);
          const id = `sow-${label.replace(/\s+/g, "-")}-${index}`;
          return (
            <label
              key={option}
              htmlFor={id}
              className="flex cursor-pointer items-start gap-2 rounded-lg px-1 py-0.5 text-sm leading-5 hover:bg-white/70"
            >
              <Checkbox
                id={id}
                checked={checked}
                onCheckedChange={(state) => toggle(option, Boolean(state))}
                className="mt-0.5"
              />
              <span>{option}</span>
            </label>
          );
        })}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor={`${label}-extra`} className="text-xs text-muted-foreground">
          เพิ่มรายการอื่น (ถ้ามี)
        </Label>
        <Input
          id={`${label}-extra`}
          value={extra}
          onChange={(e) => setExtraDraft({ value, text: e.target.value })}
          onBlur={() => commit(parsed.selected, extra)}
          placeholder="พิมพ์รายการเพิ่ม แล้วคลิกออกนอกช่องเพื่อบันทึก"
        />
      </div>
      <p className="text-[11px] text-muted-foreground">
        เลือกแล้ว {selected.size}/{options.length} รายการ
      </p>
    </div>
  );
}
