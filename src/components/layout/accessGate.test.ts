import { describe, it, expect } from 'vitest';
import { resolveBaseRedirect } from './accessGate';

const base = {
  hasUser: true,
  hasAcceptedTerms: true,
  needsOnboarding: false,
  awaitingApproval: false,
  isBlocked: false,
};

describe('resolveBaseRedirect', () => {
  it('manda para /auth sem usuário', () => {
    expect(resolveBaseRedirect({ ...base, hasUser: false })).toBe('/auth');
  });

  it('bloqueio tem precedência sobre termos e onboarding', () => {
    expect(resolveBaseRedirect({ ...base, isBlocked: true, hasAcceptedTerms: false, needsOnboarding: true }))
      .toBe('/acesso-bloqueado');
  });

  it('exige aceite de termos', () => {
    expect(resolveBaseRedirect({ ...base, hasAcceptedTerms: false })).toBe('/termos');
  });

  it('exige onboarding antes de aprovação', () => {
    expect(resolveBaseRedirect({ ...base, needsOnboarding: true, awaitingApproval: true })).toBe('/onboarding');
  });

  it('manda pendentes para aprovação', () => {
    expect(resolveBaseRedirect({ ...base, awaitingApproval: true })).toBe('/pending-approval');
  });

  it('libera usuário aprovado', () => {
    expect(resolveBaseRedirect(base)).toBeNull();
  });
});
