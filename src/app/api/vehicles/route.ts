import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth";

export async function GET() {
  const auth = await requireApiUser(["CUSTOMER", "ADMIN"]);
  if (auth.errorResponse) return auth.errorResponse;

  const vehicles = await prisma.vehicle.findMany({
    where: auth.user.role === "ADMIN" ? {} : { customerId: auth.user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ vehicles });
}

const vehicleSchema = z.object({
  vehicleType: z.enum(["CAR", "SUV", "BIKE"]),
  manufacturer: z.string().trim().min(1),
  model: z.string().trim().min(1),
  manufacturingYear: z.coerce.number().int().min(1960).max(new Date().getFullYear() + 1),
  registrationNumber: z.string().trim().min(2).toUpperCase(),
  fuelType: z.string().trim().min(1),
  transmissionType: z.string().trim().min(1),
  notes: z.string().trim().optional(),
});

export async function POST(request: Request) {
  const auth = await requireApiUser(["CUSTOMER", "ADMIN"]);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await request.json();
    const parsed = vehicleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid vehicle details" },
        { status: 400 }
      );
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        customerId: auth.user.id,
        ...parsed.data,
        notes: parsed.data.notes || null,
      },
    });

    return NextResponse.json({ vehicle }, { status: 201 });
  } catch (err) {
    console.error("Create vehicle error:", err);
    return NextResponse.json({ error: "Failed to save vehicle" }, { status: 500 });
  }
}

