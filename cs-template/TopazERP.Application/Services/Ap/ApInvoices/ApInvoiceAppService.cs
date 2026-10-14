using AutoMapper;
using TopazERP.DomainServices.Ap.ApInvoices;
using TopazERP.DomainServices.Ap.ApInvoices.Dto;
using TopazERP.Models.Ap;
using TopazERP.Services.Ap.ApInvoices.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TopazERP.Services.Ap.ApVouchers.Dto;

namespace TopazERP.Services.Ap.ApInvoices;

public class ApInvoiceAppService: TopazERPAppServiceBase, IApInvoiceAppService
{
    private readonly IApInvoiceManager _apInvoiceManager;
    private readonly IMapper _mapper;

    public ApInvoiceAppService(IApInvoiceManager apInvoiceManager, IMapper mapper)
    {
        _apInvoiceManager = apInvoiceManager;
        _mapper = mapper;
    }

    public async Task<object> ListAll()
    {
        return await _apInvoiceManager.ListAll();
    }

    public async Task<object> Create(CreateInvoiceInput input)
    {
        var obj = _mapper.Map<ApInvoice>(input);
        return await _apInvoiceManager.Create(obj);
    }

    public async Task Update(UpdateInvoiceInput input)
    {
        var obj = _mapper.Map<ApInvoice>(input);
     await _apInvoiceManager.Update(obj);
        
    }
    public async Task<object> PostInvoice(List<Guid> invoiceIds)
    {
      return await _apInvoiceManager.PostInvoice(invoiceIds);
    }
    
    public async Task<object> CancelInvoice(List<Guid> invoiceIds)
    {
        return await _apInvoiceManager.CancelInvoice(invoiceIds);
    }
    
    public async Task<object> EditPostedInvoice(UpdateInvoiceInput input)
    {
        var obj = _mapper.Map<ApInvoice>(input);
        return await _apInvoiceManager.EditPostedInvoice(obj);
    }
    
    public async Task<object> ApproveInvoice(List<Guid> invoiceIds)
    {
        return await _apInvoiceManager.ApproveInvoice(invoiceIds);
    }
    
    public async Task<ApInvoiceDto> GetById(Guid id)
    {
        var invoice = await _apInvoiceManager.GetById(id);
        return _mapper.Map<ApInvoiceDto>(invoice);
    }

   

}