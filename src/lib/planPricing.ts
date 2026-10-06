export const ENTERPRISE_PLAN_PRICING = {
  monthlyPerUserCents: 12_900,
  annualPerUserCents: 131_580,
  minimumSeats: 5,
  annualDiscountPercent: 15,
} as const;

export function calculateEnterprisePlanTotal(
  billing: 'monthly' | 'annual',
  seats: number,
): number {
  const validSeats = Math.max(ENTERPRISE_PLAN_PRICING.minimumSeats, Math.floor(seats));
  const unitPrice = billing === 'annual'
    ? ENTERPRISE_PLAN_PRICING.annualPerUserCents
    : ENTERPRISE_PLAN_PRICING.monthlyPerUserCents;

  return unitPrice * validSeats;
}