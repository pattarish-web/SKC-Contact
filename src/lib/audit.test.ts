import assert from "node:assert/strict";
import {
  extractReferencedPaths,
  normalizeTarget,
  parseCloudSnapshot,
  parseSyncConfig,
  resolveAssetUrl,
  sourceFindings,
  summarize,
  uiPassFindings,
  type Finding,
} from "./audit";

assert.equal(
  normalizeTarget("https://pattarish-web.github.io/SKC-Contact"),
  "https://pattarish-web.github.io/SKC-Contact/"
);
assert.equal(
  normalizeTarget("not a url"),
  "https://pattarish-web.github.io/SKC-Contact/"
);

const html = `<html lang="th"><link href="/SKC-Contact/_next/static/chunks/app.css"><script src="/SKC-Contact/_next/static/chunks/app.js"></script><img src="data:image/png;base64,xx">`;
const paths = extractReferencedPaths(html);
assert.ok(paths.includes("/SKC-Contact/_next/static/chunks/app.css"));
assert.ok(paths.includes("/SKC-Contact/_next/static/chunks/app.js"));
assert.ok(!paths.some((p) => p.startsWith("data:")));

assert.equal(
  resolveAssetUrl(
    "https://pattarish-web.github.io/SKC-Contact/",
    "/SKC-Contact/_next/static/x.js"
  ),
  "https://pattarish-web.github.io/SKC-Contact/_next/static/x.js"
);

const sync = parseSyncConfig(`{"syncId":"abaeebd","provider":"extendsclass"}`);
assert.equal(sync.syncId, "abaeebd");
assert.equal(sync.provider, "extendsclass");

const emptyBin = parseCloudSnapshot(
  `{"version":1,"exportedAt":0,"contracts":[],"attachments":[]}`
);
assert.equal(emptyBin.contracts.length, 0);

assert.throws(() =>
  parseCloudSnapshot(`{"encoding":"gzip-base64","payload":"xx"}`)
);

const findings: Finding[] = [
  {
    id: "a",
    category: "http",
    severity: "critical",
    title: "x",
    detail: "y",
  },
  {
    id: "b",
    category: "http",
    severity: "pass",
    title: "x",
    detail: "y",
  },
];
assert.deepEqual(summarize(findings), {
  critical: 1,
  high: 0,
  medium: 0,
  low: 0,
  pass: 1,
  info: 0,
});

const staticIds = sourceFindings().map((f) => f.id);
assert.ok(staticIds.includes("logic-pending-poll"));
assert.ok(staticIds.includes("logic-sheet-unauth-write"));
assert.ok(staticIds.includes("logic-print-payload"));
assert.ok(!staticIds.includes("logic-cloud-unauth-write"));

const uiIds = uiPassFindings().map((f) => f.id);
assert.ok(uiIds.includes("ui-print-works"));
assert.ok(uiIds.includes("ui-empty-library"));
assert.ok(uiIds.includes("ui-mobile-library"));
assert.ok(uiIds.includes("ui-epoch-date"));
assert.ok(!uiIds.includes("ui-mobile-desktop-layout"));

const epochThai = new Date(0).toLocaleString("th-TH");
assert.match(epochThai, /2513|1970/);

console.log("audit.test.ts: all assertions passed");
