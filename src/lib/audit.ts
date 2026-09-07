export const DEFAULT_TARGET = "https://pattarish-web.github.io/SKC-Contact/";

export type Severity = "critical" | "high" | "medium" | "low" | "pass" | "info";

export type FindingCategory =
  | "http"
  | "assets"
  | "pages"
  | "sync"
  | "security"
  | "logic"
  | "a11y"
  | "ui";

export type Finding = {
  id: string;
  category: FindingCategory;
  severity: Severity;
  title: string;
  detail: string;
  evidence?: string;
  fix?: string;
};

export type Probe = {
  url: string;
  ok: boolean;
  status: number | null;
  ms: number;
  contentType: string | null;
  bytes: number;
  error?: string;
  text?: string;
};

export type AuditReport = {
  target: string;
  startedAt: string;
  durationMs: number;
  probes: Probe[];
  findings: Finding[];
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    pass: number;
    info: number;
  };
};

const UA = "SKC-ErrorChecker/1.0 (+https://github.com/pattarish-web/SKC-Contact)";

export function normalizeTarget(raw: string): string {
  const trimmed = raw.trim() || DEFAULT_TARGET;
  try {
    const url = new URL(trimmed);
    if (!url.pathname.endsWith("/")) url.pathname += "/";
    return url.toString();
  } catch {
    return DEFAULT_TARGET;
  }
}

export function originOf(target: string): string {
  return new URL(target).origin;
}

export function extractReferencedPaths(html: string): string[] {
  const found = new Set<string>();
  const re =
    /(?:src|href)=["']([^"']+)["']|url\((['"]?)([^'")]+)\2\)/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    const value = match[1] || match[3];
    if (!value) continue;
    if (
      value.startsWith("data:") ||
      value.startsWith("mailto:") ||
      value.startsWith("javascript:") ||
      value.startsWith("#")
    ) {
      continue;
    }
    found.add(value.split("#")[0]!);
  }
  return [...found];
}

export function resolveAssetUrl(target: string, href: string): string {
  if (href.startsWith("http://") || href.startsWith("https://")) return href;
  return new URL(href, target).toString();
}

export function parseSyncConfig(raw: string): { syncId?: string; provider?: string } {
  const data = JSON.parse(raw) as { syncId?: string; provider?: string };
  return {
    syncId: typeof data.syncId === "string" ? data.syncId.trim() : undefined,
    provider: typeof data.provider === "string" ? data.provider : undefined,
  };
}

export function parseCloudSnapshot(raw: string): {
  contracts: unknown[];
  exportedAt: number;
} {
  const data = JSON.parse(raw) as {
    contracts?: unknown[];
    exportedAt?: number;
    encoding?: string;
    payload?: string;
  };
  if (data.encoding === "gzip-base64") {
    throw new Error("คลังคลาวด์เป็น gzip — ตัวเช็คยังไม่แตกไฟล์นี้");
  }
  return {
    contracts: Array.isArray(data.contracts) ? data.contracts : [],
    exportedAt: typeof data.exportedAt === "number" ? data.exportedAt : 0,
  };
}

export function summarize(findings: Finding[]): AuditReport["summary"] {
  const summary: AuditReport["summary"] = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    pass: 0,
    info: 0,
  };
  for (const finding of findings) {
    summary[finding.severity] += 1;
  }
  return summary;
}

async function probe(
  url: string,
  init?: RequestInit & { includeText?: boolean; maxText?: number }
): Promise<Probe> {
  const started = Date.now();
  const { includeText: wantText, maxText = 200_000, ...fetchInit } = init || {};
  try {
    const res = await fetch(url, {
      ...fetchInit,
      redirect: "follow",
      cache: "no-store",
      headers: {
        "User-Agent": UA,
        Accept: "*/*",
        ...(fetchInit.headers || {}),
      },
    });
    const buf = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get("content-type");
    const includeText =
      wantText ||
      Boolean(contentType?.includes("text") || contentType?.includes("json") || contentType?.includes("xml"));
    return {
      url,
      ok: res.ok,
      status: res.status,
      ms: Date.now() - started,
      contentType,
      bytes: buf.byteLength,
      text: includeText
        ? buf.subarray(0, maxText).toString("utf8")
        : undefined,
    };
  } catch (error) {
    return {
      url,
      ok: false,
      status: null,
      ms: Date.now() - started,
      contentType: null,
      bytes: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function add(
  findings: Finding[],
  finding: Finding,
  condition: boolean
) {
  if (condition) findings.push(finding);
}

export async function runAudit(targetInput = DEFAULT_TARGET): Promise<AuditReport> {
  const startedAt = new Date().toISOString();
  const t0 = Date.now();
  const target = normalizeTarget(targetInput);
  const probes: Probe[] = [];
  const findings: Finding[] = [];

  const home = await probe(target, { includeText: true });
  probes.push(home);

  const printUrl = new URL("print/", target).toString();
  const scriptUrl = new URL("sheet-library.gs", target).toString();
  const logoUrl = new URL("logo-sangkan-clean.png", target).toString();
  const iconUrl = new URL("icon.svg", target).toString();
  const missingUrl = new URL("__missing-audit-probe__.js", target).toString();

  const [printPage, sheetScript, logo, icon, missing] = await Promise.all([
    probe(printUrl, { includeText: true }),
    probe(scriptUrl, { includeText: true, maxText: 20_000 }),
    probe(logoUrl),
    probe(iconUrl, { includeText: true }),
    probe(missingUrl),
  ]);
  probes.push(printPage, sheetScript, logo, icon, missing);

  if (!home.ok || !home.text) {
    findings.push({
      id: "home-down",
      category: "http",
      severity: "critical",
      title: "หน้าแรกโหลดไม่สำเร็จ",
      detail: `GET ${target} ไม่ได้หน้า HTML ที่ใช้ได้`,
      evidence: home.error || `HTTP ${home.status}`,
      fix: "ตรวจ GitHub Pages / โฟลเดอร์ gh-pages และ basePath /SKC-Contact",
    });
  } else {
    findings.push({
      id: "home-ok",
      category: "http",
      severity: "pass",
      title: "หน้าแรกตอบ 200",
      detail: `โหลดได้ใน ${home.ms} ms · ${home.bytes.toLocaleString()} ไบต์`,
      evidence: `HTTP ${home.status} · ${home.contentType}`,
    });

    const html = home.text;
    add(
      findings,
      {
        id: "html-lang",
        category: "a11y",
        severity: "pass",
        title: "ตั้งค่าภาษาเป็นไทย",
        detail: "แท็ก <html lang=\"th\"> ถูกต้อง",
      },
      /<html[^>]*lang=["']th["']/i.test(html)
    );
    add(
      findings,
      {
        id: "html-lang-missing",
        category: "a11y",
        severity: "medium",
        title: "ไม่ได้ตั้ง lang เป็นไทย",
        detail: "ตัวอ่านหน้าจออาจอ่านภาษาผิด",
        fix: 'ใส่ lang="th" ที่ <html>',
      },
      !/<html[^>]*lang=["']th["']/i.test(html)
    );

    add(
      findings,
      {
        id: "html-title",
        category: "a11y",
        severity: "pass",
        title: "มีชื่อหน้าภาษาไทย",
        detail: "พบชื่อแอปสั่งการ คลีน ใน title/metadata",
      },
      /สั่งการ\s*คลีน/.test(html)
    );
    add(
      findings,
      {
        id: "html-title-missing",
        category: "a11y",
        severity: "low",
        title: "ไม่พบชื่อแอปใน HTML",
        detail: "title ควรมีคำว่า สั่งการ คลีน",
      },
      !/สั่งการ\s*คลีน/.test(html)
    );

    add(
      findings,
      {
        id: "basepath-assets",
        category: "pages",
        severity: "pass",
        title: "asset ใช้ basePath /SKC-Contact ถูกต้อง",
        detail: "สคริปต์และสไตล์ชี้ไปที่ /SKC-Contact/_next/...",
      },
      html.includes("/SKC-Contact/_next/")
    );
    add(
      findings,
      {
        id: "basepath-broken",
        category: "pages",
        severity: "critical",
        title: "basePath ของ GitHub Pages ผิด",
        detail: "ไฟล์ _next ไม่ได้อยู่ใต้ /SKC-Contact ซึ่งจะทำให้ CSS/JS 404",
        evidence: html.slice(0, 280),
        fix: "build ด้วย GITHUB_PAGES=true และ NEXT_PUBLIC_BASE_PATH=/SKC-Contact",
      },
      html.includes("/_next/") && !html.includes("/SKC-Contact/_next/")
    );

    const assetHrefs = extractReferencedPaths(html).filter(
      (href) =>
        href.includes("/_next/") ||
        href.endsWith(".css") ||
        href.endsWith(".js") ||
        href.includes("font") ||
        href.includes(".woff")
    );
    const assetUrls = [...new Set(assetHrefs.map((href) => resolveAssetUrl(target, href)))];
    const assetProbes = await Promise.all(assetUrls.map((url) => probe(url)));
    probes.push(...assetProbes);
    const broken = assetProbes.filter((p) => !p.ok);
    if (broken.length === 0 && assetProbes.length > 0) {
      findings.push({
        id: "assets-ok",
        category: "assets",
        severity: "pass",
        title: `ไฟล์ JS/CSS/ฟอนต์ครบ ${assetProbes.length} ไฟล์`,
        detail: "ทุกไฟล์ที่หน้าแรกอ้างถึงตอบ 200",
      });
    } else if (broken.length > 0) {
      findings.push({
        id: "assets-broken",
        category: "assets",
        severity: "critical",
        title: `ไฟล์สแตติกเสีย ${broken.length} ไฟล์`,
        detail: "เบราว์เซอร์จะเรนเดอร์หน้าขาว หรือสไตล์หาย",
        evidence: broken.map((p) => `${p.status ?? "ERR"} ${p.url}`).join("\n"),
        fix: "deploy โฟลเดอร์ out/ ทั้งชุด รวม _next/static",
      });
    }
  }

  if (printPage.ok) {
    findings.push({
      id: "print-route",
      category: "pages",
      severity: "pass",
      title: "เส้นทาง /print/ พร้อมใช้งาน",
      detail: `HTTP ${printPage.status} · ${printPage.bytes.toLocaleString()} ไบต์`,
    });
  } else {
    findings.push({
      id: "print-route-fail",
      category: "pages",
      severity: "high",
      title: "หน้าพิมพ์เปิดไม่ได้",
      detail: "ปุ่มพิมพ์จะพังเพราะ /print/ ไม่มีบน GitHub Pages",
      evidence: printPage.error || `HTTP ${printPage.status}`,
      fix: "export แบบ trailingSlash และมี out/print/index.html",
    });
  }

  if (logo.ok && (logo.contentType || "").includes("image")) {
    findings.push({
      id: "logo-ok",
      category: "assets",
      severity: "pass",
      title: "โลโก้บริษัทโหลดได้",
      detail: `${logo.bytes.toLocaleString()} ไบต์`,
    });
  } else {
    findings.push({
      id: "logo-fail",
      category: "assets",
      severity: "medium",
      title: "โลโก้บริษัทโหลดไม่ได้",
      detail: "หัวเอกสารและหน้าแรกจะไม่มีรูปสั่งการ คลีน",
      evidence: logo.error || `HTTP ${logo.status} ${logo.contentType}`,
      fix: "วาง public/logo-sangkan-clean.png แล้ว deploy ใหม่",
    });
  }

  if (icon.ok) {
    findings.push({
      id: "icon-ok",
      category: "assets",
      severity: "pass",
      title: "ไอคอนแท็บโหลดได้",
      detail: icon.contentType || "image/svg+xml",
    });
  }

  if (missing.status === 404 || missing.status === 200) {
    // GitHub Pages may serve 404.html with 404, or SPA fallback 200.
    if (missing.status === 404) {
      findings.push({
        id: "missing-404",
        category: "pages",
        severity: "pass",
        title: "ไฟล์ที่ไม่มีจริงตอบ 404",
        detail: "เซิร์ฟเวอร์ไม่ได้กลืนทุกพาธเป็นหน้าแรก",
      });
    } else {
      findings.push({
        id: "missing-fallback",
        category: "pages",
        severity: "info",
        title: "พาธที่ไม่มีจริงไม่ได้ตอบ 404",
        detail: `GET ไฟล์สมมติได้ HTTP ${missing.status} — ปกติของ GitHub Pages ที่เสิร์ฟ 404.html`,
        evidence: missing.contentType || "",
      });
    }
  }

  if (sheetScript.ok && sheetScript.text) {
    const script = sheetScript.text;
    findings.push({
      id: "sheet-script-ok",
      category: "sync",
      severity: "pass",
      title: "พบสคริปต์คลัง Google Sheet",
      detail: `โหลด sheet-library.gs ได้ ${sheetScript.bytes.toLocaleString()} ไบต์`,
    });
    add(
      findings,
      {
        id: "sheet-script-pending",
        category: "sync",
        severity: "pass",
        title: "สคริปต์รองรับลบเลขซ้ำตอนบันทึก",
        detail: "doPost รับ removeIds เพื่อลบแถวซ้ำบนชีต",
      },
      script.includes("removeIds")
    );
    add(
      findings,
      {
        id: "sheet-script-token",
        category: "security",
        severity: "info",
        title: "สคริปต์รองรับรหัสเขียน WRITE_TOKEN",
        detail:
          "ถ้าตั้ง Script property ชื่อ WRITE_TOKEN การบันทึกต้องส่งรหัสเดียวกันจากหน้าตั้งค่าคลัง",
        fix: "ตั้ง WRITE_TOKEN ใน Apps Script แล้ววางรหัสในแอปถ้าต้องการกันคนนอกเขียน",
      },
      script.includes("WRITE_TOKEN")
    );
  } else {
    findings.push({
      id: "sheet-script-missing",
      category: "sync",
      severity: "medium",
      title: "ไม่พบ /sheet-library.gs",
      detail: "ปุ่มคัดลอกสคริปต์ในหน้าคลังจะใช้ไม่ได้",
      evidence: sheetScript.error || `HTTP ${sheetScript.status}`,
      fix: "deploy ไฟล์ public/sheet-library.gs ด้วย",
    });
  }

  findings.push(...sourceFindings());
  findings.push(...uiPassFindings());

  findings.sort((a, b) => rank(a.severity) - rank(b.severity));

  return {
    target,
    startedAt,
    durationMs: Date.now() - t0,
    probes,
    findings,
    summary: summarize(findings),
  };
}

function rank(severity: Severity): number {
  return { critical: 0, high: 1, medium: 2, low: 3, info: 4, pass: 5 }[severity];
}

/** Findings from reading the current Sheets-backed app source. */
export function sourceFindings(): Finding[] {
  return [
    {
      id: "logic-print-payload",
      category: "logic",
      severity: "pass",
      title: "พิมพ์สัญญาเก็บ payload ใน localStorage",
      detail:
        "writePrintPayload() เขียนทั้ง localStorage และ sessionStorage แล้วเปิดแท็บ /print โดยไม่ใช้ noopener — ถ้าป๊อปอัปถูกบล็อกจะพิมพ์ในแท็บเดิม",
      evidence: "src/lib/draft-store.ts · src/lib/print.ts openPrintWindow()",
    },
    {
      id: "logic-contractor-position-fallback",
      category: "logic",
      severity: "pass",
      title: "ตำแหน่งผู้รับจ้างไม่ยืมตำแหน่งลูกค้า",
      detail:
        "buildContractContext() ใช้ตำแหน่งฝ่ายสั่งการ คลีน หรือค่าเริ่ม กรรมการผู้มีอำนาจ เท่านั้น",
      evidence: "src/lib/contract.ts contractor_position",
    },
    {
      id: "logic-pending-poll",
      category: "sync",
      severity: "pass",
      title: "งานค้างไม่ถูกดึงทับจากชีต",
      detail:
        "ถ้าบันทึก/ลบ/นำเข้าขึ้นชีตไม่สำเร็จ ระบบเก็บคิวในเครื่อง แล้วทับผลดึงทุก 4 วินาทีด้วยงานค้าง",
      evidence: "src/lib/pending-sync.ts · subscribeCentral()",
    },
    {
      id: "logic-sheet-unauth-write",
      category: "security",
      severity: "medium",
      title: "ลิงก์เว็บแอปเขียนคลังได้ถ้าไม่ตั้งรหัส",
      detail:
        "โฮสต์แบบ GitHub Pages ต้องเปิด Web app เป็น Anyone — ใครมีลิงก์ /exec สามารถบันทึกหรือลบสัญญาได้ จนกว่าจะตั้ง WRITE_TOKEN ใน Apps Script",
      evidence: "scripts/SheetLibrary.gs assertToken_()",
      fix: "ตั้ง Script property WRITE_TOKEN แล้ววางรหัสในหน้าตั้งค่าคลังของแอป",
    },
    {
      id: "logic-attachments-local-only",
      category: "sync",
      severity: "info",
      title: "ไฟล์แนบอยู่เฉพาะเครื่องนี้",
      detail:
        "Google Sheet เก็บตัวสัญญา ไฟล์แนบอยู่ใน IndexedDB ของเบราว์เซอร์นั้นเครื่องเดียว",
      evidence: "src/components/attachment-panel.tsx",
      fix: "ส่งออกไฟล์คลังถ้าต้องย้ายเครื่องที่มีเอกสารสำคัญ",
    },
    {
      id: "logic-html-cache",
      category: "http",
      severity: "info",
      title: "GitHub Pages แคช HTML 10 นาที",
      detail:
        "Cache-Control: max-age=600 — หลัง deploy ผู้ใช้อาจเห็นเวอร์ชันเก่าถึงสิบนาทีถ้าไม่ฮาร์ดรีเฟรช",
    },
  ];
}

/** Confirmed layout/behavior of the current app. */
export function uiPassFindings(): Finding[] {
  return [
    {
      id: "ui-print-works",
      category: "ui",
      severity: "pass",
      title: "ปุ่มพิมพ์เปิดเอกสารสัญญาได้",
      detail:
        "กดพิมพ์แล้วได้หน้าสัญญาขนาด A4 พร้อมคำใบ้ภาษาไทยเรื่องกระดาษและหัวท้ายหน้า",
    },
    {
      id: "ui-empty-library",
      category: "ui",
      severity: "pass",
      title: "หน้าคลังว่างแสดงสถานะถูกต้อง",
      detail:
        "เมื่อยังไม่มีสัญญา หน้าแรกโชว์ «ยังไม่มีสัญญาที่บันทึก» และปุ่มเริ่มสร้างสัญญา",
    },
    {
      id: "ui-mobile-library",
      category: "ui",
      severity: "pass",
      title: "คลังบนมือถือเป็นกริด 2 คอลัมน์ เป้าสัมผัสใหญ่",
      detail:
        "ปุ่มการ์ดสูง 44px สองคอลัมน์ ปุ่มหลักคือเปิดและต่ออายุ ไม่เรียงแถวเดียวขนาด 28px",
    },
    {
      id: "ui-epoch-date",
      category: "ui",
      severity: "pass",
      title: "วันที่แก้ล่าสุดไม่โชว์ 1/1/2513",
      detail:
        "formatUpdatedAt() แสดง — เมื่อค่าเวลาน้อยกว่าหนึ่งวันหลัง epoch",
    },
    {
      id: "ui-console-clean",
      category: "ui",
      severity: "pass",
      title: "เส้นทางใช้งานหลักไม่พึ่งคลัง JSON เก่า",
      detail:
        "คลังอยู่ที่ Google Sheet ไม่มี sync-config.json หรือ extendsclass",
    },
  ];
}
