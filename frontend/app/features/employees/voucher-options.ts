export interface EmployeeVoucherOption {
  id: string
  employeeIdentifier: string
  name: string
  status: number
}
export interface EmployeeOptionsPage {
  data: EmployeeVoucherOption[]
  totalCount: number
}
/** Minimal tenant-scoped payee identities only; never load full/private biodata. */
export async function loadEmployeeVoucherOptions(
  fetchPage: (query: {
    pageNo: number
    pageSize: number
  }) => Promise<EmployeeOptionsPage>,
): Promise<EmployeeVoucherOption[]> {
  const employees: EmployeeVoucherOption[] = []
  for (let pageNo = 1; pageNo <= 100; pageNo++) {
    const page = await fetchPage({ pageNo, pageSize: 100 })
    if (
      !Array.isArray(page.data) ||
      !Number.isSafeInteger(page.totalCount) ||
      page.totalCount < 0 ||
      page.data.some(
        (e) =>
          !e ||
          typeof e.id !== 'string' ||
          !e.id ||
          typeof e.name !== 'string' ||
          typeof e.employeeIdentifier !== 'string' ||
          !Number.isInteger(e.status),
      )
    )
      throw new Error('Invalid employee options response.')
    employees.push(...page.data)
    if (employees.length >= page.totalCount) return employees
    if (!page.data.length)
      throw new Error('Employee options could not be loaded completely.')
  }
  throw new Error(
    'Employee directory exceeds the supported voucher lookup size.',
  )
}
