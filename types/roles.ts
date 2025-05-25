export type OrgRole = 'admin' | 'owner' | 'manager' | 'staff';

export const ROLE_LEVEL: Record<OrgRole, number> = {
  admin: 4,
  owner: 3,
  manager: 2,
  staff: 1,
};
