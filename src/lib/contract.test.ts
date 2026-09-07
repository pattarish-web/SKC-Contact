import assert from "node:assert/strict";
import {
  buildContractContext,
  emptyInputs,
  missingRequiredFields,
} from "./contract";
import {
  bahtText,
  endDateFromStart,
  formatThaiDate,
  monthsFromRange,
  num2wordsTh,
  round2,
} from "./thai";

assert.equal(num2wordsTh(0), "ศูนย์");
assert.equal(num2wordsTh(1), "หนึ่ง");
assert.equal(num2wordsTh(10), "สิบ");
assert.equal(num2wordsTh(11), "สิบเอ็ด");
assert.equal(num2wordsTh(21), "ยี่สิบเอ็ด");
assert.equal(num2wordsTh(100), "หนึ่งร้อย");
assert.equal(num2wordsTh(101), "หนึ่งร้อยเอ็ด");
assert.equal(num2wordsTh(1000), "หนึ่งพัน");
assert.equal(bahtText(360000), "สามแสนหกหมื่นบาทถ้วน");
assert.equal(bahtText(15000.99), "หนึ่งหมื่นห้าพันบาทเก้าสิบเก้าสตางค์");
assert.equal(round2(25200.840000000004), 25200.84);

assert.equal(formatThaiDate("2026-09-07"), "7 กันยายน 2569");
assert.equal(endDateFromStart("2026-10-01", 12), "2027-09-30");
assert.equal(endDateFromStart("2026-01-31", 1), "2026-02-27");
assert.equal(endDateFromStart("2024-01-31", 1), "2024-02-28");
assert.equal(endDateFromStart("2026-01-01", 1), "2026-01-31");
assert.equal(monthsFromRange("2026-10-01", "2027-09-30"), 12);
assert.equal(monthsFromRange("2026-10-01", "2026-09-01"), null);

const sample = emptyInputs({
  contract_no: "SC-2569-001",
  contract_date: "2026-09-07",
  client_name: "บริษัท ตัวอย่าง พลาซ่า จำกัด",
  client_address: "กรุงเทพฯ",
  client_authorized: "สมชาย",
  start_date: "2026-10-01",
  end_date: "2027-09-30",
  contract_months: "12",
  staff_count: "2",
  price_per_head: "15000",
});

const ctx = buildContractContext(sample);
assert.equal(ctx.staff_count, 2);
assert.equal(ctx.monthly_total, "30,000.00");
assert.equal(ctx.total_contract_price, "360,000.00");
assert.equal(ctx.total_price_text, "สามแสนหกหมื่นบาทถ้วน");
assert.equal(ctx.vat_amount, 25200);
assert.equal(missingRequiredFields(sample).length, 0);

const incomplete = emptyInputs({ client_name: "x" });
assert.ok(missingRequiredFields(incomplete).includes("เลขที่สัญญา"));

const inverted = emptyInputs({
  ...sample,
  start_date: "2026-10-01",
  end_date: "2026-09-01",
});
assert.ok(
  missingRequiredFields(inverted).includes("วันสิ้นสุดต้องไม่ก่อนวันเริ่ม")
);

console.log("contract helpers ok");
