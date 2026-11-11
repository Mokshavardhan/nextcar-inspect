import { prisma } from "./prisma";

export const DEFAULT_PLATFORM_SETTINGS = {
  id: "default",
  companyName: "NextCar Inspect",
  companyTagline: "Precision Automotive Verification & Diagnostics",
  companyEmail: "support@nextcarinspect.in",
  companyPhone: "+91 80 4123 5500",
  companyAddress: "100 Feet Road, Indiranagar, Bengaluru, Karnataka 560038",
  currency: "INR",
  allowFullPayment: true,
  allowAdvancePayment: true,
  advancePercentage: 25,
  allowPayLater: true,
  cancellationWindowHours: 12,
  rescheduleWindowHours: 12,
  emailEnabled: true,
  whatsappEnabled: true,
};

export async function loadPublicPlatformData() {
  try {
    const [services, settings] = await Promise.all([
      prisma.service.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      }),
      prisma.platformSettings.findUnique({
        where: { id: "default" },
      }),
    ]);

    return {
      services,
      settings: settings || DEFAULT_PLATFORM_SETTINGS,
      dbConnected: true,
      dbError: null as string | null,
    };
  } catch (err) {
    console.error("Database connection error on public page:", err);
    return {
      services: [],
      settings: DEFAULT_PLATFORM_SETTINGS,
      dbConnected: false,
      dbError: err instanceof Error ? err.message : "Database connection unavailable",
    };
  }
}

