export function voucherDescription(input: {
  type: string
  payee?: string
  mode: string
  date?: string
  currency: string
  amount: string
  invoices: string[]
  references: string[]
}) {
  const unique = (values: string[]) => [
    ...new Set(values.map((x) => x.trim()).filter(Boolean)),
  ]
  return [
    input.type,
    input.payee,
    input.mode,
    input.date,
    input.currency && `${input.currency} ${input.amount}`,
    unique(input.invoices).length
      ? `Invoice ${unique(input.invoices).join(', ')}`
      : '',
    unique(input.references).length
      ? `Ref ${unique(input.references).join(', ')}`
      : '',
  ]
    .filter(Boolean)
    .join(' · ')
    .slice(0, 300)
}
