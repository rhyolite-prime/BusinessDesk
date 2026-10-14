using System;

namespace TopazERP.Services.SchoolManager.SchGlAccounts.Dto;

public class CreateSchBillAccountInput
{
    public int BillTypeId { get; set; }
    public Guid FeeItemId { get; set; }
    public Guid BankGlId { get; set; }
    public Guid DebitGlId { get; set; }
    public Guid CreditGlId { get; set; }
}