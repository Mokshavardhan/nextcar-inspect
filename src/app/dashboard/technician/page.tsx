import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser, getDashboardPathForRole } from "@/lib/auth";
import { TechnicianDashboardClient } from "@/components/dashboard/TechnicianDashboardClient";

export const dynamic = "force-dynamic";

export default async function TechnicianDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard/technician");
  if (user.role !== "TECHNICIAN") redirect(getDashboardPathForRole(user.role));

  return <TechnicianDashboardClient initialUser={user} />;
}

