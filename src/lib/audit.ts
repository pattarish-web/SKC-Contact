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
const CLOUD_API = "https://extendsclass.com/api/json-storage/bin";

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
  const syncUrl = new URL("sync-config.json", target).toString();
  const logoUrl = new URL("logo-sangkan-clean.png", target).toString();
  const iconUrl = new URL("icon.svg", target).toString();
  const missingUrl = new URL("__missing-audit-probe__.js", target).toString();

  const [printPage, syncConfig, logo, icon, missing] = await Promise.all([
    probe(printUrl, { includeText: true }),
    probe(syncUrl, { includeText: true }),
    probe(logoUrl),
    probe(iconUrl, { includeText: true }),
    probe(missingUrl),
  ]);
  probes.push(printPage, syncConfig, logo, icon, missing);

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

  let syncId: string | null = null;
  if (syncConfig.ok && syncConfig.text) {
    try {
      const parsed = parseSyncConfig(syncConfig.text);
      syncId = parsed.syncId || null;
      if (syncId) {
        findings.push({
          id: "sync-config-ok",
          category: "sync",
          severity: "pass",
          title: "พบ sync-config.json",
          detail: `คลังร่วมชี้ไปที่รหัส ${syncId} (${parsed.provider || "ไม่ระบุผู้ให้บริการ"})`,
          evidence: syncConfig.text.trim(),
        });
      } else {
        findings.push({
          id: "sync-config-empty",
          category: "sync",
          severity: "high",
          title: "sync-config.json ไม่มี syncId",
          detail: "เครื่องใหม่จะไม่มีคลังร่วม",
          fix: "ใส่ syncId ของถัง JSON ที่ใช้จริง",
        });
      }
    } catch (error) {
      findings.push({
        id: "sync-config-invalid",
        category: "sync",
        severity: "high",
        title: "sync-config.json อ่านไม่ได้",
        detail: error instanceof Error ? error.message : String(error),
        evidence: syncConfig.text.slice(0, 200),
      });
    }
  } else {
    findings.push({
      id: "sync-config-missing",
      category: "sync",
      severity: "high",
      title: "ไม่พบ /sync-config.json",
      detail: "แอปจะผูกคลังร่วมไม่สำเร็จบน GitHub Pages",
      evidence: syncConfig.error || `HTTP ${syncConfig.status}`,
    });
  }

  if (syncId) {
    const bin = await probe(`${CLOUD_API}/${encodeURIComponent(syncId)}`, {
      includeText: true,
    });
    probes.push(bin);

    const options = await probe(`${CLOUD_API}/${encodeURIComponent(syncId)}`, {
      method: "OPTIONS",
      headers: {
        Origin: originOf(target),
        "Access-Control-Request-Method": "PUT",
        "Access-Control-Request-Headers": "content-type",
      },
    });
    probes.push(options);

    if (!bin.ok || !bin.text) {
      findings.push({
        id: "cloud-down",
        category: "sync",
        severity: "high",
        title: "คลังคลาวด์เรียกไม่ได้",
        detail: "ซิงก์ข้ามเครื่องจะล้มเหลว",
        evidence: bin.error || `HTTP ${bin.status}`,
        fix: "ตรวจ extendsclass.com หรือย้ายไปที่เก็บที่มี auth",
      });
    } else {
      try {
        const snapshot = parseCloudSnapshot(bin.text);
        if (snapshot.contracts.length === 0) {
          findings.push({
            id: "cloud-empty",
            category: "sync",
            severity: "high",
            title: "คลังร่วมบนคลาวด์ว่างเปล่า",
            detail:
              "ถัง JSON สาธารณะมี contracts: [] — เครื่องใหม่ที่เปิดเว็บนี้จะไม่เห็นสัญญาที่บันทึกไว้บนเครื่องอื่น เว้นแต่เครื่องที่มีข้อมูลจะกดซิงก์แล้วดันขึ้นไป",
            evidence: bin.text.slice(0, 240),
            fix: "เปิดเว็บบนเครื่องที่มีสัญญาครบ แล้วกด «ซิงก์คลัง» จากนั้นรีเฟรชเครื่องอื่น",
          });
        } else {
          findings.push({
            id: "cloud-populated",
            category: "sync",
            severity: "pass",
            title: `คลังคลาวด์มี ${snapshot.contracts.length} สัญญา`,
            detail: `exportedAt=${snapshot.exportedAt}`,
          });
        }
      } catch (error) {
        findings.push({
          id: "cloud-parse",
          category: "sync",
          severity: "high",
          title: "รูปแบบคลังคลาวด์ไม่ใช่ JSON ของแอป",
          detail: error instanceof Error ? error.message : String(error),
          evidence: `${bin.contentType} · ${bin.text.slice(0, 180)}`,
        });
      }

      findings.push({
        id: "cloud-public-read",
        category: "security",
        severity: "critical",
        title: "คลังสัญญาสาธารณะ อ่านได้โดยไม่ต้องล็อกอิน",
        detail:
          "รหัสถังอยู่ใน /sync-config.json ที่ใครก็โหลดได้ และ GET ถัง JSON ไม่มีสิทธิ์ — ชื่อลูกค้า ที่อยู่ และราคาค่าจ้างถูกเปิดไว้บนอินเทอร์เน็ต",
        evidence: `${CLOUD_API}/${syncId}`,
        fix: "ย้ายคลังไปที่เก็บที่มี authentication (เช่น GitHub Gist ส่วนตัว, Cloudflare KV + โทเคน, หรือเซิร์ฟเวอร์ของบริษัท) และอย่า commit syncId สาธารณะ",
      });
    }

    if (options.status === 500) {
      findings.push({
        id: "cors-preflight-500",
        category: "sync",
        severity: "medium",
        title: "OPTIONS ของคลังคลาวด์ตอบ 500",
        detail:
          "เบราว์เซอร์จะบล็อก PUT แบบ application/json เพราะ preflight พัง — แอปเลี่ยงด้วย Content-Type: text/plain ซึ่งเปราะบางถ้าผู้ให้บริการเปลี่ยนนโยบาย",
        evidence: `HTTP ${options.status}`,
        fix: "ใช้ที่เก็บที่รองรับ CORS PUT จริง หรือซิงก์ผ่านเซิร์ฟเวอร์ของตัวเอง",
      });
    }
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

/** Findings from reading the SKC-Contact source (pattarish-web/SKC-Contact). */
export function sourceFindings(): Finding[] {
  return [
    {
      id: "logic-print-noopener",
      category: "logic",
      severity: "medium",
      title: "พิมพ์สัญญาพึ่ง sessionStorage ทั้งที่เปิดแท็บด้วย noopener",
      detail:
        "writePrintPayload() เก็บข้อมูลใน sessionStorage ของแท็บเดิม แล้ว window.open('/print', '_blank', 'noopener,noreferrer') ซึ่งแท็บใหม่ไม่ได้รับ sessionStorage ชุดนั้น หน้าพิมพ์ต้องถอยไปอ่านร่างใน localStorage — ถ้าดราฟต์ไม่ตรงกับที่กดพิมพ์ จะได้เอกสารผิดหรือหน้า «ไม่พบข้อมูลสัญญา»",
      evidence:
        "src/components/contract-app.tsx printContract() · src/lib/draft-store.ts PRINT_PAYLOAD_KEY",
      fix: "เอา noopener ออก หรือส่ง payload ผ่าน localStorage/IndexedDB ที่แชร์ข้ามแท็บได้แน่นอน แล้วค่อยลบหลังพิมพ์",
    },
    {
      id: "logic-contractor-position-fallback",
      category: "logic",
      severity: "medium",
      title: "ตำแหน่งผู้รับจ้างว่างแล้วไปใช้ตำแหน่งผู้ว่าจ้าง",
      detail:
        "buildContractContext() ใส่ contractor_position = inputs.contractor_position || inputs.client_position — ถ้าล้างช่องตำแหน่งฝ่ายรับจ้าง สัญญาที่พิมพ์จะโชว์ตำแหน่งของลูกค้าที่ลายเซ็นผู้รับจ้าง",
      evidence: "src/lib/contract.ts buildContractContext()",
      fix: "ใช้ค่าเริ่มต้นของบริษัท (เช่น ผู้จัดการ) เท่านั้น ห้ามยืมตำแหน่งลูกค้า",
    },
    {
      id: "logic-cloud-unauth-write",
      category: "security",
      severity: "critical",
      title: "ใครก็เขียนทับคลังร่วมได้",
      detail:
        "ถัง extendsclass.com ไม่มี API key — PUT ด้วย text/plain สำเร็จโดยไม่ต้องล็อกอิน แฮ็กเกอร์ที่รู้ syncId (ซึ่งอยู่ในไฟล์สาธารณะ) สามารถลบหรือใส่สัญญาปลอมให้ทุกเครื่องที่กดซิงก์",
      evidence: "PUT https://extendsclass.com/api/json-storage/bin/<syncId> → 200 โดยไม่มี Authorization",
      fix: "ใส่ที่เก็บที่มีสิทธิ์เขียน, หมุน syncId ใหม่หลังย้าย, และอย่าเผยรหัสใน GitHub Pages",
    },
    {
      id: "logic-cloud-pii",
      category: "security",
      severity: "high",
      title: "ข้อมูลลูกค้าไปอยู่ที่ผู้ให้บริการต่างประเทศโดยไม่มีสัญญา",
      detail:
        "คลังสัญญา (ชื่อ ที่อยู่ ผู้มีอำนาจ ราคา) ถูก gzip แล้ว POST ไป extendsclass.com ซึ่งเป็น JSON bin ฟรี ไม่ใช่ระบบของบริษัท",
      evidence: "src/lib/library-sync.ts CLOUD_API",
      fix: "โฮสต์คลังบนโครงสร้างของบริษัท หรืออย่างน้อยผู้ให้บริการที่ลง DPA ได้",
    },
    {
      id: "logic-attachments-local-only",
      category: "sync",
      severity: "low",
      title: "ไฟล์แนบไม่ขึ้นคลาวด์",
      detail:
        "ซิงก์คลาวด์ส่งเฉพาะตัวสัญญา — เอกสารแนบอยู่ใน IndexedDB ของเครื่องนั้นเครื่องเดียว ส่งออกไฟล์ JSON ถึงจะได้ไฟล์แนบ",
      evidence: "buildLibrarySnapshot({ forCloud: true }) ตัด attachments",
      fix: "บอกผู้ใช้ให้ชัดใน UI และแนะนำส่งออกไฟล์สำรองถ้ามีเอกสารสำคัญ",
    },
    {
      id: "logic-cloud-size-cap",
      category: "sync",
      severity: "low",
      title: "คลังคลาวด์จำกัดประมาณ 95 KB",
      detail:
        "ถ้าสัญญามากเกิน แอปจะโยนข้อผิดพลาด «คลังใหญ่เกินขีดจำกัดคลาวด์» แล้วเครื่องอื่นจะไม่ได้อัปเดต",
      evidence: "MAX_CLOUD_ENVELOPE_BYTES = 95_000",
      fix: "ย้ายไปที่เก็บที่ใหญ่กว่า หรือซิงก์เฉพาะสัญญาที่เปลี่ยน",
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

/** Confirmed in a live browser pass of the GitHub Pages site. */
export function uiPassFindings(): Finding[] {
  return [
    {
      id: "ui-print-works",
      category: "ui",
      severity: "pass",
      title: "ปุ่มพิมพ์เปิดเอกสารสัญญาได้",
      detail:
        "กดพิมพ์จากฟอร์มตัวอย่างแล้วได้หน้าสัญญา — แท็บใหม่ไม่มี sessionStorage แต่ดึงร่างจาก localStorage ได้ จึงยังพิมพ์ได้ในเคสปกติ",
      evidence: "เบราว์เซอร์: พิมพ์ / PDF → ตัวอย่างเอกสารครบ · /print/ ตรง ๆ ก็มีข้อมูลถ้ามีร่างในเครื่อง",
    },
    {
      id: "ui-empty-library",
      category: "ui",
      severity: "pass",
      title: "หน้าคลังว่างแสดงสถานะถูกต้อง",
      detail:
        "เมื่อถังร่วมว่าง หน้าแรกโชว์ «ยังไม่มีสัญญาที่บันทึก» และปุ่มเริ่มสร้างสัญญา ไม่ใช่หน้าขาวหรือข้อผิดพลาด JS",
      evidence: "ข้อความว่างใน ContractLibrary สอดคล้องกับ GET bin ที่คืน []",
    },
    {
      id: "ui-console-clean",
      category: "ui",
      severity: "pass",
      title: "ไม่มีข้อผิดพลาดในคอนโซลตอนใช้งานหลัก",
      detail:
        "โหลดคลัง สร้างสัญญา ใส่ข้อมูลตัวอย่าง และพิมพ์ ไม่มี JS error / ไฟล์ 404",
    },
    {
      id: "ui-mobile-desktop-layout",
      category: "ui",
      severity: "high",
      title: "มือถือยังใช้เลย์เอาต์เดสก์ท็อป — ปุ่มเล็กและเรียงแถวเดียว",
      detail:
        "หน้าคลังบนโทรศัพท์บีบแถบปุ่ม «รีวิวเอกสาร / สร้างสัญญาใหม่» และปุ่มในแต่ละการ์ด (รีวิว, คัดลอกต่อสัญญา, เปิดแก้ไข, ลบ) ให้อยู่แถวเดียวด้วย size sm (สูง 28px) ทั้งที่ควรเป็นกริด 2 คอลัมน์และเป้าสัมผัสอย่างน้อย 44px",
      evidence:
        "ภาพจากมือถือที่ส่งมา · src/components/contract-library.tsx ปุ่ม size=\"sm\" + flex-wrap · contract-app.tsx หัวเว็บเป็นแถวเดียว",
      fix: "แยกปุ่มหัวเว็บบนมือถือเป็นแถวที่สอง ปุ่มคลังเป็นกริด 2 คอลัมน์สูง 44px และซ่อนปุ่มสร้างสัญญาซ้ำในแถบเครื่องมือ",
    },
    {
      id: "ui-epoch-date-2513",
      category: "ui",
      severity: "medium",
      title: "วันที่แก้ล่าสุดโชว์ 1/1/2513",
      detail:
        "สัญญาที่ updatedAt เป็น 0 ถูกส่งเข้า new Date(0).toLocaleString(\"th-TH\") ซึ่งในโซนเวลาไทยคือ 1 มกราคม 2513 07:00:01 ไม่ใช่วันที่แก้จริง",
      evidence: "การ์ด SC-2569-09-015 ถึง 004 ในภาพมือถือ · contract-library.tsx",
      fix: "ถ้าค่าเวลาน้อยกว่าหนึ่งวันหลัง epoch ให้แสดง — แทน",
    },
    {
      id: "ui-folder-picker-desktop-only",
      category: "ui",
      severity: "info",
      title: "เลือกโฟลเดอร์ร่วมใช้ได้เฉพาะเดสก์ท็อป",
      detail:
        "showDirectoryPicker ไม่มีบน Safari/Chrome มือถือ — ปุ่มนี้จึงหายหรือกดแล้ว error บนโทรศัพท์ ซึ่งทำให้หน้าตาไม่เหมือนคอม",
      evidence: "src/lib/folder-sync.ts supportsFolderSync()",
    },
  ];
}
