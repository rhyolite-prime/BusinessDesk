using System;

namespace TopazERP.Services.SchoolManager.SchGlAccounts.Dto;

public class CreateSchPaymentAccountInput
{
    public Guid LocalDebitGlId { get; set; }
    public Guid ForeignDebitGlId { get; set; }
    public Guid LocalCreditGlId { get; set; }
    public Guid LocalOverPaymentGlId { get; set; }
    public Guid ForeignOverPaymentGlId { get; set; }
    public Guid OtherPaymentDebitGlId { get; set; }
    public Guid OtherPaymentCreditGlId { get; set; }
}