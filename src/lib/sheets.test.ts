import assert from "node:assert/strict";
import {
  normalizeSheetsWebAppUrl,
  parseGvizText,
  rowToContract,
  rowsToContracts,
} from "./sheets";

const gviz = `/*O_o*/
google.visualization.Query.setResponse({"version":"0.6","reqId":"0","status":"ok","table":{"cols":[{"id":"A","label":"id","type":"string"},{"id":"B","label":"contract_no","type":"string"},{"id":"C","label":"client_name","type":"string"},{"id":"D","label":"json","type":"string"},{"id":"E","label":"updatedAt","type":"number"}],"rows":[{"c":[{"v":"contract_1"},{"v":"SC-2569-09-001"},{"v":"บริษัท ตัวอย่าง"},{"v":"{\\"id\\":\\"contract_1\\",\\"inputs\\":{\\"contract_no\\":\\"SC-2569-09-001\\",\\"client_name\\":\\"บริษัท ตัวอย่าง\\"},\\"createdAt\\":1750000000000,\\"updatedAt\\":1750000001000,\\"notes\\":\\"\\"}"},{"v":1750000001000}]}]}});`;

const rows = parseGvizText(gviz);
assert.equal(rows.length, 1);
assert.equal(rows[0]?.id, "contract_1");

const contracts = rowsToContracts(rows);
assert.equal(contracts[0]?.inputs.client_name, "บริษัท ตัวอย่าง");
assert.equal(contracts[0]?.updatedAt, 1750000001000);

const fromColumns = rowToContract({
  id: "contract_2",
  contract_no: "SC-2569-09-002",
  client_name: "ลูกค้าคอลัมน์",
  createdAt: "1750000002000",
  updatedAt: "1750000002000",
  notes: "",
});
assert.equal(fromColumns?.inputs.client_name, "ลูกค้าคอลัมน์");

const empty = parseGvizText(
  `google.visualization.Query.setResponse({"version":"0.6","status":"ok","table":{"cols":[{"id":"Col0","label":"","type":"string"}],"rows":[]}});`
);
assert.equal(empty.length, 0);

const unlabeledHeader = `google.visualization.Query.setResponse({"version":"0.6","status":"ok","table":{"cols":[{"id":"A","label":"","type":"string"},{"id":"B","label":"","type":"string"},{"id":"C","label":"","type":"string"},{"id":"N","label":"","type":"string"}],"rows":[{"c":[{"v":"id"},{"v":"contract_no"},{"v":"client_name"},{"v":"json"}]},{"c":[{"v":"contract_9"},{"v":"SC-2569-09-009"},{"v":"จากชีต"},{"v":"{\\"id\\":\\"contract_9\\",\\"inputs\\":{\\"client_name\\":\\"จากชีต\\"},\\"createdAt\\":1750000003000,\\"updatedAt\\":1750000003000,\\"notes\\":\\"\\"}"}]}]}});`;
const remapped = rowsToContracts(parseGvizText(unlabeledHeader));
assert.equal(remapped.length, 1);
assert.equal(remapped[0]?.id, "contract_9");
assert.equal(remapped[0]?.inputs.client_name, "จากชีต");

assert.equal(
  normalizeSheetsWebAppUrl(
    "https://script.google.com/macros/s/abc"
  ),
  "https://script.google.com/macros/s/abc/exec"
);
assert.equal(
  normalizeSheetsWebAppUrl(
    "https://script.google.com/macros/s/abc/exec/"
  ),
  "https://script.google.com/macros/s/abc/exec"
);

const dated = rowToContract({
  id: "contract_date",
  contract_no: "SC-2569-09-010",
  createdAt: "2026-01-15T00:00:00.000Z",
  updatedAt: "2026-01-16T00:00:00.000Z",
});
assert.ok((dated?.updatedAt || 0) > 86_400_000);

console.log("sheets.test.ts: all assertions passed");
