import { withBasePath } from "@/lib/paths";
import { cn } from "cn";

const LOGO_SRC = withBasePath("/logo-sangkan-clean.png");

type BrandMarkProps = {
  className?: string;
  /** compact = app chrome; contract = document header on every page */
  variant?: "compact" | "contract";
};

export function BrandMark({
  className,
  variant = "compact",
}: BrandMarkProps) {
  const isContract = variant === "contract";

  return (
    // eslint-disable-next-line @next/next/no-img-element -- static export + print-friendly
    <img
      src={LOGO_SRC}
      alt="สั่งการ คลีน"
      width={1026}
      height={173}
      className={cn(
        "shrink-0 object-contain object-left",
        isContract
          ? "h-9 w-auto max-w-[10.5rem] sm:h-10 sm:max-w-[12rem] print:h-8 print:max-w-[10rem]"
          : "h-8 w-auto max-w-[9.5rem] sm:h-9 sm:max-w-[11rem]",
        className
      )}
    />
  );
}
