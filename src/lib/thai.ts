const DIGITS = [
  "ศูนย์",
  "หนึ่ง",
  "สอง",
  "สาม",
  "สี่",
  "ห้า",
  "หก",
  "เจ็ด",
  "แปด",
  "เก้า",
];

const THAI_MONTHS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

/** Convert 0–999,999 into Thai words (one ล้าน group). */
function readGroup(n: number): string {
  if (n <= 0) return "";

  const hundredThousands = Math.floor(n / 100000);
  const tenThousands = Math.floor((n % 100000) / 10000);
  const thousands = Math.floor((n % 10000) / 1000);
  const hundreds = Math.floor((n % 1000) / 100);
  const tens = Math.floor((n % 100) / 10);
  const ones = n % 10;

  const parts: string[] = [];
  if (hundredThousands) parts.push(DIGITS[hundredThousands] + "แสน");
  if (tenThousands) parts.push(DIGITS[tenThousands] + "หมื่น");
  if (thousands) parts.push(DIGITS[thousands] + "พัน");
  if (hundreds) parts.push(DIGITS[hundreds] + "ร้อย");

  if (tens === 1) parts.push("สิบ");
  else if (tens === 2) parts.push("ยี่สิบ");
  else if (tens > 2) parts.push(DIGITS[tens] + "สิบ");

  if (ones === 1) {
    const hasHigherInGroup =
      tens > 0 ||
      hundreds > 0 ||
      thousands > 0 ||
      tenThousands > 0 ||
      hundredThousands > 0;
    parts.push(hasHigherInGroup ? "เอ็ด" : "หนึ่ง");
  } else if (ones > 0) {
    parts.push(DIGITS[ones]);
  }

  return parts.join("");
}

/** Integer to Thai words, matching num2words(lang='th') grouping by ล้าน. */
export function num2wordsTh(value: number): string {
  const n = Math.trunc(value);
  if (n === 0) return "ศูนย์";
  if (n < 0) return "ลบ" + num2wordsTh(-n);

  const MILLION = 1_000_000;
  const groups: string[] = [];
  let remaining = n;
  let scale = 0;

  while (remaining > 0) {
    const group = remaining % MILLION;
    if (group > 0) {
      groups.unshift(readGroup(group) + "ล้าน".repeat(scale));
    }
    remaining = Math.floor(remaining / MILLION);
    scale += 1;
  }

  return groups.join("");
}

export function round2(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export function bahtText(amount: number): string {
  const rounded = round2(amount);
  const baht = Math.trunc(rounded);
  const satang = Math.round((rounded - baht) * 100);
  if (satang === 0) return num2wordsTh(baht) + "บาทถ้วน";
  return `${num2wordsTh(baht)}บาท${num2wordsTh(satang)}สตางค์`;
}

export function formatMoney(amount: number): string {
  return round2(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatThaiDate(isoDate: string): string {
  if (!isoDate) return "";
  const d = parseISODate(isoDate);
  if (!d) return isoDate;
  const day = d.getDate();
  const month = THAI_MONTHS[d.getMonth()];
  const year = d.getFullYear() + 543;
  return `${day} ${month} ${year}`;
}

/** Human timestamp for saved contracts. Epoch/missing values must not show 1/1/2513. */
export function formatUpdatedAt(value: number | null | undefined): string {
  const ms = Number(value);
  if (!Number.isFinite(ms) || ms < 86_400_000) {
    return "—";
  }
  return new Date(ms).toLocaleString("th-TH");
}

export function parseISODate(isoDate: string): Date | null {
  if (!isoDate) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const d = new Date(year, month - 1, day);
  if (
    d.getFullYear() !== year ||
    d.getMonth() !== month - 1 ||
    d.getDate() !== day
  ) {
    return null;
  }
  return d;
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

/** End date = start + months − 1 day, without month-end overflow. */
export function endDateFromStart(startISO: string, months: number): string {
  const start = parseISODate(startISO);
  if (!start || !Number.isFinite(months) || months <= 0) return "";

  const totalMonths = start.getFullYear() * 12 + start.getMonth() + months;
  const year = Math.floor(totalMonths / 12);
  const monthIndex = totalMonths % 12;
  const day = Math.min(start.getDate(), daysInMonth(year, monthIndex));
  const endMonthSameDay = new Date(year, monthIndex, day);
  endMonthSameDay.setDate(endMonthSameDay.getDate() - 1);
  return toISODate(endMonthSameDay);
}

/** Inclusive calendar span in whole months, or null if invalid/inverted. */
export function monthsFromRange(
  startISO: string,
  endISO: string
): number | null {
  const start = parseISODate(startISO);
  const end = parseISODate(endISO);
  if (!start || !end || end < start) return null;
  const endPlusOne = new Date(end);
  endPlusOne.setDate(endPlusOne.getDate() + 1);
  let months =
    (endPlusOne.getFullYear() - start.getFullYear()) * 12 +
    (endPlusOne.getMonth() - start.getMonth());
  if (endPlusOne.getDate() < start.getDate()) months -= 1;
  return Math.max(1, months);
}

export function buddhistYear(d = new Date()): number {
  return d.getFullYear() + 543;
}
