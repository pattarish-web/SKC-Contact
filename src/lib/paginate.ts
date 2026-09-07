export type PackBlock = {
  height: number;
  keepWithNext?: boolean;
};

/** Height of this block plus any following keepWithNext chain. */
export function chainHeight(blocks: PackBlock[], start: number): number {
  let total = 0;
  for (let index = start; index < blocks.length; index++) {
    total += Math.max(0, blocks[index].height);
    if (!blocks[index].keepWithNext) break;
  }
  return total;
}

/** Pack keep-together blocks into pages that do not exceed `capacity`. */
export function packBlocks(blocks: PackBlock[], capacity: number): number[][] {
  if (blocks.length === 0) return [[]];
  const limit = Math.max(capacity, 1);
  const pages: number[][] = [];
  let current: number[] = [];
  let used = 0;

  const pushPage = () => {
    if (current.length === 0) return;
    pages.push(current);
    current = [];
    used = 0;
  };

  blocks.forEach((block, index) => {
    const height = Math.max(0, block.height);
    const needed = block.keepWithNext ? chainHeight(blocks, index) : height;
    const fits = current.length === 0 || used + needed <= limit;
    if (!fits) pushPage();
    current.push(index);
    used += height;
  });

  if (current.length) pages.push(current);
  return pages.length > 0 ? pages : [[]];
}

export function mmToPx(mm: number): number {
  if (typeof document === "undefined") return (mm * 96) / 25.4;
  const probe = document.createElement("div");
  probe.style.height = `${mm}mm`;
  probe.style.position = "absolute";
  probe.style.visibility = "hidden";
  document.body.appendChild(probe);
  const px = probe.offsetHeight;
  probe.remove();
  return px || (mm * 96) / 25.4;
}

export function outerHeight(el: HTMLElement): number {
  const style = window.getComputedStyle(el);
  const margin =
    (Number.parseFloat(style.marginTop) || 0) +
    (Number.parseFloat(style.marginBottom) || 0);
  return el.offsetHeight + margin;
}
