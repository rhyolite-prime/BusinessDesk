using System;
using System.Threading.Tasks;
using TopazERP.DomainServices.Ledger.Vouchers.Dto;
using TopazERP.Services.Ledger.Vouchers.Dto;

namespace TopazERP.Services.Ledger.Vouchers;

public interface IPaymentVoucherAppService: Abp.Application.Services.IApplicationService
{
    Task<object> Create(CreateGlPaymentVoucherInput input);
    Task<object> GeneratePreview(Guid id);
    Task<object> GenerateReceiptVoucherPreview(Guid id);
    Task<object> GetDetails(Guid id);
    Task PostVouchers(PostVoucherDto voucherDto);
    Task DeleteVouchers(PostVoucherDto voucherDto);
    Task Update(UpdateGlPaymentVoucherInput input);
    Task<object> ListAll(DateTime? startDate, DateTime? endDate, string voucherType);
    Task<object> GetUnpaidWithholdingVoucher(DateTime? startDate, DateTime? endDate);
    Task<object> GetUnpaidVatWithholdingVoucher(DateTime? startDate, DateTime? endDate);
    Task<object> GetUnpaidRetensions(DateTime? startDate, DateTime? endDate);
    Task<object> GetPaidWithholding(DateTime? startDate, DateTime? endDate);
    Task<object> GetPaidVatWithholding(DateTime? startDate, DateTime? endDate);
    Task Delete(Guid id);
}