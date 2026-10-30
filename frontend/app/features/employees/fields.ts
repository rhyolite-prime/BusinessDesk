// Mirrors the backend's editable EmployeeFields contract. Numeric amounts stay strings.
export const employeeFields = [
  {
    key: 'employeeIdentifier',
    label: 'Employee identifier',
    group: 'Employment',
    kind: 'text',
    max: 20,
    required: true,
    nullable: false,
  },
  {
    key: 'firstName',
    label: 'First name',
    group: 'Employment',
    kind: 'text',
    max: 100,
    required: true,
    nullable: false,
  },
  {
    key: 'otherName',
    label: 'Other names',
    group: 'Employment',
    kind: 'text',
    max: 100,
    required: false,
    nullable: false,
  },
  {
    key: 'lastName',
    label: 'Last name',
    group: 'Employment',
    kind: 'text',
    max: 100,
    required: true,
    nullable: false,
  },
  {
    key: 'employeePhoto',
    label: 'Employee photo path / URL',
    group: 'Employment',
    kind: 'text',
    max: 350,
    required: false,
    nullable: false,
  },
  {
    key: 'title',
    label: 'Title',
    group: 'Employment',
    kind: 'text',
    max: 50,
    required: false,
    nullable: false,
  },
  {
    key: 'gender',
    label: 'Gender',
    group: 'Personal',
    kind: 'text',
    max: 10,
    required: false,
    nullable: false,
  },
  {
    key: 'status',
    label: 'Employee status code',
    group: 'Employment',
    kind: 'int',
    max: 0,
    required: false,
    nullable: false,
  },
  {
    key: 'cityOrLocation',
    label: 'City / location',
    group: 'Contact',
    kind: 'text',
    max: 100,
    required: false,
    nullable: false,
  },
  {
    key: 'residenceAddress',
    label: 'Residence address',
    group: 'Contact',
    kind: 'text',
    max: 150,
    required: false,
    nullable: false,
  },
  {
    key: 'departmentId',
    label: 'Department reference UUID',
    group: 'Classifications',
    kind: 'uuid',
    max: 0,
    required: false,
    nullable: true,
  },
  {
    key: 'departmentName',
    label: 'Department name',
    group: 'Classifications',
    kind: 'text',
    max: 150,
    required: false,
    nullable: false,
  },
  {
    key: 'categoryId',
    label: 'Category reference UUID',
    group: 'Classifications',
    kind: 'uuid',
    max: 0,
    required: false,
    nullable: true,
  },
  {
    key: 'categoryName',
    label: 'Category name',
    group: 'Classifications',
    kind: 'text',
    max: 150,
    required: false,
    nullable: false,
  },
  {
    key: 'dateAppointed',
    label: 'Date appointed',
    group: 'Employment',
    kind: 'date',
    max: 0,
    required: true,
    nullable: false,
  },
  {
    key: 'salaryGradeId',
    label: 'Salary grade reference UUID',
    group: 'Classifications',
    kind: 'uuid',
    max: 0,
    required: false,
    nullable: true,
  },
  {
    key: 'salaryGradeName',
    label: 'Salary grade name',
    group: 'Classifications',
    kind: 'text',
    max: 150,
    required: false,
    nullable: false,
  },
  {
    key: 'salaryNotchId',
    label: 'Salary notch reference UUID',
    group: 'Classifications',
    kind: 'uuid',
    max: 0,
    required: false,
    nullable: true,
  },
  {
    key: 'salaryNotchName',
    label: 'Salary notch name',
    group: 'Classifications',
    kind: 'text',
    max: 150,
    required: false,
    nullable: false,
  },
  {
    key: 'rankId',
    label: 'Rank reference UUID',
    group: 'Classifications',
    kind: 'uuid',
    max: 0,
    required: false,
    nullable: true,
  },
  {
    key: 'rankName',
    label: 'Rank name',
    group: 'Classifications',
    kind: 'text',
    max: 150,
    required: false,
    nullable: false,
  },
  {
    key: 'taxIdentificationNo',
    label: 'Tax identification number',
    group: 'Identity',
    kind: 'text',
    max: 20,
    required: false,
    nullable: false,
  },
  {
    key: 'dateOfBirth',
    label: 'Date of birth',
    group: 'Personal',
    kind: 'date',
    max: 0,
    required: true,
    nullable: false,
  },
  {
    key: 'personalEmail',
    label: 'Personal email',
    group: 'Contact',
    kind: 'text',
    max: 100,
    required: false,
    nullable: false,
  },
  {
    key: 'maritalStatus',
    label: 'Marital status',
    group: 'Personal',
    kind: 'text',
    max: 20,
    required: false,
    nullable: false,
  },
  {
    key: 'religion',
    label: 'Religion',
    group: 'Personal',
    kind: 'text',
    max: 100,
    required: false,
    nullable: false,
  },
  {
    key: 'nationality',
    label: 'Nationality',
    group: 'Personal',
    kind: 'text',
    max: 100,
    required: false,
    nullable: false,
  },
  {
    key: 'hometown',
    label: 'Hometown',
    group: 'Personal',
    kind: 'text',
    max: 100,
    required: false,
    nullable: false,
  },
  {
    key: 'primaryPhoneNumber',
    label: 'Primary phone number',
    group: 'Contact',
    kind: 'text',
    max: 20,
    required: false,
    nullable: false,
  },
  {
    key: 'secondaryPhoneNumber',
    label: 'Secondary phone number',
    group: 'Contact',
    kind: 'text',
    max: 20,
    required: false,
    nullable: false,
  },
  {
    key: 'companyEmail',
    label: 'Company email',
    group: 'Contact',
    kind: 'text',
    max: 100,
    required: false,
    nullable: false,
  },
  {
    key: 'nationalIdentificationNo',
    label: 'National identification number',
    group: 'Identity',
    kind: 'text',
    max: 20,
    required: false,
    nullable: false,
  },
  {
    key: 'nationalHealthInsuranceNo',
    label: 'National health insurance number',
    group: 'Identity',
    kind: 'text',
    max: 20,
    required: false,
    nullable: false,
  },
  {
    key: 'driverLicenseNo',
    label: 'Driver licence number',
    group: 'Identity',
    kind: 'text',
    max: 20,
    required: false,
    nullable: false,
  },
  {
    key: 'driverLicenseIssueDate',
    label: 'Driver licence issue date',
    group: 'Identity',
    kind: 'date',
    max: 0,
    required: false,
    nullable: true,
  },
  {
    key: 'driverLicenseExpiryDate',
    label: 'Driver licence expiry date',
    group: 'Identity',
    kind: 'date',
    max: 0,
    required: false,
    nullable: true,
  },
  {
    key: 'identityType',
    label: 'Identity type',
    group: 'Identity',
    kind: 'text',
    max: 50,
    required: false,
    nullable: false,
  },
  {
    key: 'identityNo',
    label: 'Identity number',
    group: 'Identity',
    kind: 'text',
    max: 20,
    required: false,
    nullable: false,
  },
  {
    key: 'height',
    label: 'Height (metres)',
    group: 'Health & benefits',
    kind: 'decimal',
    max: 0,
    required: false,
    nullable: false,
  },
  {
    key: 'weight',
    label: 'Weight (kg)',
    group: 'Health & benefits',
    kind: 'decimal',
    max: 0,
    required: false,
    nullable: false,
  },
  {
    key: 'languages',
    label: 'Languages',
    group: 'Personal',
    kind: 'array',
    max: 0,
    required: false,
    nullable: false,
  },
  {
    key: 'interests',
    label: 'Interests',
    group: 'Personal',
    kind: 'array',
    max: 0,
    required: false,
    nullable: false,
  },
  {
    key: 'healthIssues',
    label: 'Health issues',
    group: 'Health & benefits',
    kind: 'array',
    max: 0,
    required: false,
    nullable: false,
  },
  {
    key: 'leaveDaysEntitled',
    label: 'Leave days entitled',
    group: 'Health & benefits',
    kind: 'int',
    max: 0,
    required: false,
    nullable: false,
  },
  {
    key: 'medicalExpensesLimit',
    label: 'Medical expenses limit',
    group: 'Health & benefits',
    kind: 'decimal',
    max: 0,
    required: false,
    nullable: false,
  },
  {
    key: 'userId',
    label: 'Linked user UUID',
    group: 'Employment',
    kind: 'uuid',
    max: 0,
    required: false,
    nullable: true,
  },
] as const
export type EmployeeKey = (typeof employeeFields)[number]['key']
export type EmployeeForm = Record<
  EmployeeKey,
  string | number | string[] | null
>
export interface EmployeeSummary {
  id: string
  version: number
  employeeIdentifier: string
  firstName: string
  otherName: string
  lastName: string
  departmentName: string
  categoryName: string
  status: number
}
export type EmployeeRecord = EmployeeForm &
  EmployeeSummary & { createdAt: string; lastModifiedAt: string | null }
export function blankEmployee(): EmployeeForm {
  return Object.fromEntries(
    employeeFields.map((f) => [
      f.key,
      f.kind === 'array'
        ? []
        : f.kind === 'int'
          ? 0
          : f.kind === 'decimal'
            ? '0'
            : f.nullable
              ? null
              : '',
    ]),
  ) as EmployeeForm
}
export function employeePayload(
  form: EmployeeForm,
  arrays: Record<string, string>,
  version?: number,
) {
  const result: Record<string, unknown> = {}
  for (const field of employeeFields) {
    const value = form[field.key]
    result[field.key] =
      field.kind === 'array'
        ? (arrays[field.key] || '')
            .split('\n')
            .map((v) => v.trim())
            .filter(Boolean)
        : field.kind === 'int'
          ? String(value).trim()
            ? Number(value)
            : null
          : field.nullable && !value
            ? null
            : value
  }
  if (version !== undefined) result.version = version
  return result
}
export const employeeName = (e: EmployeeSummary) =>
  [e.firstName, e.otherName, e.lastName].filter(Boolean).join(' ')
