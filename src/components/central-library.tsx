"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  formatUpdatedAt,
  type CentralContract,
  type LibrarySnapshot,
} from "@/lib/central-store";
import {
  Loader2,
  Radio,
  Trash2,
  Upload,
  WifiOff,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

const LIBRARY_KEY = "skc-local";

function apiHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    "x-library-key": LIBRARY_KEY,
  };
}

export function CentralLibrary() {
  const [snapshot, setSnapshot] = useState<LibrarySnapshot | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const source = new EventSource(
      `/api/library/stream?key=${encodeURIComponent(LIBRARY_KEY)}`
    );
    source.onopen = () => {
      setConnected(true);
      setError(null);
    };
    source.onerror = () => {
      setConnected(false);
      setError("ขาดการเชื่อมคลังกลาง — กำลังลองใหม่");
    };
    source.onmessage = (event) => {
      try {
        const next = JSON.parse(event.data) as LibrarySnapshot;
        if (next && Array.isArray(next.contracts)) {
          setSnapshot(next);
          setError(null);
          setConnected(true);
        }
      } catch {
        setError("อ่านข้อมูลจากคลังกลางไม่สำเร็จ");
      }
    };
    return () => source.close();
  }, []);

  async function createRow() {
    const clientName = name.trim();
    if (!clientName) {
      setError("ใส่ชื่อผู้ว่าจ้างก่อนบันทึกเข้าคลังกลาง");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/library", {
        method: "POST",
        headers: apiHeaders(),
        body: JSON.stringify({
          inputs: {
            contract_no: number.trim(),
            client_name: clientName,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "บันทึกไม่สำเร็จ");
      setSnapshot(data as LibrarySnapshot);
      setName("");
      setNumber("");
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  async function removeRow(id: string) {
    if (!window.confirm("ลบสัญญานี้ออกจากคลังกลางทุกเครื่อง?")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/library/contracts/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: apiHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "ลบไม่สำเร็จ");
      setSnapshot(data as LibrarySnapshot);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ลบไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  async function importFile(file: File) {
    setSaving(true);
    try {
      const raw = JSON.parse(await file.text()) as unknown;
      const res = await fetch("/api/library", {
        method: "PUT",
        headers: apiHeaders(),
        body: JSON.stringify(raw),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "นำเข้าไม่สำเร็จ");
      setSnapshot(data as LibrarySnapshot);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "นำเข้าไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  const items = snapshot?.contracts ?? [];

  return (
    <div className="min-h-full bg-[oklch(0.97_0.012_175)]">
      <header className="border-b border-teal-900/10 bg-[oklch(0.995_0.006_175)]/95">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-5 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold text-teal-950 sm:text-2xl">
                คลังกลางสัญญา
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                ฐานข้อมูลชุดเดียวบนเซิร์ฟเวอร์นี้ ทุกเครื่องเห็นชุดเดียวกันทันที
                ไม่ต้องกดซิงก์ ไม่เก็บคนละ IndexedDB
              </p>
            </div>
            <Badge variant={connected ? "default" : "destructive"}>
              {connected ? (
                <Radio data-icon="inline-start" />
              ) : (
                <WifiOff data-icon="inline-start" />
              )}
              {connected ? "เชื่อมแบบ realtime แล้ว" : "ยังไม่เชื่อม"}
            </Badge>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
        {error ? (
          <Alert variant="destructive">
            <WifiOff />
            <AlertTitle>คลังกลางมีปัญหา</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>บันทึกเข้าคลังกลาง</CardTitle>
            <CardDescription>
              เปิดหน้านี้สองแท็บแล้วบันทึกที่แท็บหนึ่ง — อีกแท็บจะขึ้นเองโดยไม่กดรีเฟรช
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="text-sm">
                เลขที่สัญญา
                <input
                  value={number}
                  onChange={(event) => setNumber(event.target.value)}
                  placeholder="SC-2569-09-016"
                  className="mt-1 h-11 w-full rounded-lg border border-border bg-white px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:h-9"
                />
              </label>
              <label className="text-sm">
                ชื่อผู้ว่าจ้าง
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="บริษัท ตัวอย่าง จำกัด"
                  className="mt-1 h-11 w-full rounded-lg border border-border bg-white px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:h-9"
                />
              </label>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:flex">
              <Button
                className="h-11 sm:h-8"
                disabled={saving}
                onClick={() => void createRow()}
              >
                {saving ? <Loader2 className="animate-spin" data-icon="inline-start" /> : null}
                บันทึกเข้าคลังกลาง
              </Button>
              <Button
                variant="outline"
                className="h-11 sm:h-8"
                disabled={saving}
                onClick={() => fileRef.current?.click()}
              >
                <Upload data-icon="inline-start" />
                นำเข้าไฟล์จาก SKC-Contact
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void importFile(file);
                  event.target.value = "";
                }}
              />
            </div>
          </CardContent>
        </Card>

        <section className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <h2 className="text-sm font-semibold tracking-wide text-teal-900 uppercase">
              สัญญาในฐานกลาง · {items.length} รายการ
            </h2>
            <p className="text-xs text-muted-foreground">
              อัปเดตล่าสุด {formatUpdatedAt(snapshot?.updatedAt)}
            </p>
          </div>

          {!snapshot ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Loader2 className="size-4 animate-spin" />
                  กำลังต่อคลังกลาง…
                </CardTitle>
              </CardHeader>
            </Card>
          ) : items.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>คลังกลางยังว่าง</CardTitle>
                <CardDescription>
                  บันทึกรายการด้านบน หรือนำเข้าไฟล์ส่งออกจาก SKC-Contact
                  แล้วทุกเครื่องที่เปิดหน้านี้จะเห็นชุดเดียวกัน
                </CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <ul className="grid gap-3">
              {items.map((row) => (
                <ContractRow
                  key={row.id}
                  row={row}
                  disabled={saving}
                  onDelete={() => void removeRow(row.id)}
                />
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

function ContractRow({
  row,
  disabled,
  onDelete,
}: {
  row: CentralContract;
  disabled: boolean;
  onDelete: () => void;
}) {
  return (
    <li className="rounded-xl border border-border bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="font-semibold text-teal-950">
            {row.inputs.contract_no || "ยังไม่มีเลขที่สัญญา"}
          </p>
          <p className="mt-0.5 truncate text-sm">
            {row.inputs.client_name || "ยังไม่ระบุผู้ว่าจ้าง"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            แก้ไขล่าสุด {formatUpdatedAt(row.updatedAt)}
          </p>
        </div>
        <Button
          variant="destructive"
          className="h-11 sm:h-8"
          disabled={disabled}
          onClick={onDelete}
        >
          <Trash2 data-icon="inline-start" />
          ลบจากคลังกลาง
        </Button>
      </div>
    </li>
  );
}
