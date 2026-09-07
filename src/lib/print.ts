/** Suppress browser print header/footer text where the page can control it. */
export function printClean(): void {
  if (typeof window === "undefined") return;

  const previousTitle = document.title;
  // Blank title removes the document name from Chrome/Edge print footers.
  document.title = "\u00a0";

  const restore = () => {
    document.title = previousTitle;
    window.removeEventListener("afterprint", restore);
  };

  window.addEventListener("afterprint", restore);
  window.print();
  window.setTimeout(restore, 60_000);
}
