using System;
using System.Collections.Generic;
using TopazERP.Models.Ledger;

namespace TopazERP.Services.Ledger.Budgets.Dto;

public class CreateBudgetInput
{
    public Guid AccountId { get; set; }
    public string AccountName { get; set; }
    public Guid OuId { get; set; }
    public string OuName { get; set; }
    public DateTime BeginDate { get; set; }
    public DateTime EndDate { get; set; }
    public List<BudgetDetail> BudgetDetails { get; set; }
}

public class UpdateBudgetInput
{
    public Guid AccountId { get; set; }
    public string AccountName { get; set; }
    public Guid OuId { get; set; }
    public string OuName { get; set; }
    public DateTime BeginDate { get; set; }
    public DateTime EndDate { get; set; }
    public List<BudgetDetail> BudgetDetails { get; set; }
    public int TenantId { get; set; }
}