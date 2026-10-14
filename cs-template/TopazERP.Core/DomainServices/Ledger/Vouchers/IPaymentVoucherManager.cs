using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.DomainServices.Ledger.Vouchers.Dto;
using TopazERP.Models.Ledger;

namespace TopazERP.DomainServices.Ledger.Vouchers;

public interface IPaymentVoucherManager : Abp.Domain.Services.IDomainService
{
    Task<object> Create(GlPaymentVoucher paymentVoucher);
    Task PostVouchers(PostVoucherDto voucherDto);
    Task DeleteVouchers(PostVoucherDto voucherDto);
    Task<object> GeneratePreview(Guid id);
    Task<object> GenerateReceiptVoucherPreview(Guid id);
    
    Task<object> GetDetails(Guid id);
    Task Update(GlPaymentVoucher paymentVoucher);
    Task<object> ListAll(DateTime? startDate, DateTime? endDate);
    Task<object> ListAll(DateTime? startDate, DateTime? endDate, string voucherType);
    Task DeleteProposedJournal(Guid id, List<Guid> journalIds);
    Task<object> GetUnpaidWithholdingVoucher(DateTime? startDate, DateTime? endDate);
    Task<object> GetUnpaidVatWithholdingVoucher(DateTime? startDate, DateTime? endDate);
    Task<object> GetUnpaidRetensions(DateTime? startDate, DateTime? endDate);
    Task<object> GetPaidWithholding(DateTime? startDate, DateTime? endDate);
    Task<object> GetPaidVatWithholding(DateTime? startDate, DateTime? endDate);
    Task Delete(Guid id);
}