"use client";

import { mmToPx, outerHeight, packBlocks } from "@/lib/paginate";
import {
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type PageBlock = {
  key: string;
  node: ReactNode;
  keepWithNext?: boolean;
};

const PAGE_MM = 297;

export function PagedArticle({
  header,
  continuedHeader,
  blocks,
}: {
  header: ReactNode;
  continuedHeader?: ReactNode;
  blocks: PageBlock[];
}) {
  const measureRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<number[][] | null>(null);
  const blockKey = blocks.map((block) => block.key).join("|");
  const followHeader = continuedHeader ?? header;

  useLayoutEffect(() => {
    const root = measureRef.current;
    if (!root) return;
    let cancelled = false;

    const measure = () => {
      if (cancelled) return;
      const pageEl = root.querySelector<HTMLElement>(".contract-page");
      const headers = [
        ...root.querySelectorAll<HTMLElement>(".contract-header"),
      ];
      const keep = [
        ...root.querySelectorAll<HTMLElement>("[data-print-block]"),
      ];
      if (!pageEl) return;

      const pagePx = mmToPx(PAGE_MM);
      const style = window.getComputedStyle(pageEl);
      const pad =
        (Number.parseFloat(style.paddingTop) || 0) +
        (Number.parseFloat(style.paddingBottom) || 0);
      const headerH = Math.max(0, ...headers.map((el) => outerHeight(el)));
      const capacity = Math.max(80, pagePx - pad - headerH - 16);
      const packed = packBlocks(
        keep.map((el, index) => ({
          height: outerHeight(el),
          keepWithNext: Boolean(blocks[index]?.keepWithNext),
        })),
        capacity
      );
      setPages(packed);
    };

    measure();
    void document.fonts?.ready.then(() => measure());
    const images = [...root.querySelectorAll("img")];
    images.forEach((img) => {
      if (!img.complete) img.addEventListener("load", measure, { once: true });
    });
    window.addEventListener("resize", measure);
    return () => {
      cancelled = true;
      window.removeEventListener("resize", measure);
      images.forEach((img) => img.removeEventListener("load", measure));
    };
  }, [blockKey, blocks]);

  return (
    <div data-paged-article={pages ? "ready" : "pending"}>
      <div
        ref={measureRef}
        aria-hidden
        data-measure="true"
        className="no-print pointer-events-none invisible absolute left-[-10000px] top-0 -z-10 w-[210mm] print:hidden"
      >
        <article className="contract-page !min-h-0 !shadow-none">
          {header}
          <div className="pointer-events-none absolute left-0 top-0 w-full opacity-0">
            {followHeader}
          </div>
          {blocks.map((block) => (
            <div key={block.key} data-print-block={block.key}>
              {block.node}
            </div>
          ))}
        </article>
      </div>
      {pages === null ? (
        <div className="contract-sheet">
          <article className="contract-page">
            {header}
            {blocks.map((block) => (
              <div key={block.key}>{block.node}</div>
            ))}
          </article>
        </div>
      ) : (
        pages.map((indices, pageIndex) => (
          <div
            key={`page-${pageIndex}`}
            className="contract-sheet"
            data-contract-paginated="true"
          >
            <article className="contract-page">
              {pageIndex === 0 ? header : followHeader}
              {indices.map((index) => {
                const block = blocks[index];
                if (!block) return null;
                return (
                  <div key={block.key} className="print-keep">
                    {block.node}
                  </div>
                );
              })}
            </article>
          </div>
        ))
      )}
    </div>
  );
}
