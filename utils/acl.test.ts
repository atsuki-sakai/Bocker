import { hasAccess } from './acl';
import type { OrgRole } from '../types/roles';

describe('hasAccess', () => {
  // Test cases for admin role
  it('admin should have access to all lower or equal roles', () => {
    expect(hasAccess('admin', 'admin')).toBe(true);
    expect(hasAccess('admin', 'owner')).toBe(true);
    expect(hasAccess('admin', 'manager')).toBe(true);
    expect(hasAccess('admin', 'staff')).toBe(true);
  });

  // Test cases for owner role
  it('owner should have access to owner, manager, and staff roles, but not admin', () => {
    expect(hasAccess('owner', 'owner')).toBe(true);
    expect(hasAccess('owner', 'manager')).toBe(true);
    expect(hasAccess('owner', 'staff')).toBe(true);
    expect(hasAccess('owner', 'admin')).toBe(false);
  });

  // Test cases for manager role
  it('manager should have access to manager and staff roles, but not admin or owner', () => {
    expect(hasAccess('manager', 'manager')).toBe(true);
    expect(hasAccess('manager', 'staff')).toBe(true);
    expect(hasAccess('manager', 'owner')).toBe(false);
    expect(hasAccess('manager', 'admin')).toBe(false);
  });

  // Test cases for staff role
  it('staff should only have access to staff role', () => {
    expect(hasAccess('staff', 'staff')).toBe(true);
    expect(hasAccess('staff', 'manager')).toBe(false);
    expect(hasAccess('staff', 'owner')).toBe(false);
    expect(hasAccess('staff', 'admin')).toBe(false);
  });

  // Test cases for null or undefined user roles
  it('should return false if userRole is null', () => {
    expect(hasAccess(null, 'staff')).toBe(false);
    expect(hasAccess(null, 'admin')).toBe(false);
  });

  it('should return false if userRole is undefined', () => {
    expect(hasAccess(undefined, 'staff')).toBe(false);
    expect(hasAccess(undefined, 'admin')).toBe(false);
  });

  // Test case for a scenario where requiredRole might not be a valid OrgRole (though TS should prevent this)
  // This depends on how strictly you want to test; typically, type safety makes this less critical for runtime.
  // For example, if requiredRole could somehow be an invalid string:
  // it('should handle invalid requiredRole gracefully if possible, though types aim to prevent this', () => {
  //   expect(hasAccess('admin', 'invalidRole' as OrgRole)).toBe(false); // Behavior depends on JS coercion if types are bypassed
  // });
});
