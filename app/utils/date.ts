/**
 * Parse "YYYY-MM-DD" as local time (not UTC) to avoid timezone offset issues
 * with HTML date inputs.
 */
export function parseDateAsLocal(dateString: string): number {
  const parts = dateString.split("-").map(Number);
  const year = parts[0];
  const month = parts[1];
  const day = parts[2];
  if (year === undefined || month === undefined || day === undefined) {
    throw new Error(`Invalid date format: "${dateString}", expected YYYY-MM-DD`);
  }
  return new Date(year, month - 1, day).getTime();
}

/**
 * Format a timestamp as "YYYY-MM-DD" using local date components
 * for use with HTML date inputs.
 */
export function formatDateForInput(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
