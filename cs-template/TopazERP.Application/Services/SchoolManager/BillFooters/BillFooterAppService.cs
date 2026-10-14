using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using AutoMapper;
using TopazERP.DomainServices.SchoolManger.BillFooters;
using TopazERP.Models.Sch;
using TopazERP.Services.SchoolManager.BillFooters.Dto;

namespace TopazERP.Services.SchoolManager.BillFooters;

public class BillFooterAppService: TopazERPAppServiceBase,IBillFooterAppService
{
    private readonly IBillFooterManager _billFooterManager;
    private readonly IMapper _mapper;

    public BillFooterAppService(IBillFooterManager billFooterManager, IMapper mapper)
    {
        _billFooterManager = billFooterManager;
        _mapper = mapper;
    }

    public async Task<object> Create(CreateBillFooterInput input)
    {
        var entity = _mapper.Map<BillFooter>(input);
        return await _billFooterManager.Create(entity);
    }

    public async Task Update(UpdateBillFooterInput input)
    {
        var entity = _mapper.Map<BillFooter>(input);
        await _billFooterManager.Update(entity);
    }

    public async Task<IEnumerable<object>> ListAll()
    {
        return await _billFooterManager.ListAll();
    }

    public async Task Delete(Guid id)
    {
        await _billFooterManager.Delete(id);
    }
}