export const hrNavigationGroups = [
  { title: 'People', icon: 'users', links: [
    { label: 'Employee contact changes', to: '/hr/profile-changes', icon: 'user' },
    { label: 'Contact change review', to: '/hr/profile-requests', icon: 'document-text' },
    { label: 'Employee directory', to: '/hr/employees', icon: 'users' },
    { label: 'Time off', to: '/hr/leave', icon: 'calendar-days' },
    { label: 'Leave estimate', to: '/hr/balances', icon: 'calendar-days' },
    { label: 'Recruitment', to: '/hr/recruitment', icon: 'briefcase' },
    { label: 'Onboarding', to: '/hr/onboarding', icon: 'document-text' },
    { label: 'Performance', to: '/hr/performance', icon: 'chart-bar-square' },
  ] },
  { title: 'Account', icon: 'user', links: [
    { label: 'Preferences', to: '/preferences', icon: 'cog-6-tooth' },
    { label: 'Account & subscription', to: '/account', icon: 'building-office' },
  ] },
]
export const hrSearchItems = [
  { label: 'Employee contact changes', detail: 'Submit contact changes for an employee', to: '/hr/profile-changes' },
  { label: 'Contact change review', detail: 'Employee contact change requests', to: '/hr/profile-requests' },
  { label: 'Employee directory', detail: 'Employee profiles and records', to: '/hr/employees' },
  { label: 'Time off', detail: 'Leave requests and decisions', to: '/hr/leave' },
  { label: 'Leave estimate', detail: 'Annual leave calendar-day estimate', to: '/hr/balances' },
  { label: 'Recruitment', detail: 'Job openings and candidates', to: '/hr/recruitment' },
  { label: 'Onboarding', detail: 'New-starter tasks', to: '/hr/onboarding' },
  { label: 'Performance', detail: 'Employee reviews', to: '/hr/performance' },
]
