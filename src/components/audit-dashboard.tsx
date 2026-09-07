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
import { MobileCompare } from "@/components/mobile-compare";
import { Separator } from "@/components/ui/separator";
import type {
  AuditReport,
  Finding,
  FindingCategory,
  Severity,
} from "@/lib/audit";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Info,
  Loader2,
  RefreshCw,
  ShieldAlert,
  ShieldX,
} from "lucide-react";
import { useMemo, useState, useTransition, type ReactNode } from "react";
import { runAudit } from "@/lib/audit";

const CATEGORY_LABEL: Record<FindingCategory, string> = {
  http: "HTTP",
  assets: "ไฟล์สแตติก",
  pages: "เส้นทางหน้า",
  sync: "คลังสัญญา",
  security: "ความปลอดภัย",
  logic: "ตรรกะแอป",
  a11y: "การเข้าถึง",
  ui: "ทดลองในเบราว์เซอร์",
};

const SEVERITY_LABEL: Record<Severity, string> = {
  critical: "วิกฤต",
  high: "สูง",
  medium: "ปานกลาง",
  low: "ต่ำ",
  info: "ข้อมูล",
  pass: "ผ่าน",
};

type Filter = "all" | "problems" | "pass";

export function AuditDashboard({
  defaultTarget,
  initialReport,
  initialError,
}: {
  defaultTarget: string;
  initialReport: AuditReport | null;
  initialError: string | null;
}) {
  const [target, setTarget] = useState(defaultTarget);
  const [report, setReport] = useState<AuditReport | null>(initialReport);
  const [error, setError] = useState<string | null>(initialError);
  const [filter, setFilter] = useState<Filter>("problems");
  const [pending, startTransition] = useTransition();

  function rerun() {
    startTransition(async () => {
      setError(null);
      try {
        const next = await runAudit(target);
        setReport(next);
      } catch (err) {
        setError(err instanceof Error ? err.message : "ตรวจไม่สำเร็จ");
      }
    });
  }

  const summary = report?.summary;
  const problemCount =
    (summary?.critical ?? 0) +
    (summary?.high ?? 0) +
    (summary?.medium ?? 0) +
    (summary?.low ?? 0);

  const visible = useMemo(() => {
    const items = report?.findings ?? [];
    if (filter === "pass") return items.filter((f) => f.severity === "pass");
    if (filter === "problems") {
      return items.filter((f) => f.severity !== "pass");
    }
    return items;
  }, [filter, report]);

  const grouped = useMemo(() => {
    const map = new Map<FindingCategory, Finding[]>();
    for (const finding of visible) {
      const list = map.get(finding.category) || [];
      list.push(finding);
      map.set(finding.category, list);
    }
    return [...map.entries()];
  }, [visible]);

  return (
    <div className="min-h-full bg-[oklch(0.97_0.012_175)]">
      <header className="border-b border-teal-900/10 bg-[oklch(0.995_0.006_175)]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium tracking-wide text-teal-800 uppercase">
                ตรวจระบบ
              </p>
              <h1 className="text-xl font-semibold text-teal-950 sm:text-2xl">
                ตัวเช็คข้อผิดพลาด SKC-Contact
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                ตรวจเว็บจัดทำสัญญาของบริษัทสั่งการ คลีน ทั้งไฟล์บน GitHub Pages
                คลังสัญญา Google Sheet และจุดบกพร่องในซอร์ส — ไม่เดา ไม่ซ่อมมั่ว
                หาสาเหตุก่อนเสนอทางแก้
              </p>
            </div>
            <a
              href={target}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-800 hover:underline"
            >
              เปิดเว็บจริง
              <ExternalLink className="size-3.5" />
            </a>
          </div>

          <form
            className="flex flex-col gap-2 sm:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              rerun();
            }}
          >
            <label className="sr-only" htmlFor="target">
              URL ที่จะตรวจ
            </label>
            <input
              id="target"
              value={target}
              onChange={(event) => setTarget(event.target.value)}
              className="h-9 flex-1 rounded-lg border border-border bg-white px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              spellCheck={false}
            />
            <Button type="submit" disabled={pending}>
              {pending ? (
                <Loader2 className="animate-spin" data-icon="inline-start" />
              ) : (
                <RefreshCw data-icon="inline-start" />
              )}
              {pending ? "กำลังตรวจ…" : "ตรวจอีกครั้ง"}
            </Button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
        {error ? (
          <Alert variant="destructive">
            <ShieldX />
            <AlertTitle>ตรวจไม่สำเร็จ</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {!report && pending ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" />
                กำลังโหลดผลการตรวจ
              </CardTitle>
              <CardDescription>
                เรียกหน้าแรก หน้าพิมพ์ ไฟล์สแตติก และคลังคลาวด์ของ SKC-Contact
              </CardDescription>
            </CardHeader>
          </Card>
        ) : null}

        {report ? (
          <>
            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryTile
                label="วิกฤต"
                value={report.summary.critical}
                tone="critical"
              />
              <SummaryTile
                label="สูง / ปานกลาง"
                value={report.summary.high + report.summary.medium}
                tone="warn"
              />
              <SummaryTile
                label="ผ่าน"
                value={report.summary.pass}
                tone="pass"
              />
              <SummaryTile
                label="ใช้เวลา"
                value={`${(report.durationMs / 1000).toFixed(1)} วินาที`}
                tone="info"
              />
            </section>

            <Alert>
              <ShieldAlert />
              <AlertTitle>
                {problemCount === 0
                  ? "ไม่พบปัญหาที่ตัวตรวจจับได้ในรอบนี้"
                  : `พบ ${problemCount} ข้อที่ควรดู`}
              </AlertTitle>
              <AlertDescription>
                ตรวจเมื่อ{" "}
                {new Date(report.startedAt).toLocaleString("th-TH", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}{" "}
                · เป้าหมาย {report.target} · ยิง {report.probes.length} คำขอ
              </AlertDescription>
            </Alert>

            <div className="flex flex-wrap gap-2">
              <FilterButton
                active={filter === "problems"}
                onClick={() => setFilter("problems")}
              >
                เฉพาะปัญหา
              </FilterButton>
              <FilterButton
                active={filter === "all"}
                onClick={() => setFilter("all")}
              >
                ทั้งหมด
              </FilterButton>
              <FilterButton
                active={filter === "pass"}
                onClick={() => setFilter("pass")}
              >
                รายการที่ผ่าน
              </FilterButton>
            </div>

            {visible.length === 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>ไม่มีรายการในตัวกรองนี้</CardTitle>
                  <CardDescription>
                    สลับไปที่ «ทั้งหมด» เพื่อดูผลทุกข้อ
                  </CardDescription>
                </CardHeader>
              </Card>
            ) : (
              grouped.map(([category, items]) => (
                <section key={category} className="space-y-3">
                  <h2 className="text-sm font-semibold tracking-wide text-teal-900 uppercase">
                    {CATEGORY_LABEL[category]}
                  </h2>
                  <div className="grid gap-3">
                    {items.map((finding) => (
                      <FindingCard key={finding.id} finding={finding} />
                    ))}
                  </div>
                </section>
              ))
            )}

            <Separator />

            <Card>
              <CardHeader>
                <CardTitle>มือถือกับคอมพิวเตอร์ไม่เหมือนกัน</CardTitle>
                <CardDescription>
                  หน้าคลังบนโทรศัพท์ยังเป็นแถบปุ่มเดสก์ท็อป — กริดขวามือคือเลย์เอาต์ที่ควรขึ้นบน GitHub Pages หลัง deploy แพตช์นี้
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MobileCompare />
              </CardContent>
            </Card>

            <Card className="hidden md:block">
              <CardHeader>
                <CardTitle>ตัวอย่างเว็บจริง</CardTitle>
                <CardDescription>
                  iframe จาก GitHub Pages — บนมือถือซ่อนไว้เพื่อไม่ให้เว็บเดสก์ท็อปถูกย่อซ้ำในกรอบเล็ก
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-hidden rounded-xl border border-border bg-white">
                  <iframe
                    title="SKC-Contact live"
                    src={report.target}
                    className="h-[520px] w-full"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>คำขอที่ส่งในรอบนี้</CardTitle>
                <CardDescription>
                  หลักฐานดิบตาม systematic debugging — ไม่สรุปจนกว่าจะมีสถานะจริง
                </CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="py-2 pr-3 font-medium">สถานะ</th>
                      <th className="py-2 pr-3 font-medium">ms</th>
                      <th className="py-2 pr-3 font-medium">ขนาด</th>
                      <th className="py-2 font-medium">URL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.probes.map((probe, index) => (
                      <tr key={`${index}-${probe.url}`} className="border-b last:border-0">
                        <td className="py-2 pr-3 whitespace-nowrap">
                          {probe.status ?? probe.error ?? "ERR"}
                        </td>
                        <td className="py-2 pr-3">{probe.ms}</td>
                        <td className="py-2 pr-3">
                          {probe.bytes.toLocaleString()}
                        </td>
                        <td className="py-2 font-mono text-xs break-all">
                          {probe.url}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </>
        ) : null}
      </main>
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? "default" : "outline"}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

function SummaryTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone: "critical" | "warn" | "pass" | "info";
}) {
  const toneClass = {
    critical: "border-red-200 bg-red-50 text-red-950",
    warn: "border-amber-200 bg-amber-50 text-amber-950",
    pass: "border-teal-200 bg-teal-50 text-teal-950",
    info: "border-border bg-white text-teal-950",
  }[tone];
  return (
    <Card className={toneClass} size="sm">
      <CardHeader>
        <CardDescription className="text-current/70">{label}</CardDescription>
        <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

function FindingCard({ finding }: { finding: Finding }) {
  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="flex items-start gap-2 text-base">
            <SeverityIcon severity={finding.severity} />
            <span>{finding.title}</span>
          </CardTitle>
          <Badge variant={badgeVariant(finding.severity)}>
            {SEVERITY_LABEL[finding.severity]}
          </Badge>
        </div>
        <CardDescription>{finding.detail}</CardDescription>
      </CardHeader>
      {(finding.evidence || finding.fix) && (
        <CardContent className="space-y-3 text-sm">
          {finding.evidence ? (
            <div>
              <p className="text-xs font-medium text-muted-foreground">หลักฐาน</p>
              <pre className="mt-1 overflow-x-auto rounded-md bg-muted px-3 py-2 font-mono text-xs whitespace-pre-wrap">
                {finding.evidence}
              </pre>
            </div>
          ) : null}
          {finding.fix ? (
            <div>
              <p className="text-xs font-medium text-muted-foreground">ทางแก้ที่ต้นเหตุ</p>
              <p className="mt-1">{finding.fix}</p>
            </div>
          ) : null}
        </CardContent>
      )}
    </Card>
  );
}

function SeverityIcon({ severity }: { severity: Severity }) {
  const className = `mt-0.5 size-4 shrink-0 ${iconColor(severity)}`;
  if (severity === "pass") return <CheckCircle2 className={className} />;
  if (severity === "info") return <Info className={className} />;
  if (severity === "critical" || severity === "high") {
    return <ShieldX className={className} />;
  }
  return <AlertTriangle className={className} />;
}

function iconColor(severity: Severity) {
  if (severity === "pass") return "text-teal-700";
  if (severity === "info") return "text-sky-700";
  if (severity === "critical" || severity === "high") return "text-red-700";
  return "text-amber-700";
}

function badgeVariant(severity: Severity): "default" | "secondary" | "destructive" | "outline" {
  if (severity === "critical" || severity === "high") return "destructive";
  if (severity === "pass") return "default";
  if (severity === "info") return "secondary";
  return "outline";
}
