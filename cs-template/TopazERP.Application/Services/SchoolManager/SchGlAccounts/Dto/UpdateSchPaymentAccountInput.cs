using System;
using Abp.Domain.Entities;

namespace TopazERP.Services.SchoolManager.SchGlAccounts.Dto;

public class UpdateSchPaymentAccountInput:Entity<Guid>
{
    public Guid LocalDebitGlId { get; set; }
    public Guid ForeignDebitGlId { get; set; }
    public Guid LocalCreditGlId { get; set; }
    public Guid LocalOverPaymentGlId { get; set; }
    public Guid ForeignOverPaymentGlId { get; set; }
    public Guid OtherPaymentDebitGlId { get; set; }
    public Guid OtherPaymentCreditGlId { get; set; }
    public int TenantId { get; set; }
}