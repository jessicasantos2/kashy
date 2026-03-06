import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayString(): string {
  return formatLocalDate(new Date());
}

/** Parse a YYYY-MM-DD string as a local date (avoids UTC shift) */
export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Returns the minimum year for the 5-year display window (current year - 4) */
export function getMinDisplayYear(): number {
  return new Date().getFullYear() - 4;
}

/** Filters an array of years to only include those within the 5-year display window */
export function filterDisplayYears(years: number[]): number[] {
  const minYear = getMinDisplayYear();
  return years.filter(y => y >= minYear);
}
