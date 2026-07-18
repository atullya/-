/**
 * Format a number as Indian Rupees (Rs).
 * For negative values, uses parentheses (accounting notation).
 */
export function formatCurrency(amount: number): string {
  const abs = Math.abs(amount).toLocaleString('en-IN');
  if (amount < 0) return `(Rs${abs})`;
  return `Rs${abs}`;
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
