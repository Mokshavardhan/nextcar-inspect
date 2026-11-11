import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser, getDashboardPathForRole } from "@/lib/auth";
import { AdminDashboardClient } from "@/components/dashboard/admin/AdminDashboardClient";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard/admin");
  if (user.role !== "ADMIN") redirect(getDashboardPathForRole(user.role));

  return <AdminDashboardClient initialUser={user} />;
}

