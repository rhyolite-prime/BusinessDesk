using System;
using System.Threading.Tasks;
using AutoMapper;
using TopazERP.DomainServices.Ledger.Vouchers;
using TopazERP.DomainServices.Ledger.Vouchers.Dto;
using TopazERP.Models.Ledger;
using TopazERP.Services.Ledger.Vouchers.Dto;

namespace TopazERP.Services.Ledger.Vouchers;

public class PaymentVoucherAppService: TopazERPAppServiceBase, IPaymentVoucherAppService
{
    private readonly IPaymentVoucherManager _paymentVoucherManager;
    private readonly IMapper _mapper;
    
    public PaymentVoucherAppService(IPaymentVoucherManager paymentVoucherManager, IMapper mapper)
    {
        _paymentVoucherManager = paymentVoucherManager;
        _mapper = mapper;
    }
    
    public async Task<object> Create(CreateGlPaymentVoucherInput input)
    {
        var obj = _mapper.Map<GlPaymentVoucher>(input);
        return await _paymentVoucherManager.Create(obj);
        
        // save to retensions
        
    }

    public async Task PostVouchers(PostVoucherDto voucherDto)
    {
        await _paymentVoucherManager.PostVouchers(voucherDto);
    }
    
    public async Task DeleteVouchers(PostVoucherDto voucherDto)
    {
        await _paymentVoucherManager.DeleteVouchers(voucherDto);
    }
    
    public async Task<object> GetDetails(Guid id)
    {
        return await _paymentVoucherManager.GetDetails(id);
    }
    
    public async Task Update(UpdateGlPaymentVoucherInput input)
    {
        var tenantInfo = await GetCurrentTenantAsync();
        
        var obj = _mapper.Map<GlPaymentVoucher>(input);
        obj.TenantId = tenantInfo.Id;
        await _paymentVoucherManager.Update(obj);
        
        // delete proposed journal entries
        await _paymentVoucherManager.DeleteProposedJournal(input.ProposedJournalHeaderId,
            input.ProposedJournalDetailIdList);
    }
    
    public async Task<object> ListAll(DateTime? startDate, DateTime? endDate, string voucherType)
    {
        return await _paymentVoucherManager.ListAll(startDate, endDate, voucherType);
    }
    public async Task<object> GeneratePreview(Guid id)
    {
        return await _paymentVoucherManager.GeneratePreview(id);
    }
    
    public async Task<object> GenerateReceiptVoucherPreview(Guid id)
    {
        return await _paymentVoucherManager.GenerateReceiptVoucherPreview(id);
    }
    
    
    
    public async Task<object> GetUnpaidWithholdingVoucher(DateTime? startDate, DateTime? endDate)
    {
        return await _paymentVoucherManager.GetUnpaidWithholdingVoucher(startDate, endDate);
    }
    
    public async Task<object> GetUnpaidVatWithholdingVoucher(DateTime? startDate, DateTime? endDate)
    {
        return await _paymentVoucherManager.GetUnpaidVatWithholdingVoucher(startDate, endDate);
    }

    public async Task<object> GetUnpaidRetensions(DateTime? startDate, DateTime? endDate)
    {
        return await _paymentVoucherManager.GetUnpaidRetensions(startDate, endDate);
    }

    public async Task<object> GetPaidWithholding(DateTime? startDate, DateTime? endDate)
    {
        return await _paymentVoucherManager.GetPaidWithholding(startDate, endDate);
    }

    public async Task<object> GetPaidVatWithholding(DateTime? startDate, DateTime? endDate)
    {
        return await _paymentVoucherManager.GetPaidVatWithholding(startDate, endDate);
    }
    
    public async Task Delete(Guid id)
    {
        await _paymentVoucherManager.Delete(id);
    }
}