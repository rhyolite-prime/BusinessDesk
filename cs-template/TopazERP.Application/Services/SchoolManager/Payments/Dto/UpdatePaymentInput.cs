using System;
using Abp.Application.Services.Dto;

namespace TopazERP.Services.SchoolManager.Payments.Dto;

public class UpdatePaymentInput: EntityDto<Guid>
{
     public Guid AcademicYearId { get; set; }
        public Guid TermId { get; set; }
        public Guid ClassId { get; set; }
        public Guid StudentId { get; set; }
        public DateTime PaymentDate { get; set; }
        public decimal AmountDue { get; set; }
        public decimal AmountToPaid { get; set; }
        public decimal Balance { get; set; }
        public int PaymentMethod { get; set; }
        public string ReferenceNumber { get; set; }
        public string BatchNumber { get; set; }
        public Guid CurrencyId { get; set; }
        public decimal BuyRate { get; set; }
        public Guid BankGlId { get; set; }
        public Guid BankId { get; set; }
        public Guid BankBranchId { get; set; }
        public string ChequeNumber { get; set; }
        public DateTime ChequeDate { get; set; }
        public string Description { get; set; }
        public bool IsPosted { get; set; }
        public bool IsCanceled { get; set; }
        public string CanceledBy { get; set; }
        public DateTime? CanceledDate { get; set; }
        public string ReceiptNumber { get; set; }
        public bool IsProcessed { get; set; }
        public Guid LegalGuardianId { get; set; }
        public bool ByLegalGuardian { get; set; }
        public Guid CreditGlId { get; set; }
        public Guid DebitGlId { get; set; }
        public bool IsMultiCurrency { get; set; }
        public int TenantId { get; set; }
}