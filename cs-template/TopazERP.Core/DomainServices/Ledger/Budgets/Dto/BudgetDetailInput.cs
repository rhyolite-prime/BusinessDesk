using System;

namespace TopazERP.DomainServices.Ledger.Budgets.Dto;

public class BudgetDetailInput
{
    public Guid BudgetId { get; set; }
    public Guid Id { get; set; }
    public int Month { get; set; }
    public int Year { get; set; }
    public decimal BudgetAmount { get; set; }
    public decimal RevisedAmount { get; set; }
}