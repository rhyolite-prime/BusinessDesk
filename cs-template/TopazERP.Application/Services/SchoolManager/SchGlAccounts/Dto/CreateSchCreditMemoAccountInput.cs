using System;

namespace TopazERP.Services.SchoolManager.SchGlAccounts.Dto;

public class CreateSchCreditMemoAccountInput
{
    public Guid DebitGlId { get; set; }
    public Guid CreditGlId { get; set; }
}