/** Reference data shared by onboarding forms across modules. */
export default defineEventHandler(() => {
  const d = db()
  return {
    offices: d.offices.map(o => ({ value: o.id, label: o.name })),
    staff: d.staff.filter(s => s.status === 'active').map(s => ({ value: s.id, label: s.displayName, officeId: s.officeId, isLoanOfficer: s.isLoanOfficer })),
    loanOfficers: d.staff.filter(s => s.isLoanOfficer && s.status === 'active').map(s => ({ value: s.id, label: `${s.displayName} (${d.offices.find(o => o.id === s.officeId)?.name ?? ''})` })),
    paymentTypes: d.paymentTypes.map(t => ({ value: t.name, label: t.name })),
    idTypes: ['Ghana Card', 'Voter ID', "Driver's Licence", 'NHIS Card', 'Passport'].map(x => ({ value: x, label: x })),
    roles: d.roles.map(r => ({ value: r.name, label: r.name })),
  }
})
