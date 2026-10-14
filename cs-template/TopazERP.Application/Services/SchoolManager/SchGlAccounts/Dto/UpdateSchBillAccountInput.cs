using System;
using Abp.Domain.Entities;

namespace TopazERP.Services.SchoolManager.SchGlAccounts.Dto;

public class UpdateSchBillAccountInput:Entity<Guid>
{
    public int BillTypeId { get; set; }
    public Guid FeeItemId { get; set; }
    public Guid BankGlId { get; set; }
    public Guid DebitGlId { get; set; }
    public Guid CreditGlId { get; set; }
    public int TenantId { get; set; }
}