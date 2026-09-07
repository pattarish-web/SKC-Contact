"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createConsumable,
  createConsumableVariant,
  getConsumableKind,
  isQtyCompatibleWithKind,
  qtyMetaForKind,
  qtyPresetsForKind,
  sizePresetsForKind,
  type ConsumableKind,
  type ConsumableSpec,
} from "@/lib/contract";
import {
  addCustomPreset,
  listCustomPresets,
  mergePresets,
  removeCustomPreset,
  type PresetGroup,
} from "@/lib/presets-store";
import { cn } from "cn";
import { Plus, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

function MiniChip({
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
        "inline-flex items-center gap-0.5 rounded-full border text-[11px] transition-colors",
        active
          ? "border-teal-700 bg-teal-700 text-white"
          : "border-border bg-background text-foreground"
      )}
    >
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "px-2 py-0.5",
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
          className={cn(
            "mr-1 rounded-full p-0.5",
            active ? "hover:bg-teal-800" : "hover:bg-muted"
          )}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <X className="size-3" />
        </button>
      ) : null}
    </span>
  );
}

function usePresetOptions(
  group: PresetGroup,
  builtins: readonly string[],
  filter?: (value: string) => boolean
): {
  options: string[];
  customs: string[];
  add: (value: string) => void;
  remove: (value: string) => void;
} {
  const [customs, setCustoms] = useState<string[]>([]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setCustoms(listCustomPresets(group));
    }, 0);
    return () => window.clearTimeout(id);
  }, [group]);

  const options = useMemo(() => {
    const merged = mergePresets(builtins, customs);
    return filter ? merged.filter(filter) : merged;
  }, [builtins, customs, filter]);

  const visibleCustoms = useMemo(
    () => (filter ? customs.filter(filter) : customs),
    [customs, filter]
  );

  return {
    options,
    customs: visibleCustoms,
    add: (value: string) => setCustoms(addCustomPreset(group, value)),
    remove: (value: string) => setCustoms(removeCustomPreset(group, value)),
  };
}

function isBuiltin(item: ConsumableSpec): boolean {
  return item.id === "trash_bags" || item.id === "toilet_paper";
}

function presetGroupsForKind(kind: ConsumableKind): {
  size: PresetGroup;
  qty: PresetGroup;
} {
  switch (kind) {
    case "trash_bags":
      return { size: "trash_bag_size", qty: "trash_bag_qty" };
    case "toilet_paper":
      return { size: "toilet_paper_size", qty: "toilet_paper_qty" };
    default:
      return { size: "chemical_size", qty: "chemical_qty" };
  }
}

function SizeQtyEditor({
  size,
  quantity,
  sizeOptions,
  sizeCustoms,
  qtyOptions,
  qtyCustoms,
  sizePlaceholder,
  qtyPlaceholder,
  qtyLabel,
  qtyUnitHint,
  onSizeChange,
  onQtyChange,
  onAddSize,
  onRemoveSize,
  onAddQty,
  onRemoveQty,
}: {
  size: string;
  quantity: string;
  sizeOptions: string[];
  sizeCustoms: string[];
  qtyOptions: string[];
  qtyCustoms: string[];
  sizePlaceholder: string;
  qtyPlaceholder: string;
  qtyLabel: string;
  qtyUnitHint: string;
  onSizeChange: (value: string) => void;
  onQtyChange: (value: string) => void;
  onAddSize: () => void;
  onRemoveSize: (value: string) => void;
  onAddQty: () => void;
  onRemoveQty: (value: string) => void;
}) {
  const qtyRef = useRef<HTMLInputElement>(null);
  const canAddSize =
    size.trim().length > 0 && !sizeOptions.includes(size.trim());
  const canAddQty =
    quantity.trim().length > 0 &&
    quantity.trim() !== "กำหนดเอง" &&
    !qtyOptions.includes(quantity.trim());
  const isCustomQty =
    quantity.trim().length > 0 && !qtyOptions.includes(quantity.trim());

  function startCustomQty() {
    if (!isCustomQty) onQtyChange("");
    window.setTimeout(() => qtyRef.current?.focus(), 0);
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="grid gap-1.5">
        <Label>ขนาด</Label>
        <div className="flex gap-2">
          <Input
            value={size}
            onChange={(e) => onSizeChange(e.target.value)}
            placeholder={sizePlaceholder}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canAddSize}
            onClick={onAddSize}
            title="บันทึกขนาดนี้เป็นตัวเลือกถาวร"
          >
            <Plus data-icon="inline-start" />
            เพิ่ม
          </Button>
        </div>
        <div className="flex flex-wrap gap-1">
          {sizeOptions.map((option) => (
            <MiniChip
              key={option}
              active={size === option}
              onClick={() => onSizeChange(option)}
              onRemove={
                sizeCustoms.includes(option)
                  ? () => onRemoveSize(option)
                  : undefined
              }
            >
              {option}
            </MiniChip>
          ))}
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label>{qtyLabel}</Label>
        <div className="flex gap-2">
          <Input
            ref={qtyRef}
            value={quantity}
            onChange={(e) => onQtyChange(e.target.value)}
            placeholder={qtyPlaceholder}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canAddQty}
            onClick={onAddQty}
            title="บันทึกจำนวนนี้เป็นตัวเลือกถาวร"
          >
            <Plus data-icon="inline-start" />
            เพิ่ม
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">{qtyUnitHint}</p>
        <div className="flex flex-wrap gap-1">
          {qtyOptions.map((option) => (
            <MiniChip
              key={option}
              active={quantity === option}
              onClick={() => onQtyChange(option)}
              onRemove={
                qtyCustoms.includes(option)
                  ? () => onRemoveQty(option)
                  : undefined
              }
            >
              {option}
            </MiniChip>
          ))}
          <MiniChip active={isCustomQty} onClick={startCustomQty}>
            กำหนดเอง
          </MiniChip>
        </div>
      </div>
    </div>
  );
}

function KindEditors({
  kind,
  size,
  quantity,
  onSizeChange,
  onQtyChange,
}: {
  kind: ConsumableKind;
  size: string;
  quantity: string;
  onSizeChange: (value: string) => void;
  onQtyChange: (value: string) => void;
}) {
  const groups = presetGroupsForKind(kind);
  const meta = qtyMetaForKind(kind);
  const qtyFilter = useMemo(
    () => (value: string) => isQtyCompatibleWithKind(value, kind),
    [kind]
  );
  const sizes = usePresetOptions(groups.size, sizePresetsForKind(kind));
  const qtys = usePresetOptions(
    groups.qty,
    qtyPresetsForKind(kind),
    qtyFilter
  );

  return (
    <SizeQtyEditor
      size={size}
      quantity={quantity}
      sizeOptions={sizes.options}
      sizeCustoms={sizes.customs}
      qtyOptions={qtys.options}
      qtyCustoms={qtys.customs}
      sizePlaceholder={meta.sizePlaceholder}
      qtyPlaceholder={meta.placeholder}
      qtyLabel={meta.label}
      qtyUnitHint={meta.hint}
      onSizeChange={onSizeChange}
      onQtyChange={onQtyChange}
      onAddSize={() => sizes.add(size)}
      onRemoveSize={sizes.remove}
      onAddQty={() => qtys.add(quantity)}
      onRemoveQty={qtys.remove}
    />
  );
}

export function ConsumablesPanel({
  items,
  onChange,
}: {
  items: ConsumableSpec[];
  onChange: (items: ConsumableSpec[]) => void;
}) {
  const bagVariantSignature = items
    .filter((item) => getConsumableKind(item) === "trash_bags")
    .map((item) => `${item.id}:${item.variants?.length ?? 0}`)
    .join("|");

  useEffect(() => {
    const needsMigrate = items.some(
      (item) =>
        getConsumableKind(item) === "trash_bags" &&
        (!item.variants || item.variants.length === 0)
    );
    if (!needsMigrate) return;

    function migrate(item: ConsumableSpec): ConsumableSpec {
      if (getConsumableKind(item) !== "trash_bags") return item;
      if (item.variants && item.variants.length > 0) return item;
      return {
        ...item,
        variants: [
          createConsumableVariant({
            size: item.size || "30x40 นิ้ว",
            quantity: item.quantity || "ตามความเหมาะสม",
          }),
        ],
      };
    }

    const timer = window.setTimeout(() => {
      onChange(items.map(migrate));
    }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- migrate only when bag variant counts change
  }, [bagVariantSignature]);

  function patch(id: string, partial: Partial<ConsumableSpec>) {
    onChange(
      items.map((item) => (item.id === id ? { ...item, ...partial } : item))
    );
  }

  function remove(id: string) {
    onChange(items.filter((item) => item.id !== id));
  }

  function addCustom() {
    const name = window.prompt("ชื่อวัสดุที่ต้องการเพิ่ม", "น้ำยาฆ่าเชื้อ");
    if (!name?.trim()) return;
    onChange([
      ...items,
      createConsumable({
        name: name.trim(),
        enabled: true,
        size: "",
        quantity: "ตามความเหมาะสม",
        variants: [],
      }),
    ]);
  }

  function ensureTrashVariants(item: ConsumableSpec): ConsumableSpec {
    if (getConsumableKind(item) !== "trash_bags") return item;
    if (item.variants && item.variants.length > 0) return item;
    return {
      ...item,
      variants: [
        createConsumableVariant({
          size: item.size || "30x40 นิ้ว",
          quantity: item.quantity || "ตามความเหมาะสม",
        }),
      ],
    };
  }

  function addVariant(itemId: string) {
    onChange(
      items.map((item) => {
        if (item.id !== itemId) return item;
        const base = ensureTrashVariants(item);
        return {
          ...base,
          variants: [
            ...base.variants,
            createConsumableVariant({
              size: "",
              quantity: "ตามความเหมาะสม",
            }),
          ],
        };
      })
    );
  }

  function patchVariant(
    itemId: string,
    variantId: string,
    partial: Partial<{ size: string; quantity: string }>
  ) {
    onChange(
      items.map((item) =>
        item.id === itemId
          ? {
              ...ensureTrashVariants(item),
              variants: ensureTrashVariants(item).variants.map((v) =>
                v.id === variantId ? { ...v, ...partial } : v
              ),
            }
          : item
      )
    );
  }

  function removeVariant(itemId: string, variantId: string) {
    onChange(
      items.map((item) => {
        if (item.id !== itemId) return item;
        const base = ensureTrashVariants(item);
        if (base.variants.length <= 1) return base;
        return {
          ...base,
          variants: base.variants.filter((v) => v.id !== variantId),
        };
      })
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-medium text-teal-900">
          ถุงขยะ / กระดาษชำระ และวัสดุแยก
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          หน่วยจำนวนแยกตามชนิดวัสดุ — ถุงขยะใช้ใบหรือแพ็ค/เดือน, กระดาษชำระใช้แพ็คหรือม้วน/เดือน,
          น้ำยาใช้ขวดหรือแกลลอน/เดือน กด “กำหนดเอง” เพื่อพิมพ์เองแล้วกด “เพิ่ม”
          เพื่อเก็บเป็นตัวเลือกถาวร
        </p>
      </div>

      {items.map((rawItem) => {
        const item = ensureTrashVariants(rawItem);
        const kind = getConsumableKind(item);
        const multiSize = kind === "trash_bags";

        return (
          <div
            key={item.id}
            className="space-y-3 rounded-xl border border-border bg-muted/30 p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <label className="flex min-w-0 flex-1 items-start gap-2">
                <Checkbox
                  checked={item.enabled}
                  onCheckedChange={(checked) => {
                    const enabled = Boolean(checked);
                    if (kind === "trash_bags" && enabled) {
                      patch(item.id, {
                        enabled,
                        variants: ensureTrashVariants(item).variants,
                      });
                    } else {
                      patch(item.id, { enabled });
                    }
                  }}
                  className="mt-0.5"
                />
                <span className="min-w-0 flex-1">
                  {isBuiltin(item) ? (
                    <span className="text-sm font-medium">{item.name}</span>
                  ) : (
                    <Input
                      value={item.name}
                      onChange={(e) => patch(item.id, { name: e.target.value })}
                      className="h-8"
                    />
                  )}
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {item.enabled
                      ? multiSize
                        ? `ผู้รับจ้างจัดหา · ${item.variants.length} ขนาดในสัญญานี้`
                        : "ผู้รับจ้างจัดหาให้อยู่ในสัญญา"
                      : "ไม่รวม — ผู้ว่าจ้างจัดหาเอง"}
                  </span>
                </span>
              </label>
              {!isBuiltin(item) ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => remove(item.id)}
                  aria-label={`ลบ ${item.name}`}
                >
                  <Trash2 />
                </Button>
              ) : null}
            </div>

            {item.enabled && multiSize ? (
              <div className="space-y-3">
                {item.variants.map((variant, index) => (
                  <div
                    key={variant.id}
                    className="space-y-2 rounded-lg border border-teal-200/80 bg-white p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-teal-900">
                        ขนาดถุงขยะที่ {index + 1}
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        disabled={item.variants.length <= 1}
                        onClick={() => removeVariant(item.id, variant.id)}
                        aria-label="ลบขนาด"
                      >
                        <Trash2 />
                      </Button>
                    </div>
                    <KindEditors
                      kind="trash_bags"
                      size={variant.size}
                      quantity={variant.quantity}
                      onSizeChange={(value) =>
                        patchVariant(item.id, variant.id, { size: value })
                      }
                      onQtyChange={(value) =>
                        patchVariant(item.id, variant.id, { quantity: value })
                      }
                    />
                  </div>
                ))}
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={() => addVariant(item.id)}
                >
                  <Plus data-icon="inline-start" />
                  เพิ่มขนาดถุงขยะอีกขนาด
                </Button>
              </div>
            ) : null}

            {item.enabled && !multiSize ? (
              <KindEditors
                kind={kind}
                size={item.size}
                quantity={item.quantity}
                onSizeChange={(value) => patch(item.id, { size: value })}
                onQtyChange={(value) => patch(item.id, { quantity: value })}
              />
            ) : null}
          </div>
        );
      })}

      <Button type="button" variant="outline" size="sm" onClick={addCustom}>
        <Plus data-icon="inline-start" />
        เพิ่มวัสดุอื่น
      </Button>
    </div>
  );
}
