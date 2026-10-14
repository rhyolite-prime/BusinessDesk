using System;
using Abp.Domain.Entities;

namespace TopazERP.Services.SchoolManager.SchGlAccounts.Dto;

public class UpdateSchCreditMemoAccountInput:Entity<Guid>
{
    public Guid DebitGlId { get; set; }
    public Guid CreditGlId { get; set; }
    public int TenantId { get; set; }
}