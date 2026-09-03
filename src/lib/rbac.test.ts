import { describe, it, expect } from 'vitest';
import {
  ROLES,
  PRIVILEGED_ROLES,
  SELF_ONBOARDING_ROLES,
  ORG_ADMIN_ASSIGNABLE_ROLES,
  assignableRoles,
  canAssignRole,
  canManageUser,
  isAppRole,
  isPrivilegedRole,
  roleMatchesSystem,
  systemForRole,
} from './rbac';

describe('rbac role sets', () => {
  it('privileged roles are never self-onboardable', () => {
    for (const role of PRIVILEGED_ROLES) {
      expect(SELF_ONBOARDING_ROLES).not.toContain(role);
      expect(ORG_ADMIN_ASSIGNABLE_ROLES).not.toContain(role);
    }
  });

  it('ANALYST cannot be self-requested', () => {
    expect(SELF_ONBOARDING_ROLES).not.toContain('ANALYST');
  });

  it('every role belongs to at least one system', () => {
    for (const role of ROLES) {
      expect(roleMatchesSystem(role, 'ERP') || roleMatchesSystem(role, 'EDU')).toBe(true);
    }
  });

  it('validates role strings', () => {
    expect(isAppRole('ADMIN')).toBe(true);
    expect(isAppRole('SUPERUSER')).toBe(false);
    expect(isAppRole(null)).toBe(false);
  });

  it('maps roles to systems', () => {
    expect(systemForRole('VIEWER')).toBe('ERP');
    expect(systemForRole('PROFESSOR')).toBe('EDU');
    expect(systemForRole('ORG_ADMIN')).toBeNull();
    expect(isPrivilegedRole('ORG_ADMIN')).toBe(true);
    expect(isPrivilegedRole('VIEWER')).toBe(false);
  });
});

describe('assignableRoles', () => {
  it('platform admin can assign any role, filtered by system', () => {
    expect(assignableRoles({ isAdmin: true, isOrgAdmin: false })).toEqual([...ROLES]);
    expect(assignableRoles({ isAdmin: true, isOrgAdmin: false }, 'EDU')).toEqual(['ORG_ADMIN', 'ESTUDANTE', 'PROFESSOR']);
  });

  it('org admin cannot assign privileged roles', () => {
    const roles = assignableRoles({ isAdmin: false, isOrgAdmin: true });
    expect(roles).toEqual(['ANALYST', 'VIEWER', 'ESTUDANTE', 'PROFESSOR']);
    expect(canAssignRole({ isAdmin: false, isOrgAdmin: true }, 'ORG_ADMIN')).toBe(false);
    expect(canAssignRole({ isAdmin: false, isOrgAdmin: true }, 'ADMIN')).toBe(false);
  });

  it('regular users assign nothing', () => {
    expect(assignableRoles({ isAdmin: false, isOrgAdmin: false })).toEqual([]);
  });
});

describe('canManageUser', () => {
  const admin = { isAdmin: true, isOrgAdmin: false, userId: 'a', orgId: 'org1' };
  const orgAdmin = { isAdmin: false, isOrgAdmin: true, userId: 'o', orgId: 'org1' };

  it('nobody manages themselves', () => {
    expect(canManageUser(admin, { userId: 'a', role: 'ADMIN', orgId: 'org1' })).toBe(false);
    expect(canManageUser(orgAdmin, { userId: 'o', role: 'ORG_ADMIN', orgId: 'org1' })).toBe(false);
  });

  it('platform admin manages users in any org', () => {
    expect(canManageUser(admin, { userId: 'x', role: 'ADMIN', orgId: 'org9' })).toBe(true);
  });

  it('org admin manages only non-privileged users of its own org', () => {
    expect(canManageUser(orgAdmin, { userId: 'x', role: 'VIEWER', orgId: 'org1' })).toBe(true);
    expect(canManageUser(orgAdmin, { userId: 'x', role: 'VIEWER', orgId: 'org2' })).toBe(false);
    expect(canManageUser(orgAdmin, { userId: 'x', role: 'ORG_ADMIN', orgId: 'org1' })).toBe(false);
    expect(canManageUser(orgAdmin, { userId: 'x', role: 'ADMIN', orgId: 'org1' })).toBe(false);
  });
});
