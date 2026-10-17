/** Standard report catalog (Fineract-style reports). */
export default defineEventHandler(() => ({
  pageItems: [
    { key: 'par', name: 'Portfolio at Risk (PAR > 30 days)', category: 'Loans', description: 'Overdue loans with days-past-due, exposure and provisioning view.', icon: 'exclamation-triangle' },
    { key: 'collections', name: 'Collections Sheet', category: 'Loans', description: 'Expected vs collected installments by loan officer for the month.', icon: 'banknotes' },
    { key: 'trial-balance', name: 'Trial Balance', category: 'Accounting', description: 'GL debit and credit balances across the full chart of accounts.', icon: 'book-open' },
    { key: 'savings-portfolio', name: 'Savings Portfolio by Product', category: 'Savings', description: 'Accounts, deposits and dormancy by savings product.', icon: 'wallet' },
    { key: 'loan-portfolio', name: 'Loan Portfolio by Product', category: 'Loans', description: 'Disbursed, outstanding and arrears per loan product.', icon: 'cube' },
    { key: 'branch-performance', name: 'Branch Performance', category: 'Organization', description: 'Clients, portfolio and deposits by office.', icon: 'building-office' },
  ],
}))
