using AutoMapper;
using TopazERP.DomainServices.Shared.Statuses;
using TopazERP.Models.Shared;
using TopazERP.Services.Shared.Statuses.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Shared.Statuses;

public class StatusAppService: TopazERPAppServiceBase, IStatusAppService
{
    private readonly IStatusManager _statusManager;
    private readonly IMapper _mapper;
    
    public StatusAppService(IStatusManager statusManager, IMapper mapper)
    {
        _statusManager = statusManager;
        _mapper = mapper;
    }
    public async Task<IEnumerable<object>> ListAll()
    {
        return await _statusManager.ListAll();
    }
    public async Task<object> Create(CreateStatusInput input)
    {
        var obj = _mapper.Map<Status>(input);
        return await _statusManager.Create(obj);
    }
    public async Task Update(UpdateStatusInput input)
    {
        var obj = _mapper.Map<Status>(input);
        await _statusManager.Update(obj);
    }
    public async Task Delete(Guid Id)
    {
        await _statusManager.Delete(Id);
    }
}