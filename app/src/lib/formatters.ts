/**
 * formatters.ts
 * Utility functions for user-friendly string formats.
 */

/**
 * Formats money into friendly conversational Vietnamese ("củ", "tỏi", "k").
 * - >= 1,000,000,000 becomes "tỏi" (e.g. 1500000000 -> 1.5 tỏi)
 * - >= 1,000,000 becomes "củ" (e.g. 15000000 -> 15 củ)
 * - >= 1,000 becomes "k" (e.g. 500000 -> 500k)
 * - otherwise formats as literal VND.
 * @param amount - the amount in VND
 * @returns friendly formatted string
 */
export function formatFriendlyMoney(amount: number): string {
  if (typeof amount !== 'number' || isNaN(amount)) return '0₫';

  if (amount >= 1_000_000_000) {
    // Billion = tỏi. Show up to 1 decimal place.
    const billions = amount / 1_000_000_000;
    // use max 1 decimal place, remove trailing zeros
    const formatted = parseFloat(billions.toFixed(1)).toString();
    return `${formatted} tỏi`;
  }

  if (amount >= 1_000_000) {
    // Million = củ. Show up to 1 decimal place.
    const millions = amount / 1_000_000;
    const formatted = parseFloat(millions.toFixed(1)).toString();
    return `${formatted} củ`;
  }

  if (amount >= 1_000) {
    // Thousands = k (ex: 500k)
    const thousands = amount / 1_000;
    const formatted = parseFloat(thousands.toFixed(1)).toString();
    return `${formatted}k`;
  }

  // Fallback for very small amounts
  return `${amount}₫`;
}

/**
 * Formats money into standard, formal VND.
 * @param amount - the amount in VND
 * @returns formal formatted string e.g. "1,500,000 VND"
 */
export function formatFormalMoney(amount: number): string {
  if (typeof amount !== 'number' || isNaN(amount)) return '0 VND';
  return amount.toLocaleString('vi-VN') + ' VND';
}

/**
 * Formats a date or Firestore Timestamp into a friendly string (DD/MM/YYYY).
 * @param date - Date object or Firestore Timestamp
 * @returns formatted date string
 */
export function formatDate(date: Date | string | number | { toDate: () => Date } | null | undefined): string {
  if (!date) return 'N/A';
  
  let d: Date;
  
  if (date instanceof Date) {
    d = date;
  } else if (typeof date === 'object' && date !== null && 'toDate' in date && typeof (date as { toDate: unknown }).toDate === 'function') {
    d = (date as { toDate: () => Date }).toDate();
  } else if (typeof date === 'string' || typeof date === 'number') {
    d = new Date(date);
  } else {
    return 'Invalid Date';
  }
  
  if (isNaN(d.getTime())) return 'Invalid Date';
  
  return d.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}
