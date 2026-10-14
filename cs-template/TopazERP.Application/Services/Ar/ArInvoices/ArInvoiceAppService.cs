using TopazERP.DomainServices.Ar.ArInvoices;
using TopazERP.Models.Ar;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using AutoMapper;
using TopazERP.Models.Ap;
using TopazERP.Services.Ap.ApInvoices.Dto;
using TopazERP.Services.Ar.ArInvoices.Dto;
using TopazERP.Services.Ar.ArInvoices;


namespace TopazERP.Services.Ar.ArInvoices;

public class ArInvoiceAppService: TopazERPAppServiceBase, IArInvoiceAppService
{
    private readonly IArInvoiceManager _arInvoiceManager;
    private readonly IMapper _mapper;

    public ArInvoiceAppService(IArInvoiceManager arInvoiceManager, IMapper mapper)
    {
        _arInvoiceManager = arInvoiceManager;
        _mapper = mapper;
    }

    public async Task<object> ListAll()
    {
        return await _arInvoiceManager.ListAll();
    }
    public async Task<object> Create(CreateArInvoiceInput input)
    {
        var obj = _mapper.Map<ArInvoice>(input);
        return await _arInvoiceManager.Create(obj);
    }

    public async Task Update(UpdateArInvoiceInput input)
    {
        var obj = _mapper.Map<ArInvoice>(input);
        await _arInvoiceManager.Update(obj);
        
    }
    
    public async Task<object> EditPostedInvoice(UpdateArInvoiceInput input)
    {
        var obj = _mapper.Map<ArInvoice>(input);
        return await _arInvoiceManager.EditPostedInvoice(obj);
    }

    public async Task<object> PostInvoice(List<Guid> invoiceIds)
    {
        return await _arInvoiceManager.PostInvoice(invoiceIds);
    }
    
    public async Task<object> CancelInvoice(List<Guid> invoiceIds)
    {
        return await _arInvoiceManager.CancelInvoice(invoiceIds);
    }

    public async Task<object> ApproveInvoice(List<Guid> invoiceIds)
    {
        return await _arInvoiceManager.ApproveInvoice(invoiceIds);
    }
}