import { AuditDashboard } from "@/components/audit-dashboard";
import { DEFAULT_TARGET, runAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  let initialError: string | null = null;
  let initialReport = null;
  try {
    initialReport = await runAudit(DEFAULT_TARGET);
  } catch (error) {
    initialError =
      error instanceof Error ? error.message : "ตรวจเว็บไม่สำเร็จในรอบแรก";
  }

  return (
    <AuditDashboard
      defaultTarget={DEFAULT_TARGET}
      initialReport={initialReport}
      initialError={initialError}
    />
  );
}
