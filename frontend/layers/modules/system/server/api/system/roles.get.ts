/** Roles & permissions matrix. */
export default defineEventHandler(() => {
  const d = db()
  const groups = [
    { group: 'Clients', perms: ['clients.read', 'clients.write'] },
    { group: 'Groups', perms: ['groups.read', 'groups.write'] },
    { group: 'Loans', perms: ['loans.read', 'loans.write', 'loans.approve', 'loans.disburse', 'loans.repay'] },
    { group: 'Savings', perms: ['savings.read', 'savings.write', 'savings.approve', 'savings.deposit', 'savings.withdraw'] },
    { group: 'Accounting', perms: ['accounting.read', 'accounting.write', 'accounting.close'] },
    { group: 'Organization', perms: ['organization.read', 'organization.write'] },
    { group: 'Reports', perms: ['reports.read'] },
    { group: 'Administration', perms: ['tasks.read', 'tasks.check', 'audit.read', 'users.write'] },
  ]
  const roles = d.roles.map(r => ({
    id: r.id, name: r.name, description: r.description,
    members: d.users.filter(u => u.roleNames.includes(r.name)).length,
    wildcard: r.permissions.includes('*'),
    permissions: r.permissions,
  }))
  return { roles, groups }
})
