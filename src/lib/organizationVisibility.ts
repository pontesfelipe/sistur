export const BUSINESS_ORG_NAMES = ['SISTUR', 'Autônomo'] as const;

const BUSINESS_ORG_ORDER = new Map<string, number>([
  ['SISTUR', 0],
  ['Autônomo', 1],
]);

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
