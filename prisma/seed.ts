import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding NextCar Inspect baseline configuration to Supabase PostgreSQL...");

  // 1. Platform Settings (Indian Rupee INR default)
  await prisma.platformSettings.upsert({
    where: { id: "default" },
    update: {
      companyName: "NextCar Inspect",
      companyTagline: "Precision Automotive Verification & Diagnostics",
      companyEmail: "support@nextcarinspect.in",
      companyPhone: "+91 80 4123 5500",
      companyAddress: "100 Feet Road, Indiranagar, Bengaluru, Karnataka 560038",
      currency: "INR",
    },
    create: {
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
    },
  });

  // 2. Role Accounts for Local Testing & Operations (No fake bookings or revenue seeded)
  const adminHash = await bcrypt.hash("Admin@1234", 10);
  const techHash = await bcrypt.hash("Tech@1234", 10);
  const custHash = await bcrypt.hash("Customer@1234", 10);

  await prisma.user.upsert({
    where: { email: "admin@nextcarinspect.com" },
    update: {},
    create: {
      name: "Ananya Rao",
      email: "admin@nextcarinspect.com",
      passwordHash: adminHash,
      role: "ADMIN",
      phone: "+91 98450 10101",
      whatsappNumber: "+919845010101",
      isActive: true,
    },
  });

  await prisma.user.upsert({
    where: { email: "marcus.tech@nextcarinspect.com" },
    update: {},
    create: {
      name: "Karthik Nair",
      email: "marcus.tech@nextcarinspect.com",
      passwordHash: techHash,
      role: "TECHNICIAN",
      phone: "+91 98450 20202",
      whatsappNumber: "+919845020202",
      isActive: true,
      technicianProfile: {
        create: {
          employeeCode: "TECH-101",
          specialties: "Pre-Purchase Diagnostics, Sedan & SUV Powertrain, OBD-II",
          serviceCity: "Bengaluru, Karnataka",
          availabilityStatus: "AVAILABLE",
          rating: 4.9,
          bio: "Certified automotive diagnostic specialist with 10+ years of pre-purchase and engine bay inspection experience.",
        },
      },
    },
  });

  await prisma.user.upsert({
    where: { email: "priya.tech@nextcarinspect.com" },
    update: {},
    create: {
      name: "Priya Deshmukh",
      email: "priya.tech@nextcarinspect.com",
      passwordHash: techHash,
      role: "TECHNICIAN",
      phone: "+91 98450 30303",
      whatsappNumber: "+919845030303",
      isActive: true,
      technicianProfile: {
        create: {
          employeeCode: "TECH-102",
          specialties: "EV & Hybrid Systems, Paint Thickness & Structural Integrity",
          serviceCity: "Bengaluru & Mysuru, Karnataka",
          availabilityStatus: "AVAILABLE",
          rating: 4.95,
          bio: "EV/Hybrid diagnostics and structural body-integrity specialist.",
        },
      },
    },
  });

  await prisma.user.upsert({
    where: { email: "alex.customer@example.com" },
    update: {},
    create: {
      name: "Rohan Sharma",
      email: "alex.customer@example.com",
      passwordHash: custHash,
      role: "CUSTOMER",
      phone: "+91 98450 40404",
      whatsappNumber: "+919845040404",
      isActive: true,
      customerProfile: {
        create: {
          address: "12th Main Road, HAL 2nd Stage, Indiranagar",
          city: "Bengaluru",
          state: "Karnataka",
          postalCode: "560038",
        },
      },
    },
  });

  // 3. Inspection Services (INR Pricing)
  const servicesData = [
    {
      name: "Full Vehicle Inspection",
      slug: "full-vehicle-inspection",
      description:
        "Our flagship bumper-to-bumper 150+ point mechanical, diagnostic, structural, paint-depth, and documentation audit for complete peace of mind.",
      price: 2499,
      durationMinutes: 90,
      sortOrder: 1,
      checklistSummary: JSON.stringify([
        "Full exterior body & digital paint thickness gauge check",
        "Complete OBD-II computer fault & live sensor scan",
        "Road test covering brakes, suspension, clutch & transmission",
        "Engine compression cues, fluid analysis & leak check",
        "RC, Insurance, PUC & service history verification",
      ]),
    },
    {
      name: "Pre-Purchase Vehicle Inspection",
      slug: "pre-purchase-vehicle-inspection",
      description:
        "Designed specifically for buyers evaluating a vehicle before closing a deal. Uncovers hidden accident repairs, odometer tampering, and costly repairs.",
      price: 1999,
      durationMinutes: 75,
      sortOrder: 2,
      checklistSummary: JSON.stringify([
        "Frame integrity, repainted panel & flood-damage check",
        "OBD-II diagnostic history & cleared fault-code detection",
        "Engine, cooling system, battery & drivetrain inspection",
        "Interior electronics, AC performance & safety airbags check",
        "Fair-condition summary to negotiate with confidence",
      ]),
    },
    {
      name: "Basic Vehicle Inspection",
      slug: "basic-vehicle-inspection",
      description:
        "Fast, essential health check for daily commuters or routine highway-trip safety verification covering core mechanical and safety systems.",
      price: 999,
      durationMinutes: 45,
      sortOrder: 3,
      checklistSummary: JSON.stringify([
        "Tyre tread depth, brake pad wear & wheel inspection",
        "Battery voltage, alternator charge & fluid levels",
        "Exterior lights, wipers, windshield & safety belts",
        "Basic engine noise & under-hood leak inspection",
      ]),
    },
    {
      name: "Used Car Inspection",
      slug: "used-car-inspection",
      description:
        "Tailored evaluation for pre-owned cars and SUVs to detect wear-and-tear items, upcoming maintenance needs, and compliance records.",
      price: 1499,
      durationMinutes: 60,
      sortOrder: 4,
      checklistSummary: JSON.stringify([
        "Exterior dent/scratch mapping & glass verification",
        "Engine, transmission shifting & suspension wear test",
        "AC cooling efficiency & infotainment diagnostics",
        "Registration certificate, insurance & PUC audit",
      ]),
    },
  ];

  for (const s of servicesData) {
    await prisma.service.upsert({
      where: { slug: s.slug },
      update: s,
      create: s,
    });
  }

  // 4. Availability Slots
  const existingSlots = await prisma.availabilitySlot.count();
  if (existingSlots === 0) {
    const slots = [
      { label: "09:00 AM - 10:30 AM", startTime: "09:00", endTime: "10:30", maxBookingsPerSlot: 2, sortOrder: 1 },
      { label: "11:00 AM - 12:30 PM", startTime: "11:00", endTime: "12:30", maxBookingsPerSlot: 2, sortOrder: 2 },
      { label: "02:00 PM - 03:30 PM", startTime: "14:00", endTime: "15:30", maxBookingsPerSlot: 2, sortOrder: 3 },
      { label: "04:00 PM - 05:30 PM", startTime: "16:00", endTime: "17:30", maxBookingsPerSlot: 2, sortOrder: 4 },
    ];
    for (const sl of slots) {
      await prisma.availabilitySlot.create({ data: sl });
    }
  }

  // 5. Inspection Categories & All 26 Required Checklist Items
  const checklistTree = [
    {
      code: "EXTERIOR",
      name: "Exterior Inspection",
      description: "Body panels, paint consistency, glass, lighting, and wheel assembly.",
      sortOrder: 1,
      items: [
        { code: "EXT_BODY", label: "Body condition", description: "Panel alignment, structural gaps, and rust check" },
        { code: "EXT_PAINT", label: "Paint condition", description: "Paint gloss, color match, and repaint indicators" },
        { code: "EXT_SCRATCHES", label: "Scratches and dents", description: "Surface abrasions, dings, and bumper scuffs" },
        { code: "EXT_WINDSHIELD", label: "Windshield condition", description: "Cracks, chips, wipers, and washer jets" },
        { code: "EXT_LIGHTS", label: "Headlights and taillights", description: "High/low beams, indicators, brake & fog lamps" },
        { code: "EXT_TYRES", label: "Tyres and wheels", description: "Tread depth, uneven wear, sidewalls, and alloy condition" },
      ],
    },
    {
      code: "INTERIOR",
      name: "Interior Inspection",
      description: "Cabin upholstery, restraints, climate control, and electronics.",
      sortOrder: 2,
      items: [
        { code: "INT_DASHBOARD", label: "Dashboard", description: "Instrument cluster, warning lights, and trim condition" },
        { code: "INT_SEATS", label: "Seats", description: "Upholstery condition, bolstering, and seat adjusters" },
        { code: "INT_SEATBELTS", label: "Seat belts", description: "Retraction, latch locking, and webbing integrity" },
        { code: "INT_AC", label: "AC system", description: "Cooling temperature, blower speed, and cabin airflow" },
        { code: "INT_INFOTAINMENT", label: "Infotainment system", description: "Touchscreen, audio output, Bluetooth, and camera" },
        { code: "INT_ELECTRICAL", label: "Electrical controls", description: "Power windows, mirrors, central locking, and switches" },
      ],
    },
    {
      code: "ENGINE",
      name: "Engine Inspection",
      description: "Powertrain bay health, fluids, charging system, and acoustics.",
      sortOrder: 3,
      items: [
        { code: "ENG_CONDITION", label: "Engine condition", description: "Idle smoothness, hoses, belts, and mounts" },
        { code: "ENG_OIL_LEAK", label: "Oil leakage", description: "Valve cover, oil pan, and gasket seepage check" },
        { code: "ENG_COOLANT", label: "Coolant condition", description: "Reservoir level, color clarity, and radiator hoses" },
        { code: "ENG_BATTERY", label: "Battery condition", description: "Resting/charging voltage and terminal corrosion" },
        { code: "ENG_NOISE", label: "Engine noise", description: "Knocking, belt squeal, or abnormal valve train sound" },
      ],
    },
    {
      code: "MECHANICAL",
      name: "Mechanical Inspection",
      description: "Drivetrain dynamics, braking response, and chassis control.",
      sortOrder: 4,
      items: [
        { code: "MECH_BRAKES", label: "Brakes", description: "Pad thickness, rotor scoring, ABS, and pedal feel" },
        { code: "MECH_SUSPENSION", label: "Suspension", description: "Struts, bushings, ball joints, and bounce test" },
        { code: "MECH_STEERING", label: "Steering", description: "Rack play, alignment pull, and power assist" },
        { code: "MECH_TRANSMISSION", label: "Transmission", description: "Shift smoothness, fluid state, and delayed engagement" },
        { code: "MECH_CLUTCH", label: "Clutch", description: "Bite point, slippage under load, or N/A if automatic" },
      ],
    },
    {
      code: "DOCUMENTS",
      name: "Documents Verification",
      description: "Ownership compliance, insurance coverage, and service logs.",
      sortOrder: 5,
      items: [
        { code: "DOC_RC", label: "Registration certificate", description: "RC/chassis number match and active registration validity" },
        { code: "DOC_INSURANCE", label: "Insurance", description: "Active policy status and coverage verification" },
        { code: "DOC_POLLUTION", label: "Pollution certificate", description: "Valid PUC / emissions test compliance" },
        { code: "DOC_HISTORY", label: "Service history", description: "Maintenance records and odometer consistency" },
      ],
    },
  ];

  for (const cat of checklistTree) {
    const savedCat = await prisma.inspectionCategory.upsert({
      where: { code: cat.code },
      update: { name: cat.name, description: cat.description, sortOrder: cat.sortOrder },
      create: { code: cat.code, name: cat.name, description: cat.description, sortOrder: cat.sortOrder },
    });

    for (let i = 0; i < cat.items.length; i++) {
      const item = cat.items[i];
      await prisma.inspectionChecklistItem.upsert({
        where: { code: item.code },
        update: {
          categoryId: savedCat.id,
          label: item.label,
          description: item.description,
          sortOrder: i + 1,
        },
        create: {
          categoryId: savedCat.id,
          code: item.code,
          label: item.label,
          description: item.description,
          sortOrder: i + 1,
        },
      });
    }
  }

  console.log("Seed completed cleanly (zero fake bookings).");
  console.log("Demo Accounts:");
  console.log("  Admin:      admin@nextcarinspect.com / Admin@1234");
  console.log("  Technician: marcus.tech@nextcarinspect.com / Tech@1234");
  console.log("  Technician: priya.tech@nextcarinspect.com / Tech@1234");
  console.log("  Customer:   alex.customer@example.com / Customer@1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
