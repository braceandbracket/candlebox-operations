export function addBusinessDays(baseDate: Date, days: number): Date {
  const result = new Date(baseDate);
  let remaining = Math.max(0, days);
  while (remaining > 0) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) {
      remaining -= 1;
    }
  }
  return result;
}

export function calculateSlaDueDate(quantity: number, baseDate = new Date()): string {
  const businessDays = Math.ceil(Math.max(quantity, 1) / 10);
  return addBusinessDays(baseDate, businessDays).toISOString().slice(0, 10);
}
