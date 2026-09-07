import assert from "node:assert/strict";
import {
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

console.log("sheets.test.ts: all assertions passed");
