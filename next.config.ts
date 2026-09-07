import type { NextConfig } from "next";

const isGithubPages = process.env.GITHUB_PAGES === "true";
const repoName = process.env.GITHUB_REPOSITORY?.split("/")[1] || "SKC-Contact";
const basePath = isGithubPages ? `/${repoName}` : "";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost", "172.30.0.2"],
  env: {
    NEXT_PUBLIC_BASE_PATH: process.env.NEXT_PUBLIC_BASE_PATH || basePath,
    NEXT_PUBLIC_SHEET_ID:
      process.env.NEXT_PUBLIC_SHEET_ID ||
      "1Os1IdvKUPhuzBS0o765T3W_vnllgr_x03lfgfta2Tow",
  },
  ...(isGithubPages
    ? {
        output: "export" as const,
        basePath,
        assetPrefix: `${basePath}/`,
        images: { unoptimized: true },
        trailingSlash: true,
      }
    : {}),
};

export default nextConfig;
