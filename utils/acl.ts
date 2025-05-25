import type { OrgRole } from '../types/roles';
import { ROLE_LEVEL } from '../types/roles';

export function hasAccess(userRole: OrgRole | null | undefined, requiredRole: OrgRole): boolean {
  if (!userRole) {
    return false; // If the user has no role, they don't have access.
  }
  // Check if the user's role level is greater than or equal to the required role level.
  return ROLE_LEVEL[userRole] >= ROLE_LEVEL[requiredRole];
}
