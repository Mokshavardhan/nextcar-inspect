import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser, getDashboardPathForRole } from "@/lib/auth";
import { CustomerDashboardClient } from "@/components/dashboard/CustomerDashboardClient";

export const dynamic = "force-dynamic";

export default async function CustomerDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard/customer");
  if (user.role !== "CUSTOMER") redirect(getDashboardPathForRole(user.role));

  return <CustomerDashboardClient initialUser={user} />;
}

