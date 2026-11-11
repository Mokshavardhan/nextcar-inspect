import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import crypto from "crypto";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "INR"): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateInput: string | Date): string {
  if (!dateInput) return "-";
  const d =
    typeof dateInput === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)
      ? new Date(`${dateInput}T00:00:00`)
      : new Date(dateInput);
  if (Number.isNaN(d.getTime())) return String(dateInput);
  return new Intl.DateTimeFormat("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d);
}

export function formatDateTime(dateInput: string | Date): string {
  if (!dateInput) return "-";
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return String(dateInput);
  return new Intl.DateTimeFormat("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

export function generateBookingNumber(): string {
  const year = new Date().getFullYear();
  const suffix = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `NCI-${year}-${suffix}`;
}

export function generateReportNumber(): string {
  const year = new Date().getFullYear();
  const suffix = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `RPT-${year}-${suffix}`;
}

export function generateTransactionId(prefix = "TXN"): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `${prefix}-${stamp}-${rand}`;
}

export function parseChecklistSummary(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return raw
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  }
}

export function getTodayDateStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
