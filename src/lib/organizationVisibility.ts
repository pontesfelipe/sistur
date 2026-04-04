export const BUSINESS_ORG_NAMES = ['SISTUR', 'Autônomo', 'Demo SISTUR', 'Temporário'] as const;
export const PENDING_ORG_NAME = 'Temporário' as const;
export const DEFAULT_APPROVED_ORG_NAME = 'Autônomo' as const;

const BUSINESS_ORG_ORDER = new Map<string, number>([
  ['SISTUR', 0],
  ['Autônomo', 1],
  ['Demo SISTUR', 2],
  ['Temporário', 3],
]);

const DISPLAY_NAME_MAP = new Map<string, string>([
  ['Temporário', 'Pendentes'],
]);

export const getOrgDisplayName = (name: string): string =>
  DISPLAY_NAME_MAP.get(name) ?? name;

export const isPendingOrganizationName = (name: string): boolean =>
  name === PENDING_ORG_NAME;

export const shouldIncludeUserInOrganization = (
  organizationName: string,
  pendingApproval: boolean,
): boolean =>
  isPendingOrganizationName(organizationName) ? pendingApproval : !pendingApproval;

type NamedOrganization = {
  name: string;
};

export const isBusinessOrganization = (organization: NamedOrganization) =>
  BUSINESS_ORG_NAMES.includes(organization.name as (typeof BUSINESS_ORG_NAMES)[number]);

export const filterBusinessOrganizations = <T extends NamedOrganization>(organizations: T[]) =>
  organizations
    .filter(isBusinessOrganization)
    .sort((a, b) => {
      const orderA = BUSINESS_ORG_ORDER.get(a.name) ?? Number.MAX_SAFE_INTEGER;
      const orderB = BUSINESS_ORG_ORDER.get(b.name) ?? Number.MAX_SAFE_INTEGER;

      if (orderA !== orderB) {
        return orderA - orderB;
      }

      return a.name.localeCompare(b.name, 'pt-BR');
    });
