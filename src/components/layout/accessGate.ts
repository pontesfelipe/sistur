export interface AccessGateState {
  hasUser: boolean;
  hasAcceptedTerms: boolean;
  needsOnboarding: boolean;
  awaitingApproval: boolean;
  isBlocked: boolean;
}

/**
 * Cadeia canônica de redirecionamentos de acesso.
 * Retorna a rota de destino, ou null quando o usuário pode seguir.
 */
export function resolveBaseRedirect(state: AccessGateState): string | null {
  if (!state.hasUser) return '/auth';
  if (state.isBlocked) return '/acesso-bloqueado';
  if (!state.hasAcceptedTerms) return '/termos';
  if (state.needsOnboarding) return '/onboarding';
  if (state.awaitingApproval) return '/pending-approval';
  return null;
}
