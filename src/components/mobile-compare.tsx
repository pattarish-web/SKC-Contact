import type { ReactNode } from "react";

export function MobileCompare() {
  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <PhoneFrame
        title="ตอนนี้บนมือถือ"
        caption="เลย์เอาต์คอมถูกยัดลงจอ — ปุ่ม 28px เรียงแถวเดียว กดยาก"
      >
        <CrammedLibrary />
      </PhoneFrame>
      <PhoneFrame
        title="ที่ควรเป็น"
        caption="หัวเว็บเหลือโลโก้ ปุ่มใหญ่เป็นกริด 2 คอลัมน์ เป้าสัมผัส 44px"
      >
        <FixedLibrary />
      </PhoneFrame>
    </section>
  );
}

function PhoneFrame({
  title,
  caption,
  children,
}: {
  title: string;
  caption: string;
  children: ReactNode;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-teal-950">{title}</h3>
      <p className="mt-0.5 mb-3 text-xs text-muted-foreground">{caption}</p>
      <div className="mx-auto max-w-[360px] overflow-hidden rounded-[1.6rem] border-8 border-zinc-800 bg-zinc-800 shadow-lg">
        <div className="h-[28px] bg-zinc-800" />
        <div className="max-h-[420px] overflow-hidden bg-[oklch(0.97_0.01_175)]">
          {children}
        </div>
      </div>
    </div>
  );
}

function CrammedLibrary() {
  return (
    <div className="p-2 text-[9px] leading-tight text-teal-950">
      <div className="mb-2 flex items-center justify-between gap-1 border-b border-teal-900/10 bg-white/80 px-1 py-1">
        <span className="font-semibold">สั่งการ คลีน</span>
        <span className="flex gap-0.5">
          <MiniChip>รีวิวเอกสาร</MiniChip>
          <MiniChip primary>สร้างสัญญาใหม่</MiniChip>
        </span>
      </div>
      <p className="mb-1 font-semibold">คลังสัญญา</p>
      <div className="mb-2 flex flex-wrap gap-0.5">
        {["เลือกโฟลเดอร์ร่วม", "ซิงก์คลัง", "ส่งออก", "นำเข้า", "สร้างสัญญาใหม่"].map(
          (label) => (
            <MiniChip key={label}>{label}</MiniChip>
          )
        )}
      </div>
      <div className="rounded-md border border-border bg-white p-1.5">
        <p className="font-semibold">SC-2569-09-015</p>
        <p>ลูกค้าทดสอบ 14</p>
        <p className="text-muted-foreground">1/1/2513 07:00:01</p>
        <div className="mt-1 flex gap-0.5">
          {["รีวิว", "คัดลอกต่อสัญญา", "เปิดแก้ไข", "ลบ"].map((label) => (
            <MiniChip key={label}>{label}</MiniChip>
          ))}
        </div>
      </div>
    </div>
  );
}

function FixedLibrary() {
  return (
    <div className="p-2 text-[11px] leading-snug text-teal-950">
      <div className="border-b border-teal-900/10 bg-white/80 px-1 py-1.5">
        <p className="font-semibold">สั่งการ คลีน</p>
        <p className="text-[10px] text-muted-foreground">คลังสัญญาที่บันทึกไว้</p>
        <div className="mt-1.5 grid grid-cols-2 gap-1">
          <BigChip>รีวิวเอกสาร</BigChip>
          <BigChip primary>สร้างสัญญาใหม่</BigChip>
        </div>
      </div>
      <p className="mt-2 mb-1 font-semibold">คลังสัญญา</p>
      <div className="mb-2 grid grid-cols-2 gap-1">
        {["ซิงก์คลัง", "ส่งออก", "นำเข้า"].map((label) => (
          <BigChip key={label}>{label}</BigChip>
        ))}
      </div>
      <div className="rounded-md border border-border bg-white p-2">
        <p className="font-semibold">SC-2569-09-015</p>
        <p>ลูกค้าทดสอบ 14</p>
        <p className="text-[10px] text-muted-foreground">แก้ไขล่าสุด —</p>
        <div className="mt-1.5 grid grid-cols-2 gap-1">
          <BigChip>รีวิว</BigChip>
          <BigChip primary>คัดลอกต่อสัญญา</BigChip>
          <BigChip>เปิดแก้ไข</BigChip>
          <BigChip danger>ลบ</BigChip>
        </div>
      </div>
    </div>
  );
}

function MiniChip({
  children,
  primary,
}: {
  children: ReactNode;
  primary?: boolean;
}) {
  return (
    <span
      className={`rounded px-1 py-px ${
        primary ? "bg-teal-800 text-white" : "border border-border bg-white"
      }`}
    >
      {children}
    </span>
  );
}

function BigChip({
  children,
  primary,
  danger,
}: {
  children: ReactNode;
  primary?: boolean;
  danger?: boolean;
}) {
  return (
    <span
      className={`flex h-8 items-center justify-center rounded-md px-1 text-center text-[10px] ${
        danger
          ? "bg-red-50 text-red-800"
          : primary
            ? "bg-teal-800 text-white"
            : "border border-border bg-white"
      }`}
    >
      {children}
    </span>
  );
}
