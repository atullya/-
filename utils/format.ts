/**
 * Format a number as Indian Rupees (Rs).
 * For negative values, uses parentheses (accounting notation).
 */
export function formatCurrency(amount: number): string {
  const abs = Math.abs(amount).toLocaleString('en-IN');
  if (amount < 0) return `(Rs ${abs})`;
  return `Rs ${abs}`;
}

/**
 * Calculate total amount from an array of entries.
 */
export function totalAmount(entries: { amount: number }[]): number {
  return entries.reduce((sum, e) => sum + e.amount, 0);
}

/**
 * Format an ISO date string (YYYY-MM-DD) to "1 Jan 2025" format.
 */
export function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Get today's date as YYYY-MM-DD string.
 */
export function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
import { adToBs, getNepaliMonthName, getTotalDaysInMonth } from '@sonill/nepali-dates';

export const NEPALI_MONTHS = Array.from({ length: 12 }, (_, index) =>
  getNepaliMonthName(index + 1)
);

export type BsDate = { year: number; month: number; day: number };

export function formatBsDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  return `${day} ${getNepaliMonthName(month)} ${year}`;
}

export function getTodayBsDate(): BsDate {
  const now = new Date();
  return adToBs(now.getFullYear(), now.getMonth() + 1, now.getDate()) as BsDate;
}

export function todayBsISO(): string {
  const { year, month, day } = getTodayBsDate();
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function daysInBsMonth(year: number, month: number): number {
  return getTotalDaysInMonth(year, month);
}

/** Scooter odometers use the final digit for tenths of a kilometre. */
export function meterReadingToKm(meterReading: number): number {
  return Math.floor(meterReading / 10);
}

export function formatMeterReading(meterReading: number | null): string {
  return meterReading === null ? 'Meter not recorded' : `${meterReadingToKm(meterReading).toLocaleString('en-IN')} km`;
}

/** Return average distance between consecutive valid odometer readings. */
export function getDistanceStats(entries: { date: string; dateCalendar: 'ad' | 'bs'; meterReading: number | null }[]) {
  const readings = entries
    .filter((entry) => entry.dateCalendar === 'bs' && entry.meterReading !== null)
    .sort((a, b) => a.date.localeCompare(b.date));

  let totalDistance = 0;
  let intervals = 0;
  let previous: number | null = null;

  for (const entry of readings) {
    if (previous !== null && entry.meterReading! >= previous) {
      totalDistance += meterReadingToKm(entry.meterReading!) - meterReadingToKm(previous);
      intervals += 1;
    }
    previous = entry.meterReading!;
  }

  return {
    currentMeter: readings.length ? meterReadingToKm(readings[readings.length - 1].meterReading!) : null,
    totalDistance,
    intervals,
    averageDistance: intervals ? totalDistance / intervals : null,
  };
}
