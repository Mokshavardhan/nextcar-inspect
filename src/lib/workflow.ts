import { prisma } from "./prisma";
import { ALLOWED_STATUS_TRANSITIONS } from "./constants";

export async function logBookingActivity(params: {
  bookingId: string;
  actorId?: string | null;
  actorRole: string;
  action: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  details?: string | null;
}) {
  return prisma.bookingActivity.create({
    data: {
      bookingId: params.bookingId,
      actorId: params.actorId ?? null,
      actorRole: params.actorRole,
      action: params.action,
      fromStatus: params.fromStatus ?? null,
      toStatus: params.toStatus ?? null,
      details: params.details ?? null,
    },
  });
}

export function canTransitionStatus(currentStatus: string, targetStatus: string): boolean {
  if (currentStatus === targetStatus) return true;
  const allowed = ALLOWED_STATUS_TRANSITIONS[currentStatus] || [];
  return allowed.includes(targetStatus);
}

export function isWithinPolicyWindow(
  scheduledDate: string,
  startTime: string,
  windowHours: number
): boolean {
  const [hours, minutes] = startTime.split(":").map(Number);
  const scheduled = new Date(`${scheduledDate}T00:00:00`);
  if (!Number.isNaN(hours)) scheduled.setHours(hours, minutes || 0, 0, 0);
  const diffHours = (scheduled.getTime() - Date.now()) / (1000 * 60 * 60);
  return diffHours >= windowHours;
}

