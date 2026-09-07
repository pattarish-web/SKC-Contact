/** CSS mm → px conversion is handled by the browser when we set 210mm / 297mm. */

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

let printJob = 0;

/** Suppress browser print header/footer text where the page can control it. */
export function printClean(): void {
  if (typeof window === "undefined") return;

  const job = ++printJob;
  const previousTitle = document.title;
  document.title = "\u00a0";
  let restored = false;

  const restore = () => {
    if (restored || job !== printJob) return;
    restored = true;
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
