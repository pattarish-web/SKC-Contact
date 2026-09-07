/** CSS mm → px conversion is handled by the browser when we set 210mm / 297mm. */

/** Metrics used both when measuring fit and in @media print. */
export const PRINT_FIT = {
  padding: "12mm 14mm",
  fontSize: "13px",
  lineHeight: "1.55",
} as const;

export function scaleToFit(
  contentWidth: number,
  contentHeight: number,
  boxWidth: number,
  boxHeight: number
): number {
  if (
    contentWidth <= 0 ||
    contentHeight <= 0 ||
    boxWidth <= 0 ||
    boxHeight <= 0
  ) {
    return 1;
  }
  return Math.min(1, boxWidth / contentWidth, boxHeight / contentHeight);
}

/**
 * Shrink each contract sheet so it fits one A4 page (width and height).
 * Applies print padding/type size before measuring so scale matches paper.
 * Returns a restore function for after printing.
 */
export function fitContractPagesToA4(): () => void {
  if (typeof document === "undefined") return () => undefined;

  const sheets = Array.from(
    document.querySelectorAll<HTMLElement>(".contract-sheet")
  );
  const restores: Array<() => void> = [];

  for (const sheet of sheets) {
    const inner = sheet.querySelector<HTMLElement>(".contract-page");
    if (!inner) continue;

    const prevSheet = {
      width: sheet.style.width,
      height: sheet.style.height,
      overflow: sheet.style.overflow,
      boxSizing: sheet.style.boxSizing,
    };
    const prevInner = {
      transform: inner.style.transform,
      transformOrigin: inner.style.transformOrigin,
      width: inner.style.width,
      maxWidth: inner.style.maxWidth,
      padding: inner.style.padding,
      fontSize: inner.style.fontSize,
      lineHeight: inner.style.lineHeight,
      boxShadow: inner.style.boxShadow,
    };

    sheet.style.boxSizing = "border-box";
    sheet.style.width = "210mm";
    sheet.style.height = "297mm";
    sheet.style.overflow = "hidden";
    inner.style.transform = "none";
    inner.style.width = "210mm";
    inner.style.maxWidth = "none";
    inner.style.padding = PRINT_FIT.padding;
    inner.style.fontSize = PRINT_FIT.fontSize;
    inner.style.lineHeight = PRINT_FIT.lineHeight;
    inner.style.boxShadow = "none";

    const boxW = sheet.clientWidth;
    const boxH = sheet.clientHeight;
    const contentW = Math.max(inner.scrollWidth, inner.offsetWidth);
    const contentH = Math.max(inner.scrollHeight, inner.offsetHeight);
    const scale = scaleToFit(contentW, contentH, boxW, boxH);

    inner.style.transformOrigin = "top left";
    inner.style.transform = `scale(${scale})`;
    inner.style.width = `${boxW / scale}px`;

    restores.push(() => {
      sheet.style.width = prevSheet.width;
      sheet.style.height = prevSheet.height;
      sheet.style.overflow = prevSheet.overflow;
      sheet.style.boxSizing = prevSheet.boxSizing;
      inner.style.transform = prevInner.transform;
      inner.style.transformOrigin = prevInner.transformOrigin;
      inner.style.width = prevInner.width;
      inner.style.maxWidth = prevInner.maxWidth;
      inner.style.padding = prevInner.padding;
      inner.style.fontSize = prevInner.fontSize;
      inner.style.lineHeight = prevInner.lineHeight;
      inner.style.boxShadow = prevInner.boxShadow;
    });
  }

  return () => {
    restores.forEach((fn) => fn());
  };
}

let printJob = 0;

/** Suppress browser print header/footer text where the page can control it. */
export function printClean(): void {
  if (typeof window === "undefined") return;

  const job = ++printJob;
  const previousTitle = document.title;
  document.title = "\u00a0";
  const undoFit = fitContractPagesToA4();
  let restored = false;

  const restore = () => {
    if (restored || job !== printJob) return;
    restored = true;
    undoFit();
    document.title = previousTitle;
    window.removeEventListener("afterprint", restore);
  };

  window.addEventListener("afterprint", restore);
  window.requestAnimationFrame(() => {
    window.print();
  });
  window.setTimeout(restore, 60_000);
}

export function openPrintWindow(printPath: string): void {
  if (typeof window === "undefined") return;
  const popup = window.open(printPath, "_blank");
  if (!popup) {
    window.location.assign(printPath);
  }
}
