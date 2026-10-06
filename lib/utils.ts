import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function formatCurrency(amount: number, symbol = "₹"): string {
  return `${symbol}${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")} ${period}`;
}

export function formatDateTime(dateStr: string, timeStr: string): string {
  return `${formatDate(dateStr)}, ${formatTime(timeStr)}`;
}

export function getCurrentDate(): string {
  return new Date().toISOString().split("T")[0];
}

export function getCurrentTime(): string {
  const now = new Date();
  return `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
}

export function getMonthYear(date: Date): string {
  return date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

export function isSameDay(dateStr: string, compareDate: Date): boolean {
  return dateStr === compareDate.toISOString().split("T")[0];
}

export function isToday(dateStr: string): boolean {
  return isSameDay(dateStr, new Date());
}

export function isYesterday(dateStr: string): boolean {
  const y = new Date();
  y.setDate(y.getDate() - 1);
  return isSameDay(dateStr, y);
}

export function getRelativeDateLabel(dateStr: string): string {
  if (isToday(dateStr)) return "Today";
  if (isYesterday(dateStr)) return "Yesterday";
  return formatDate(dateStr);
}

export function getStartOfWeek(): string {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().split("T")[0];
}

export function getStartOfMonth(): string {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().split("T")[0];
}

export function getStartOfLastMonth(): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().split("T")[0];
}

export function getEndOfLastMonth(): string {
  const d = new Date();
  d.setDate(0);
  return d.toISOString().split("T")[0];
}

export function parseAmountFromString(str: string): number | null {
  const cleaned = str.replace(/[₹,\s]/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

export function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + "…" : str;
}
