"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createStaffRole,
  STAFF_ROLE_PRESETS,
  type StaffRole,
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

export function StaffRolesPanel({
  roles,
  onChange,
}: {
  roles: StaffRole[];
  onChange: (roles: StaffRole[]) => void;
}) {
  function patch(id: string, partial: Partial<StaffRole>) {
    onChange(roles.map((role) => (role.id === id ? { ...role, ...partial } : role)));
  }

  function remove(id: string) {
    if (roles.length <= 1) return;
    onChange(roles.filter((role) => role.id !== id));
  }

  function addRole(title?: string) {
    onChange([
      ...roles,
      createStaffRole({
        title: title || "พนักงานรักษาความสะอาด",
        count: "1",
        price_per_head: "",
      }),
    ]);
  }

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-medium text-teal-900">ตำแหน่งงาน</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          เพิ่มได้หลายตำแหน่ง เช่น หัวหน้าพนักงาน หรือพนักงานเป็นกะ
          แต่ละตำแหน่งใส่จำนวนและค่าจ้างแยกกัน
        </p>
      </div>

      {roles.map((role, index) => (
        <div
          key={role.id}
          className="space-y-3 rounded-xl border border-border bg-muted/30 p-3"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1 space-y-1.5">
              <Label htmlFor={`${role.id}-title`}>
                ตำแหน่งที่ {index + 1}
              </Label>
              <Input
                id={`${role.id}-title`}
                value={role.title}
                onChange={(e) => patch(role.id, { title: e.target.value })}
                placeholder="เช่น หัวหน้าพนักงาน"
              />
              <div className="flex flex-wrap gap-1">
                {STAFF_ROLE_PRESETS.map((title) => (
                  <MiniChip
                    key={title}
                    active={role.title === title}
                    onClick={() => patch(role.id, { title })}
                  >
                    {title}
                  </MiniChip>
                ))}
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              disabled={roles.length <= 1}
              onClick={() => remove(role.id)}
              aria-label="ลบตำแหน่ง"
            >
              <Trash2 />
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor={`${role.id}-count`}>จำนวน (คน)</Label>
              <Input
                id={`${role.id}-count`}
                type="number"
                min={1}
                value={role.count}
                onChange={(e) => patch(role.id, { count: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={`${role.id}-rate`}>ค่าจ้างต่อคน (บาท/เดือน)</Label>
              <Input
                id={`${role.id}-rate`}
                inputMode="decimal"
                value={role.price_per_head}
                onChange={(e) =>
                  patch(role.id, { price_per_head: e.target.value })
                }
                placeholder="15000"
              />
            </div>
          </div>
        </div>
      ))}

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => addRole()}>
          <Plus data-icon="inline-start" />
          เพิ่มตำแหน่ง
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => addRole("หัวหน้าพนักงาน")}
        >
          + หัวหน้าพนักงาน
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => addRole("พนักงานเป็นกะ")}
        >
          + พนักงานเป็นกะ
        </Button>
      </div>
    </div>
  );
}
