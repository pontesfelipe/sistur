import { describe, expect, it } from 'vitest';
import { ENTERPRISE_PLAN_PRICING, calculateEnterprisePlanTotal } from '@/lib/planPricing';

describe('preço do plano Empresarial', () => {
  it('cobra R$ 129 por usuário/mês, com mínimo de 5 usuários', () => {
    expect(ENTERPRISE_PLAN_PRICING.monthlyPerUserCents).toBe(12_900);
    expect(ENTERPRISE_PLAN_PRICING.minimumSeats).toBe(5);
    expect(calculateEnterprisePlanTotal('monthly', 5)).toBe(64_500);
    expect(calculateEnterprisePlanTotal('monthly', 1)).toBe(64_500);
  });

  it('aplica 15% de desconto no anual: R$ 1.315,80 por usuário e R$ 6.579 no piso', () => {
    const fullAnnualPerUser = ENTERPRISE_PLAN_PRICING.monthlyPerUserCents * 12;
    expect(ENTERPRISE_PLAN_PRICING.annualDiscountPercent).toBe(15);
    expect(ENTERPRISE_PLAN_PRICING.annualPerUserCents).toBe(131_580);
    expect(ENTERPRISE_PLAN_PRICING.annualPerUserCents).toBe(fullAnnualPerUser * 0.85);
    expect(calculateEnterprisePlanTotal('annual', 5)).toBe(657_900);
  });
});