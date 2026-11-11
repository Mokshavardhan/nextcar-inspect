"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Check,
  Car,
  User,
  MapPin,
  Calendar,
  CreditCard,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Clock,
  ShieldCheck,
  AlertCircle,
  Mail,
  MessageSquare,
} from "lucide-react";
import {
  FUEL_TYPES,
  TRANSMISSION_TYPES,
  VEHICLE_TYPES,
} from "@/lib/constants";
import {
  formatCurrency,
  formatDate,
  getTodayDateStr,
  parseChecklistSummary,
} from "@/lib/format";
import { LocationMapPicker } from "@/components/booking/LocationMapPicker";
import {
  PaymentCheckoutPanel,
  type PaymentIntentData,
} from "@/components/booking/PaymentCheckoutPanel";
import { useToast } from "@/components/ui/ToastProvider";

interface ServiceItem {
  id: string;
  name: string;
  description: string;
  price: number;
  durationMinutes: number;
  checklistSummary: string;
}

interface SavedVehicle {
  id: string;
  vehicleType: string;
  manufacturer: string;
  model: string;
  manufacturingYear: number;
  registrationNumber: string;
  fuelType: string;
  transmissionType: string;
  notes?: string | null;
}

interface PlatformSettingsData {
  currency: string;
  allowFullPayment: boolean;
  allowAdvancePayment: boolean;
  advancePercentage: number;
  allowPayLater: boolean;
}

interface AvailabilitySlotItem {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
  remainingSpots: number;
  isAvailable: boolean;
  unavailableReason: string | null;
}

interface BookingResult {
  id: string;
  bookingNumber: string;
  status: string;
  paymentStatus: string;
  paymentOption: string;
  servicePrice: number;
  amountPaid: number;
  scheduledDate: string;
  timeSlotLabel: string;
  contactEmail: string;
  contactPhone: string;
  contactWhatsapp?: string | null;
  service?: { name: string };
  vehicle?: { manufacturer: string; model: string; manufacturingYear: number; registrationNumber: string };
}

interface BookingUser {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string | null;
  whatsappNumber?: string | null;
  customerProfile?: {
    address?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
  } | null;
}

const STEPS = [
  { num: 1, title: "Service", icon: ShieldCheck },
  { num: 2, title: "Vehicle", icon: Car },
  { num: 3, title: "Customer", icon: User },
  { num: 4, title: "Location", icon: MapPin },
  { num: 5, title: "Schedule", icon: Calendar },
  { num: 6, title: "Payment", icon: CreditCard },
  { num: 7, title: "Confirmed", icon: CheckCircle2 },
];

export function BookingWizard({
  services,
  settings,
  initialUser,
  savedVehicles,
}: {
  services: ServiceItem[];
  settings: PlatformSettingsData;
  initialUser: BookingUser | null;
  savedVehicles: SavedVehicle[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const preselectedServiceId = searchParams.get("service");
  const defaultServiceId =
    services.find((s) => s.id === preselectedServiceId)?.id || services[0]?.id || "";

  const [step, setStep] = useState(1);
  const [user, setUser] = useState<BookingUser | null>(initialUser);
  const [vehicles, setVehicles] = useState<SavedVehicle[]>(savedVehicles);

  // Step 1
  const [serviceId, setServiceId] = useState(defaultServiceId);

  // Step 2
  const [existingVehicleId, setExistingVehicleId] = useState<string>("");
  const [vehicle, setVehicle] = useState({
    vehicleType: "CAR" as "CAR" | "SUV" | "BIKE",
    manufacturer: "",
    model: "",
    manufacturingYear: new Date().getFullYear(),
    registrationNumber: "",
    fuelType: "Petrol",
    transmissionType: "Automatic",
    notes: "",
  });

  // Step 3
  const [customer, setCustomer] = useState({
    fullName: initialUser?.name || "",
    email: initialUser?.email || "",
    phone: initialUser?.phone || "",
    whatsappNumber: initialUser?.whatsappNumber || initialUser?.phone || "",
    accountPassword: "",
  });
  const [inlineSignInMode, setInlineSignInMode] = useState(false);
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [signingIn, setSigningIn] = useState(false);

  // Step 4
  const [location, setLocation] = useState<{
    address: string;
    city: string;
    state: string;
    postalCode: string;
    latitude: number | null;
    longitude: number | null;
  }>({
    address: initialUser?.customerProfile?.address || "",
    city: initialUser?.customerProfile?.city || "",
    state: initialUser?.customerProfile?.state || "",
    postalCode: initialUser?.customerProfile?.postalCode || "",
    latitude: 12.9716,
    longitude: 77.5946,
  });

  // Step 5
  const [scheduledDate, setScheduledDate] = useState(getTodayDateStr());
  const [slotId, setSlotId] = useState("");
  const [slots, setSlots] = useState<AvailabilitySlotItem[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [dateBlockedReason, setDateBlockedReason] = useState<string | null>(null);

  // Step 6 & 7
  const defaultPaymentOption: "FULL" | "ADVANCE" | "PAY_LATER" = settings.allowFullPayment
    ? "FULL"
    : settings.allowAdvancePayment
    ? "ADVANCE"
    : "PAY_LATER";

  const [paymentOption, setPaymentOption] = useState<"FULL" | "ADVANCE" | "PAY_LATER">(
    defaultPaymentOption
  );
  const [submittingBooking, setSubmittingBooking] = useState(false);
  const [createdBooking, setCreatedBooking] = useState<BookingResult | null>(null);
  const [paymentIntent, setPaymentIntent] = useState<PaymentIntentData | null>(null);

  const selectedService = useMemo(
    () => services.find((s) => s.id === serviceId) || services[0],
    [services, serviceId]
  );

  // Handle Stripe Checkout return if ?session_id=...
  useEffect(() => {
    const returnStep = searchParams.get("step");
    const bId = searchParams.get("bookingId");
    const pId = searchParams.get("paymentId");
    const sId = searchParams.get("session_id");
    if (returnStep === "7" && bId && pId && sId) {
      fetch("/api/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: bId,
          paymentId: pId,
          gateway: "STRIPE",
          stripeSessionId: sId,
        }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.booking) {
            setCreatedBooking(data.booking);
            setStep(7);
          }
        })
        .catch(() => null);
    }
  }, [searchParams]);

  const fetchSlots = useCallback(async (date: string) => {
    setSlotsLoading(true);
    setDateBlockedReason(null);
    try {
      const res = await fetch(`/api/availability?date=${encodeURIComponent(date)}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (data.isBlocked) {
        setDateBlockedReason(data.blockedReason || "Selected date is unavailable.");
      }
      setSlots(data.slots || []);
      setSlotId((prev) => {
        const stillOk = (data.slots || []).find(
          (s: AvailabilitySlotItem) => s.id === prev && s.isAvailable
        );
        return stillOk ? prev : "";
      });
    } catch {
      toast({ type: "error", title: "Could not check slot availability" });
    } finally {
      setSlotsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (step === 5) {
      fetchSlots(scheduledDate);
    }
  }, [step, scheduledDate, fetchSlots]);

  const handleInlineSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSigningIn(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: signInEmail, password: signInPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sign in failed");

      const meRes = await fetch("/api/auth/me", { cache: "no-store" });
      const meData = await meRes.json();
      if (meData.user) {
        setUser(meData.user);
        setCustomer({
          fullName: meData.user.name,
          email: meData.user.email,
          phone: meData.user.phone || "",
          whatsappNumber: meData.user.whatsappNumber || meData.user.phone || "",
          accountPassword: "",
        });
        if (meData.user.customerProfile) {
          setLocation((prev) => ({
            ...prev,
            address: prev.address || meData.user.customerProfile.address || "",
            city: prev.city || meData.user.customerProfile.city || "",
            state: prev.state || meData.user.customerProfile.state || "",
            postalCode: prev.postalCode || meData.user.customerProfile.postalCode || "",
          }));
        }
      }
      const vRes = await fetch("/api/vehicles");
      if (vRes.ok) {
        const vData = await vRes.json();
        setVehicles(vData.vehicles || []);
      }
      setInlineSignInMode(false);
      toast({ type: "success", title: "Signed in", description: "Your account details were loaded." });
    } catch (err) {
      toast({
        type: "error",
        title: "Sign in failed",
        description: err instanceof Error ? err.message : "Invalid credentials",
      });
    } finally {
      setSigningIn(false);
    }
  };

  const validateAndNext = () => {
    if (step === 1) {
      if (!serviceId) {
        toast({ type: "error", title: "Select a service package" });
        return;
      }
      setStep(2);
      return;
    }

    if (step === 2) {
      if (!existingVehicleId) {
        if (!vehicle.manufacturer.trim() || !vehicle.model.trim() || !vehicle.registrationNumber.trim()) {
          toast({
            type: "error",
            title: "Incomplete Vehicle Information",
            description: "Please fill manufacturer, model, and registration number.",
          });
          return;
        }
      }
      setStep(3);
      return;
    }

    if (step === 3) {
      if (!customer.fullName.trim() || !customer.email.trim() || !customer.phone.trim()) {
        toast({
          type: "error",
          title: "Missing Contact Information",
          description: "Full name, email, and mobile number are required.",
        });
        return;
      }
      if (!user && customer.accountPassword.length < 6) {
        toast({
          type: "error",
          title: "Account Password Required",
          description: "Set a 6+ character password (or sign in above) to track your booking & PDF reports.",
        });
        return;
      }
      setStep(4);
      return;
    }

    if (step === 4) {
      if (
        !location.address.trim() ||
        !location.city.trim() ||
        !location.state.trim() ||
        !location.postalCode.trim()
      ) {
        toast({
          type: "error",
          title: "Complete Inspection Address",
          description: "Address, city, state, and postal code are required.",
        });
        return;
      }
      setStep(5);
      return;
    }

    if (step === 5) {
      if (!scheduledDate || !slotId) {
        toast({
          type: "error",
          title: "Select Date & Time Slot",
          description: "Please pick an available inspection date and slot.",
        });
        return;
      }
      setStep(6);
    }
  };

  const amountDueNow = useMemo(() => {
    if (!selectedService) return 0;
    if (paymentOption === "FULL") return selectedService.price;
    if (paymentOption === "ADVANCE") {
      return Math.round(selectedService.price * (settings.advancePercentage / 100) * 100) / 100;
    }
    return 0;
  }, [selectedService, paymentOption, settings.advancePercentage]);

  const handleConfirmBooking = async () => {
    setSubmittingBooking(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId,
          existingVehicleId: existingVehicleId || undefined,
          vehicle: existingVehicleId ? undefined : vehicle,
          customer: {
            fullName: customer.fullName,
            email: customer.email,
            phone: customer.phone,
            whatsappNumber: customer.whatsappNumber || customer.phone,
            accountPassword: user ? undefined : customer.accountPassword,
          },
          location,
          schedule: { scheduledDate, slotId },
          paymentOption,
          customerNotes: vehicle.notes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === "EMAIL_EXISTS_SIGNIN_REQUIRED") {
          setInlineSignInMode(true);
          setSignInEmail(customer.email);
          setStep(3);
        }
        throw new Error(data.error || "Booking submission failed");
      }

      if (data.authenticatedUser && !user) {
        setUser(data.authenticatedUser);
      }

      setCreatedBooking(data.booking);

      if (data.paymentIntent && paymentOption !== "PAY_LATER") {
        setPaymentIntent(data.paymentIntent);
        toast({
          type: "info",
          title: `Slot Reserved (${data.booking.bookingNumber})`,
          description: "Complete payment verification below to confirm your inspection.",
        });
      } else {
        setStep(7);
        toast({
          type: "success",
          title: "Booking Confirmed!",
          description: `Booking ID ${data.booking.bookingNumber} has been created.`,
        });
      }
    } catch (err) {
      toast({
        type: "error",
        title: "Booking Error",
        description: err instanceof Error ? err.message : "Could not complete booking.",
      });
    } finally {
      setSubmittingBooking(false);
    }
  };

  const selectedSlotLabel =
    slots.find((s) => s.id === slotId)?.label || createdBooking?.timeSlotLabel || "";

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Stepper */}
      <div className="mb-8 overflow-x-auto pb-2">
        <div className="flex min-w-[640px] items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          {STEPS.map((st, idx) => {
            const Icon = st.icon;
            const active = step === st.num;
            const done = step > st.num;
            return (
              <React.Fragment key={st.num}>
                <div className="flex items-center gap-2.5">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold transition ${
                      active
                        ? "bg-[#2563EB] text-white shadow-sm"
                        : done
                        ? "bg-[#16A34A] text-white"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Step {st.num}
                    </p>
                    <p
                      className={`text-xs font-bold ${
                        active ? "text-[#2563EB]" : done ? "text-[#16A34A]" : "text-slate-600"
                      }`}
                    >
                      {st.title}
                    </p>
                  </div>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={`h-0.5 flex-1 ${done ? "bg-[#16A34A]" : "bg-slate-200"}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Main Layout */}
      <div className="grid gap-8 lg:grid-cols-12">
        <div className={step === 7 ? "lg:col-span-12" : "lg:col-span-8"}>
          {/* STEP 1: SERVICE */}
          {step === 1 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-xl font-extrabold text-[#101B35]">
                Step 1: Select Inspection Service
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Choose the depth of inspection needed for your vehicle.
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {services.map((svc) => {
                  const selected = svc.id === serviceId;
                  const bullets = parseChecklistSummary(svc.checklistSummary);
                  return (
                    <button
                      key={svc.id}
                      type="button"
                      onClick={() => setServiceId(svc.id)}
                      className={`flex flex-col justify-between rounded-xl border p-5 text-left transition ${
                        selected
                          ? "border-[#2563EB] bg-blue-50/40 ring-2 ring-[#2563EB]/20"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-base font-bold text-[#101B35]">{svc.name}</h3>
                          <span className="text-lg font-extrabold text-[#2563EB]">
                            {formatCurrency(svc.price, settings.currency)}
                          </span>
                        </div>
                        <p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500">
                          <Clock className="h-3.5 w-3.5" />
                          Est. {svc.durationMinutes} mins
                        </p>
                        <p className="mt-2.5 text-xs leading-relaxed text-slate-600">
                          {svc.description}
                        </p>
                        <ul className="mt-3 space-y-1.5">
                          {bullets.slice(0, 3).map((b) => (
                            <li key={b} className="flex items-start gap-1.5 text-xs text-slate-700">
                              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#16A34A]" />
                              <span>{b}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="mt-4 border-t border-slate-100 pt-3 text-xs font-bold text-[#2563EB]">
                        {selected ? "Selected Package ✓" : "Click to Select"}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2: VEHICLE */}
          {step === 2 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-xl font-extrabold text-[#101B35]">
                Step 2: Vehicle Information
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Tell our technician about the vehicle to be inspected.
              </p>

              {vehicles.length > 0 && (
                <div className="mt-5 rounded-xl border border-slate-200 bg-[#F8FAFC] p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Or Choose a Saved Vehicle
                  </p>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setExistingVehicleId("")}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                        !existingVehicleId
                          ? "border-[#2563EB] bg-[#2563EB] text-white"
                          : "border-slate-200 bg-white text-slate-700"
                      }`}
                    >
                      + Enter New Vehicle
                    </button>
                    {vehicles.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setExistingVehicleId(v.id)}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                          existingVehicleId === v.id
                            ? "border-[#2563EB] bg-[#2563EB] text-white"
                            : "border-slate-200 bg-white text-slate-700"
                        }`}
                      >
                        {v.manufacturingYear} {v.manufacturer} {v.model} ({v.registrationNumber})
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {!existingVehicleId && (
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                      Vehicle Type *
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {VEHICLE_TYPES.map((vt) => (
                        <button
                          key={vt}
                          type="button"
                          onClick={() => setVehicle({ ...vehicle, vehicleType: vt })}
                          className={`rounded-xl border py-2.5 text-sm font-bold transition ${
                            vehicle.vehicleType === vt
                              ? "border-[#2563EB] bg-blue-50 text-[#2563EB]"
                              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          {vt === "CAR" ? "Car / Sedan" : vt === "SUV" ? "SUV / Crossover" : "Bike / Motorcycle"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Manufacturer *
                    </label>
                    <input
                      type="text"
                      value={vehicle.manufacturer}
                      onChange={(e) => setVehicle({ ...vehicle, manufacturer: e.target.value })}
                      placeholder="Maruti Suzuki, Hyundai, Tata, Honda..."
                      className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm focus:border-[#2563EB] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Model *
                    </label>
                    <input
                      type="text"
                      value={vehicle.model}
                      onChange={(e) => setVehicle({ ...vehicle, model: e.target.value })}
                      placeholder="Creta SX, Swift ZXi, Nexon, City..."
                      className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm focus:border-[#2563EB] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Manufacturing Year *
                    </label>
                    <input
                      type="number"
                      min={1960}
                      max={new Date().getFullYear() + 1}
                      value={vehicle.manufacturingYear}
                      onChange={(e) =>
                        setVehicle({ ...vehicle, manufacturingYear: Number(e.target.value) })
                      }
                      className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm focus:border-[#2563EB] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Registration Number *
                    </label>
                    <input
                      type="text"
                      value={vehicle.registrationNumber}
                      onChange={(e) =>
                        setVehicle({ ...vehicle, registrationNumber: e.target.value.toUpperCase() })
                      }
                      placeholder="KA-01-MJ-4029"
                      className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 font-mono text-sm uppercase focus:border-[#2563EB] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Fuel Type *
                    </label>
                    <select
                      value={vehicle.fuelType}
                      onChange={(e) => setVehicle({ ...vehicle, fuelType: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm focus:border-[#2563EB] focus:outline-none"
                    >
                      {FUEL_TYPES.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Transmission Type *
                    </label>
                    <select
                      value={vehicle.transmissionType}
                      onChange={(e) =>
                        setVehicle({ ...vehicle, transmissionType: e.target.value })
                      }
                      className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm focus:border-[#2563EB] focus:outline-none"
                    >
                      {TRANSMISSION_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Additional Notes (Optional)
                    </label>
                    <textarea
                      rows={3}
                      value={vehicle.notes}
                      onChange={(e) => setVehicle({ ...vehicle, notes: e.target.value })}
                      placeholder="Specific concerns, noises, or seller contact notes..."
                      className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm focus:border-[#2563EB] focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: CUSTOMER */}
          {step === 3 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-xl font-extrabold text-[#101B35]">
                    Step 3: Customer Information
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Where should we send booking updates, invoices, and your PDF report?
                  </p>
                </div>
                {!user && (
                  <button
                    type="button"
                    onClick={() => setInlineSignInMode((v) => !v)}
                    className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-[#2563EB] hover:bg-blue-100"
                  >
                    {inlineSignInMode ? "Create New Account Instead" : "Already have an account? Sign In"}
                  </button>
                )}
              </div>

              {inlineSignInMode && !user && (
                <form
                  onSubmit={handleInlineSignIn}
                  className="mt-5 rounded-xl border border-blue-200 bg-blue-50/50 p-4"
                >
                  <p className="text-xs font-bold text-[#101B35]">
                    Sign in to link this booking to your existing account
                  </p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <input
                      type="email"
                      required
                      value={signInEmail}
                      onChange={(e) => setSignInEmail(e.target.value)}
                      placeholder="Email"
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                    />
                    <input
                      type="password"
                      required
                      value={signInPassword}
                      onChange={(e) => setSignInPassword(e.target.value)}
                      placeholder="Password"
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                    />
                    <button
                      type="submit"
                      disabled={signingIn}
                      className="rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
                    >
                      {signingIn ? "Signing In..." : "Sign In"}
                    </button>
                  </div>
                </form>
              )}

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={customer.fullName}
                    onChange={(e) => setCustomer({ ...customer, fullName: e.target.value })}
                    placeholder="Rohan Sharma"
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm focus:border-[#2563EB] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    disabled={Boolean(user)}
                    value={customer.email}
                    onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                    placeholder="rohan@example.in"
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm focus:border-[#2563EB] focus:outline-none disabled:bg-slate-50"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Mobile Number *
                  </label>
                  <input
                    type="tel"
                    value={customer.phone}
                    onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                    placeholder="+91 98450 40404"
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm focus:border-[#2563EB] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    WhatsApp Number
                  </label>
                  <input
                    type="tel"
                    value={customer.whatsappNumber}
                    onChange={(e) =>
                      setCustomer({ ...customer, whatsappNumber: e.target.value })
                    }
                    placeholder="For instant WhatsApp alerts"
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm focus:border-[#2563EB] focus:outline-none"
                  />
                </div>

                {!user && (
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Create Customer Portal Password * (to track status & download PDF report)
                    </label>
                    <input
                      type="password"
                      minLength={6}
                      value={customer.accountPassword}
                      onChange={(e) =>
                        setCustomer({ ...customer, accountPassword: e.target.value })
                      }
                      placeholder="Minimum 6 characters"
                      className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm focus:border-[#2563EB] focus:outline-none"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 4: LOCATION */}
          {step === 4 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-xl font-extrabold text-[#101B35]">
                Step 4: Inspection Location
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Pin the inspection site on the map and confirm the street address.
              </p>

              <div className="mt-5">
                <LocationMapPicker value={location} onChange={setLocation} />
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Street Address *
                  </label>
                  <input
                    type="text"
                    value={location.address}
                    onChange={(e) => setLocation({ ...location, address: e.target.value })}
                    placeholder="12th Main Road, Indiranagar"
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm focus:border-[#2563EB] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">City *</label>
                  <input
                    type="text"
                    value={location.city}
                    onChange={(e) => setLocation({ ...location, city: e.target.value })}
                    placeholder="Bengaluru"
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm focus:border-[#2563EB] focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      State *
                    </label>
                    <input
                      type="text"
                      value={location.state}
                      onChange={(e) => setLocation({ ...location, state: e.target.value })}
                      placeholder="Karnataka"
                      className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm focus:border-[#2563EB] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Postal Code *
                    </label>
                    <input
                      type="text"
                      value={location.postalCode}
                      onChange={(e) => setLocation({ ...location, postalCode: e.target.value })}
                      placeholder="560038"
                      className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm focus:border-[#2563EB] focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: SCHEDULE */}
          {step === 5 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-xl font-extrabold text-[#101B35]">
                Step 5: Schedule Inspection
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Real-time slot validation prevents double bookings on unavailable windows.
              </p>

              <div className="mt-6 grid gap-6 sm:grid-cols-12">
                <div className="sm:col-span-5">
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Inspection Date *
                  </label>
                  <input
                    type="date"
                    min={getTodayDateStr()}
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-semibold text-[#101B35] focus:border-[#2563EB] focus:outline-none"
                  />
                  <p className="mt-2 text-xs text-slate-500">
                    Select any upcoming date to refresh available technician capacity.
                  </p>
                </div>

                <div className="sm:col-span-7">
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Available Time Slots ({formatDate(scheduledDate)}) *
                  </label>

                  {dateBlockedReason && (
                    <div className="mb-3 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-[#DC2626]">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{dateBlockedReason}</span>
                    </div>
                  )}

                  {slotsLoading ? (
                    <div className="space-y-2.5">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100" />
                      ))}
                    </div>
                  ) : slots.length === 0 ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                      No inspection slots configured for this date.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {slots.map((sl) => {
                        const selected = slotId === sl.id;
                        return (
                          <button
                            key={sl.id}
                            type="button"
                            disabled={!sl.isAvailable}
                            onClick={() => setSlotId(sl.id)}
                            className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
                              !sl.isAvailable
                                ? "cursor-not-allowed border-slate-200 bg-slate-100 opacity-60"
                                : selected
                                ? "border-[#2563EB] bg-blue-50/50 ring-2 ring-[#2563EB]/20"
                                : "border-slate-200 bg-white hover:border-blue-300"
                            }`}
                          >
                            <div>
                              <p className="text-sm font-bold text-[#101B35]">{sl.label}</p>
                              <p className="text-xs text-slate-500">
                                {sl.isAvailable
                                  ? `${sl.remainingSpots} technician spot(s) left`
                                  : sl.unavailableReason || "Unavailable"}
                              </p>
                            </div>
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                                !sl.isAvailable
                                  ? "bg-slate-200 text-slate-600"
                                  : selected
                                  ? "bg-[#2563EB] text-white"
                                  : "bg-green-50 text-[#16A34A]"
                              }`}
                            >
                              {!sl.isAvailable ? "Unavailable" : selected ? "Selected" : "Available"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: PAYMENT */}
          {step === 6 && (
            <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div>
                <h2 className="text-xl font-extrabold text-[#101B35]">
                  Step 6: Payment & Verification
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Choose a payment mode enabled by platform policy and verify checkout.
                </p>
              </div>

              {!paymentIntent ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {settings.allowFullPayment && (
                      <button
                        type="button"
                        onClick={() => setPaymentOption("FULL")}
                        className={`rounded-xl border p-4 text-left transition ${
                          paymentOption === "FULL"
                            ? "border-[#2563EB] bg-blue-50/50 ring-2 ring-[#2563EB]/20"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <p className="text-xs font-bold uppercase text-[#2563EB]">Full Payment</p>
                        <p className="mt-1 text-lg font-extrabold text-[#101B35]">
                          {formatCurrency(selectedService?.price || 0, settings.currency)}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Instant booking confirmation
                        </p>
                      </button>
                    )}

                    {settings.allowAdvancePayment && (
                      <button
                        type="button"
                        onClick={() => setPaymentOption("ADVANCE")}
                        className={`rounded-xl border p-4 text-left transition ${
                          paymentOption === "ADVANCE"
                            ? "border-[#2563EB] bg-blue-50/50 ring-2 ring-[#2563EB]/20"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <p className="text-xs font-bold uppercase text-[#2563EB]">
                          {settings.advancePercentage}% Advance
                        </p>
                        <p className="mt-1 text-lg font-extrabold text-[#101B35]">
                          {formatCurrency(
                            ((selectedService?.price || 0) * settings.advancePercentage) / 100,
                            settings.currency
                          )}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">Pay balance after inspection</p>
                      </button>
                    )}

                    {settings.allowPayLater && (
                      <button
                        type="button"
                        onClick={() => setPaymentOption("PAY_LATER")}
                        className={`rounded-xl border p-4 text-left transition ${
                          paymentOption === "PAY_LATER"
                            ? "border-[#2563EB] bg-blue-50/50 ring-2 ring-[#2563EB]/20"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <p className="text-xs font-bold uppercase text-slate-600">Pay Later</p>
                        <p className="mt-1 text-lg font-extrabold text-[#101B35]">
                          {formatCurrency(0, settings.currency)} now
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Pending admin confirmation
                        </p>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between rounded-xl bg-[#F8FAFC] p-4 text-sm">
                    <span className="font-semibold text-slate-600">Amount Due Today</span>
                    <span className="text-xl font-extrabold text-[#101B35]">
                      {formatCurrency(amountDueNow, settings.currency)}
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={submittingBooking}
                    onClick={handleConfirmBooking}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-6 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
                  >
                    {submittingBooking
                      ? "Reserving Slot..."
                      : paymentOption === "PAY_LATER"
                      ? "Confirm Booking (Pay Later)"
                      : `Reserve Slot & Proceed to Pay ${formatCurrency(
                          amountDueNow,
                          settings.currency
                        )}`}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <PaymentCheckoutPanel
                  bookingId={createdBooking!.id}
                  intent={paymentIntent}
                  defaultName={customer.fullName}
                  onSuccess={(verifiedBooking) => {
                    setCreatedBooking(verifiedBooking as BookingResult);
                    setStep(7);
                  }}
                  onCancel={() => {
                    setStep(7);
                    toast({
                      type: "info",
                      title: "Booking Saved as Pending",
                      description: "You can complete payment anytime from your Customer Dashboard.",
                    });
                  }}
                />
              )}
            </div>
          )}

          {/* STEP 7: CONFIRMATION */}
          {step === 7 && createdBooking && (
            <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-10">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-[#16A34A]">
                <CheckCircle2 className="h-8 w-8" />
              </div>

              <p className="mt-4 text-xs font-bold uppercase tracking-wider text-[#16A34A]">
                Inspection Booking Recorded
              </p>
              <h2 className="mt-1 text-2xl font-extrabold text-[#101B35] sm:text-3xl">
                Booking ID: {createdBooking.bookingNumber}
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Your vehicle inspection has been scheduled for{" "}
                <strong>{formatDate(createdBooking.scheduledDate)}</strong> (
                <strong>{createdBooking.timeSlotLabel}</strong>).
              </p>

              <div className="mt-6 grid gap-3 rounded-xl border border-slate-200 bg-[#F8FAFC] p-5 text-left text-xs sm:grid-cols-2">
                <div>
                  <span className="text-slate-500">Service Package</span>
                  <p className="mt-0.5 font-bold text-[#101B35]">
                    {createdBooking.service?.name || selectedService?.name}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Booking Status</span>
                  <p className="mt-0.5 font-bold text-[#2563EB]">{createdBooking.status}</p>
                </div>
                <div>
                  <span className="text-slate-500">Payment Status</span>
                  <p className="mt-0.5 font-bold text-[#101B35]">
                    {createdBooking.paymentStatus} ({formatCurrency(createdBooking.amountPaid, settings.currency)} paid)
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Notifications Sent</span>
                  <div className="mt-1 flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1 rounded bg-white px-2 py-0.5 font-semibold text-slate-700 border border-slate-200">
                      <Mail className="h-3 w-3 text-[#2563EB]" /> Email
                    </span>
                    <span className="inline-flex items-center gap-1 rounded bg-white px-2 py-0.5 font-semibold text-slate-700 border border-slate-200">
                      <MessageSquare className="h-3 w-3 text-[#16A34A]" /> WhatsApp
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    router.push("/dashboard/customer");
                    router.refresh();
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-6 py-3 text-sm font-bold text-white hover:bg-blue-700"
                >
                  Open Customer Dashboard
                  <ArrowRight className="h-4 w-4" />
                </button>
                <Link
                  href="/"
                  className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-[#101B35] hover:bg-slate-50"
                >
                  Return Home
                </Link>
              </div>
            </div>
          )}

          {/* Navigation Controls (Steps 1–5 & Step 6 back) */}
          {step < 7 && !paymentIntent && (
            <div className="mt-6 flex items-center justify-between">
              <button
                type="button"
                disabled={step === 1}
                onClick={() => setStep((s) => Math.max(1, s - 1))}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:invisible"
              >
                <ArrowLeft className="h-4 w-4" />
                Previous Step
              </button>

              {step < 6 && (
                <button
                  type="button"
                  onClick={validateAndNext}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#101B35] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#2563EB]"
                >
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Booking Summary Sidebar */}
        {step < 7 && (
          <aside className="lg:col-span-4">
            <div className="sticky top-24 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#101B35]">
                Booking Summary
              </h3>
              <div className="mt-4 space-y-3 border-t border-slate-100 pt-4 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Service</span>
                  <span className="font-bold text-right text-[#101B35]">
                    {selectedService?.name || "-"}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Duration</span>
                  <span className="font-semibold text-slate-700">
                    ~{selectedService?.durationMinutes || 0} mins
                  </span>
                </div>
                {(vehicle.manufacturer || existingVehicleId) && (
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">Vehicle</span>
                    <span className="font-semibold text-right text-[#101B35]">
                      {existingVehicleId
                        ? (() => {
                            const found = vehicles.find((v) => v.id === existingVehicleId);
                            return found
                              ? `${found.manufacturingYear} ${found.manufacturer} ${found.model}`
                              : "Saved Vehicle";
                          })()
                        : `${vehicle.manufacturingYear} ${vehicle.manufacturer} ${vehicle.model}`}
                    </span>
                  </div>
                )}
                {location.city && (
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">Location</span>
                    <span className="font-semibold text-right text-slate-700">
                      {location.city}, {location.state}
                    </span>
                  </div>
                )}
                {slotId && (
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">Schedule</span>
                    <span className="font-semibold text-right text-slate-700">
                      {formatDate(scheduledDate)}
                      <br />
                      <span className="text-xs text-[#2563EB]">{selectedSlotLabel}</span>
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-5 border-t border-slate-200 pt-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-bold text-slate-600">Service Price</span>
                  <span className="text-2xl font-extrabold text-[#101B35]">
                    {formatCurrency(selectedService?.price || 0, settings.currency)}
                  </span>
                </div>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

