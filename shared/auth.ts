// User roles for access control
export enum UserRole {
  ADMIN = "admin",
  ANALYST = "analyst",
  TECHNICIAN = "technician",
  VIEWER = "viewer"
}

// Role-based permissions mapping
export const rolePermissions = {
  [UserRole.ADMIN]: {
    canManageUsers: true,
    canManageEquipmentClasses: true,
    canManageAssets: true,
    canManageFailureModes: true,
    canEditFailureHistory: true,
    canViewReports: true,
    canRunAnalysis: true
  },
  [UserRole.ANALYST]: {
    canManageUsers: false,
    canManageEquipmentClasses: true,
    canManageAssets: true,
    canManageFailureModes: true,
    canEditFailureHistory: true,
    canViewReports: true,
    canRunAnalysis: true
  },
  [UserRole.TECHNICIAN]: {
    canManageUsers: false,
    canManageEquipmentClasses: false,
    canManageAssets: false,
    canManageFailureModes: false,
    canEditFailureHistory: true,
    canViewReports: true,
    canRunAnalysis: false
  },
  [UserRole.VIEWER]: {
    canManageUsers: false,
    canManageEquipmentClasses: false,
    canManageAssets: false,
    canManageFailureModes: false,
    canEditFailureHistory: false,
    canViewReports: true,
    canRunAnalysis: false
  }
};

// Get role display name
export function getRoleDisplayName(role: UserRole): string {
  switch (role) {
    case UserRole.ADMIN:
      return "Administrator";
    case UserRole.ANALYST:
      return "Reliability Analyst";
    case UserRole.TECHNICIAN:
      return "Maintenance Technician";
    case UserRole.VIEWER:
      return "Viewer";
    default:
      return role;
  }
}

// Check if a user has a specific permission
export function hasPermission(role: UserRole, permission: keyof typeof rolePermissions[UserRole.ADMIN]): boolean {
  if (!role || !rolePermissions[role]) {
    return false;
  }
  
  return rolePermissions[role][permission] === true;
}