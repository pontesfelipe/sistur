/**
 * SISTUR access model — single source of truth for role semantics on the client.
 *
 * Server-side enforcement lives in RLS policies, SECURITY DEFINER RPCs and the
 * `manage-users` edge function; everything here exists so UI code stops
 * re-declaring role lists and so the rules can be unit-tested.
 *
 * See docs/security/rbac.md for the full model and permission matrix.
 */

export const ROLES = ['ADMIN', 'ORG_ADMIN', 'ANALYST', 'VIEWER', 'ESTUDANTE', 'PROFESSOR'] as const;
export type AppRole = (typeof ROLES)[number];

export const SYSTEM_ACCESS = ['ERP', 'EDU'] as const;
export type SystemAccess = (typeof SYSTEM_ACCESS)[number];

/** Platform-wide administrator. Org-agnostic: bypasses tenant, license and module gates. */
export const PLATFORM_ADMIN_ROLE: AppRole = 'ADMIN';

/** Roles that can only be granted by a platform admin (mirrors the DB trigger). */
export const PRIVILEGED_ROLES: readonly AppRole[] = ['ADMIN', 'ORG_ADMIN'];

/** Roles a user may request for themselves during onboarding (mirrors `complete_user_onboarding`). */
export const SELF_ONBOARDING_ROLES: readonly AppRole[] = ['VIEWER', 'ESTUDANTE', 'PROFESSOR'];

/** Roles an ORG_ADMIN may assign inside its own organisation (mirrors `manage-users`). */
export const ORG_ADMIN_ASSIGNABLE_ROLES: readonly AppRole[] = ['ANALYST', 'VIEWER', 'ESTUDANTE', 'PROFESSOR'];

/** Roles that make sense for each system. ORG_ADMIN administers a tenant regardless of system. */
export const ROLES_BY_SYSTEM: Record<SystemAccess, readonly AppRole[]> = {
  ERP: ['ADMIN', 'ORG_ADMIN', 'ANALYST', 'VIEWER'],
  EDU: ['ORG_ADMIN', 'ESTUDANTE', 'PROFESSOR'],
};

/** Default role for a system when none is chosen explicitly. */
export const DEFAULT_ROLE_BY_SYSTEM: Record<SystemAccess, AppRole> = {
  ERP: 'VIEWER',
  EDU: 'ESTUDANTE',
};

export const ROLE_LABELS: Record<AppRole, string> = {
  ADMIN: 'Administrador',
  ORG_ADMIN: 'Admin Org',
  ANALYST: 'Analista',
  VIEWER: 'Visualizador',
  ESTUDANTE: 'Estudante',
  PROFESSOR: 'Professor',
};

export function isAppRole(value: unknown): value is AppRole {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

export function isSystemAccess(value: unknown): value is SystemAccess {
  return typeof value === 'string' && (SYSTEM_ACCESS as readonly string[]).includes(value);
}

export function isPrivilegedRole(role: AppRole): boolean {
  return PRIVILEGED_ROLES.includes(role);
}

/** Whether `role` is a sensible role for a user whose system access is `system`. */
export function roleMatchesSystem(role: AppRole, system: SystemAccess): boolean {
  return ROLES_BY_SYSTEM[system].includes(role);
}

/** The system a role implies, or `null` when the role fits both (ORG_ADMIN). */
export function systemForRole(role: AppRole): SystemAccess | null {
  const erp = ROLES_BY_SYSTEM.ERP.includes(role);
  const edu = ROLES_BY_SYSTEM.EDU.includes(role);
  if (erp && edu) return null;
  return erp ? 'ERP' : 'EDU';
}

export interface Actor {
  isAdmin: boolean;
  isOrgAdmin: boolean;
}

/** Roles an actor is allowed to assign to other users. */
export function assignableRoles(actor: Actor, system?: SystemAccess): AppRole[] {
  let pool: readonly AppRole[];
  if (actor.isAdmin) pool = ROLES;
  else if (actor.isOrgAdmin) pool = ORG_ADMIN_ASSIGNABLE_ROLES;
  else pool = [];
  return pool.filter(r => (system ? roleMatchesSystem(r, system) : true));
}

export function canAssignRole(actor: Actor, role: AppRole): boolean {
  return assignableRoles(actor).includes(role);
}

/**
 * Whether an actor may manage (edit role, block, remove) a target user.
 * Platform admins manage everyone but themselves; org admins manage
 * non-privileged users of their own org.
 */
export function canManageUser(
  actor: Actor & { userId: string; orgId?: string | null },
  target: { userId: string; role: AppRole; orgId?: string | null },
): boolean {
  if (actor.userId === target.userId) return false;
  if (actor.isAdmin) return true;
  if (!actor.isOrgAdmin) return false;
  if (isPrivilegedRole(target.role)) return false;
  return !!actor.orgId && actor.orgId === target.orgId;
}
