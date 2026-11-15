export const workspaces = {
  student: {name: 'Student', dashboard: '/student'},
  faculty: {name: 'Faculty', dashboard: '/faculty'},
  admin: {name: 'Admin', dashboard: '/admin'},
}

// Only pass the role from the authenticated backend profile to this helper.
export function dashboardFor(role) {
  const key = typeof role === 'string' ? role.toLowerCase() : ''
  return Object.hasOwn(workspaces, key) ? workspaces[key].dashboard : null
}
