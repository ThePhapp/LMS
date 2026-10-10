export const AUTHENTICATED_ROLES = Object.freeze(['student', 'lecturer', 'admin']);
export const INSTRUCTOR_ROLES = Object.freeze(['lecturer', 'admin']);
export const ADMIN_ROLES = Object.freeze(['admin']);

export const hasAllowedRole = (user, allowedRoles = AUTHENTICATED_ROLES) => (
  Boolean(user && allowedRoles.includes(user.role))
);

export const getRoleHomePath = (role) => {
  if (role === 'admin') return '/admin';
  if (role === 'lecturer') return '/instructor/dashboard';
  if (role === 'student') return '/dashboard';
  return '/';
};
