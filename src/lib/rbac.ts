export type AppRole = 'ADMIN' | 'ORG_ADMIN' | 'ANALYST' | 'VIEWER' | 'ESTUDANTE' | 'PROFESSOR';
export type SystemAccess = 'ERP' | 'EDU';

export const ALL_ROLES: AppRole[] = ['ADMIN', 'ORG_ADMIN', 'ANALYST', 'VIEWER', 'ESTUDANTE', 'PROFESSOR'];

export const ROLE_LABELS: Record<AppRole, string> = {
  ADMIN: 'Administrador (plataforma)',
  ORG_ADMIN: 'Administrador da organização',
  ANALYST: 'Analista',
  VIEWER: 'Visualizador',
  ESTUDANTE: 'Estudante',
  PROFESSOR: 'Professor',
};

/** Papéis disponíveis por sistema (Analítico = ERP internamente). */
export const ROLES_BY_SYSTEM: Record<SystemAccess, AppRole[]> = {
  ERP: ['ORG_ADMIN', 'ANALYST', 'VIEWER'],
  EDU: ['ORG_ADMIN', 'ESTUDANTE', 'PROFESSOR'],
};

/** Papéis privilegiados: só ADMIN de plataforma pode conceder. */
export const PRIVILEGED_ROLES: AppRole[] = ['ADMIN', 'ORG_ADMIN'];

export function isPrivilegedRole(role: string): boolean {
  return PRIVILEGED_ROLES.includes(role as AppRole);
}

/** Papéis que um determinado ator pode atribuir. */
export function assignableRoles(opts: {
  system?: SystemAccess | null;
  isPlatformAdmin: boolean;
}): AppRole[] {
  const base = opts.system ? ROLES_BY_SYSTEM[opts.system] : ALL_ROLES.filter(r => r !== 'ADMIN');
  if (opts.isPlatformAdmin) {
    return Array.from(new Set<AppRole>(['ADMIN', ...base]));
  }
  return base.filter(r => r !== 'ADMIN' && r !== 'ORG_ADMIN');
}

/** Papéis oferecidos na aprovação de solicitação (nunca privilegiados). */
export function approvalRoles(system?: SystemAccess | null): AppRole[] {
  const base = system === 'EDU' ? ['ESTUDANTE', 'PROFESSOR'] : ['VIEWER', 'ANALYST'];
  return base as AppRole[];
}

export function defaultRoleForSystem(system?: SystemAccess | null): AppRole {
  return system === 'EDU' ? 'ESTUDANTE' : 'VIEWER';
}
