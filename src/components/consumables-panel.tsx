"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createConsumable,
  createConsumableVariant,
  QUANTITY_PRESETS,
  TOILET_PAPER_SIZE_PRESETS,
  TRASH_BAG_SIZE_PRESETS,
  type ConsumableSpec,
} from "@/lib/contract";
import { cn } from "cn";
import { Plus, Trash2 } from "lucide-react";

function MiniChip({
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
        "rounded-full border px-2 py-0.5 text-[11px] transition-colors",
        active
          ? "border-teal-700 bg-teal-700 text-white"
          : "border-border bg-background text-foreground hover:bg-muted"
      )}
    >
      {children}
    </button>
  );
}

function isTrashBags(item: ConsumableSpec): boolean {
  return item.id === "trash_bags" || item.name.includes("ถุงขยะ");
}

function isBuiltin(item: ConsumableSpec): boolean {
  return item.id === "trash_bags" || item.id === "toilet_paper";
}

function sizePresetsFor(item: ConsumableSpec): readonly string[] {
  if (isTrashBags(item)) return TRASH_BAG_SIZE_PRESETS;
  if (item.id === "toilet_paper" || item.name.includes("กระดาษ")) {
    return TOILET_PAPER_SIZE_PRESETS;
  }
  return [];
}

export function ConsumablesPanel({
  items,
  onChange,
}: {
  items: ConsumableSpec[];
  onChange: (items: ConsumableSpec[]) => void;
}) {
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

  function addVariant(itemId: string) {
    onChange(
      items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              variants: [
                ...item.variants,
                createConsumableVariant({
                  size: "",
                  quantity: "ตามความเหมาะสม",
                }),
              ],
            }
          : item
      )
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
              ...item,
              variants: item.variants.map((v) =>
                v.id === variantId ? { ...v, ...partial } : v
              ),
            }
          : item
      )
    );
  }

  function removeVariant(itemId: string, variantId: string) {
    onChange(
      items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              variants: item.variants.filter((v) => v.id !== variantId),
            }
          : item
      )
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-medium text-teal-900">
          ถุงขยะ / กระดาษชำระ และวัสดุแยก
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          ติ๊กว่าให้ผู้รับจ้างจัดหา แล้วใส่ขนาดกับจำนวนได้เอง (จำนวนต่อเดือน
          หรือข้อความเช่น “ตามความเหมาะสม”) — ถุงขยะเพิ่มได้หลายขนาดในสัญญาเดียว
        </p>
      </div>

      {items.map((item) => {
        const sizes = sizePresetsFor(item);
        const multiSize = isTrashBags(item);
        return (
          <div
            key={item.id}
            className="space-y-3 rounded-xl border border-border bg-muted/30 p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <label className="flex min-w-0 flex-1 items-start gap-2">
                <Checkbox
                  checked={item.enabled}
                  onCheckedChange={(checked) =>
                    patch(item.id, { enabled: Boolean(checked) })
                  }
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
                      ? "ผู้รับจ้างจัดหาให้อยู่ในสัญญา"
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
                    className="space-y-2 rounded-lg border border-border/70 bg-white p-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium text-teal-900">
                        ขนาดที่ {index + 1}
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
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="grid gap-1.5">
                        <Label>ขนาด</Label>
                        <Input
                          value={variant.size}
                          onChange={(e) =>
                            patchVariant(item.id, variant.id, {
                              size: e.target.value,
                            })
                          }
                          placeholder="เช่น 30x40 นิ้ว หรือพิมพ์ขนาดเอง"
                        />
                        <div className="flex flex-wrap gap-1">
                          {TRASH_BAG_SIZE_PRESETS.map((size) => (
                            <MiniChip
                              key={size}
                              active={variant.size === size}
                              onClick={() =>
                                patchVariant(item.id, variant.id, { size })
                              }
                            >
                              {size}
                            </MiniChip>
                          ))}
                        </div>
                      </div>
                      <div className="grid gap-1.5">
                        <Label>จำนวน (ต่อเดือน)</Label>
                        <Input
                          value={variant.quantity}
                          onChange={(e) =>
                            patchVariant(item.id, variant.id, {
                              quantity: e.target.value,
                            })
                          }
                          placeholder="เช่น 20 ใบ/เดือน หรือ ตามความเหมาะสม"
                        />
                        <div className="flex flex-wrap gap-1">
                          {QUANTITY_PRESETS.map((qty) => (
                            <MiniChip
                              key={qty}
                              active={variant.quantity === qty}
                              onClick={() =>
                                patchVariant(item.id, variant.id, {
                                  quantity: qty,
                                })
                              }
                            >
                              {qty}
                            </MiniChip>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addVariant(item.id)}
                >
                  <Plus data-icon="inline-start" />
                  เพิ่มขนาดถุงขยะ
                </Button>
              </div>
            ) : null}

            {item.enabled && !multiSize ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor={`${item.id}-size`}>ขนาด</Label>
                  <Input
                    id={`${item.id}-size`}
                    value={item.size}
                    onChange={(e) => patch(item.id, { size: e.target.value })}
                    placeholder="พิมพ์ขนาดเองได้"
                  />
                  {sizes.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {sizes.map((size) => (
                        <MiniChip
                          key={size}
                          active={item.size === size}
                          onClick={() => patch(item.id, { size })}
                        >
                          {size}
                        </MiniChip>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor={`${item.id}-qty`}>จำนวน (ต่อเดือน)</Label>
                  <Input
                    id={`${item.id}-qty`}
                    value={item.quantity}
                    onChange={(e) =>
                      patch(item.id, { quantity: e.target.value })
                    }
                    placeholder="เช่น 2 แพ็ค/เดือน หรือ ตามความเหมาะสม"
                  />
                  <div className="flex flex-wrap gap-1">
                    {QUANTITY_PRESETS.map((qty) => (
                      <MiniChip
                        key={qty}
                        active={item.quantity === qty}
                        onClick={() => patch(item.id, { quantity: qty })}
                      >
                        {qty}
                      </MiniChip>
                    ))}
                  </div>
                </div>
              </div>
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
