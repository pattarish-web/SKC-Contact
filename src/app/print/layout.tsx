import type { Metadata } from "next";

/** Blank title so print footers do not show the app name. */
export const metadata: Metadata = {
  title: {
    absolute: "\u00a0",
  },
};

export default function PrintLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
