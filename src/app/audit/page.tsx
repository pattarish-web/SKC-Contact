"use client";

import { AuditDashboard } from "@/components/audit-dashboard";
import { DEFAULT_TARGET } from "@/lib/audit";

export default function AuditPage() {
  return (
    <AuditDashboard
      defaultTarget={DEFAULT_TARGET}
      initialReport={null}
      initialError={null}
    />
  );
}
