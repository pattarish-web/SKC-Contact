"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  addCustomPreset,
  listCustomPresets,
  mergePresets,
  removeCustomPreset,
  type PresetGroup,
} from "@/lib/presets-store";
import { cn } from "cn";
import { Plus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

function Chip({
  active,
  children,
  onClick,
  onRemove,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
  onRemove?: () => void;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full border text-xs transition-colors",
        active
          ? "border-teal-700 bg-teal-700 text-white"
          : "border-border bg-background text-foreground"
      )}
    >
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "px-2.5 py-1",
          onRemove ? "pr-1" : "",
          !active && "hover:bg-muted rounded-full"
        )}
      >
        {children}
      </button>
      {onRemove ? (
        <button
          type="button"
          aria-label="ลบตัวเลือก"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className={cn(
            "mr-1 rounded-full p-0.5",
            active ? "hover:bg-teal-800" : "hover:bg-muted"
          )}
        >
          <X className="size-3" />
        </button>
      ) : null}
    </span>
  );
}

export function PresetField({
  label,
  htmlFor,
  hint,
  value,
  onChange,
  builtins,
  group,
  placeholder,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  builtins: readonly string[];
  group: PresetGroup;
  placeholder?: string;
}) {
  const [customs, setCustoms] = useState<string[]>([]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setCustoms(listCustomPresets(group));
    }, 0);
    return () => window.clearTimeout(id);
  }, [group]);

  const options = useMemo(
    () => mergePresets(builtins, customs),
    [builtins, customs]
  );

  const trimmed = value.trim();
  const canAdd =
    trimmed.length > 0 &&
    !options.some((item) => item === trimmed);

  function handleAdd() {
    if (!canAdd) return;
    const next = addCustomPreset(group, trimmed);
    setCustoms(next);
    onChange(trimmed);
  }

  function handleRemove(item: string) {
    const next = removeCustomPreset(group, item);
    setCustoms(next);
  }

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      <div className="flex gap-2">
        <Input
          id={htmlFor}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e) => {
            if (e.key === "Enter" && canAdd) {
              e.preventDefault();
              handleAdd();
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!canAdd}
          onClick={handleAdd}
          title="บันทึกค่าที่พิมพ์เป็นตัวเลือกใหม่"
        >
          <Plus data-icon="inline-start" />
          เพิ่ม
        </Button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((item) => {
          const isCustom = customs.includes(item);
          return (
            <Chip
              key={item}
              active={value === item}
              onClick={() => onChange(item)}
              onRemove={isCustom ? () => handleRemove(item) : undefined}
            >
              {item}
            </Chip>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        {hint ||
          "พิมพ์ค่าเองในช่องด้านบน หรือกด “เพิ่ม” เพื่อเก็บเป็นตัวเลือกถาวร"}
      </p>
    </div>
  );
}
