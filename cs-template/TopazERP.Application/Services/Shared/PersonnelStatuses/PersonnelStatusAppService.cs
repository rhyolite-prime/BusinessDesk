using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using AutoMapper;
using TopazERP.DomainServices.Shared.PersonnelStatuses;
using TopazERP.Services.Shared.PersonnelStatus.Dto;

namespace TopazERP.Services.Shared.PersonnelStatuses;

public class PersonnelStatusAppService : Abp.Application.Services.ApplicationService, IPersonnelStatusAppService
{
    private readonly IPersonnelStatusManager _personnelStatusManager;
    private readonly IMapper _mapper;

    public PersonnelStatusAppService(IPersonnelStatusManager personnelStatusManager, IMapper mapper)
    {
        _personnelStatusManager = personnelStatusManager;
        _mapper = mapper;
    }


    public async Task<object> ListAll()
    {
        return await _personnelStatusManager.ListAll();
    }

    /// <summary>
    /// 
    /// </summary>
    /// <param name="input"></param>
    /// <returns></returns>
    public async Task<object> Create(CreatePersonnelStatusInput input)
    {
        var obj = _mapper.Map<Models.Shared.PersonnelStatus>(input);
        return await _personnelStatusManager.Create(obj);
    }

    /// <summary>
    /// 
    /// </summary>
    /// <param name="input"></param>
    /// <returns></returns>
    public async Task Update(UpdatePersonnelStatusInput input)
    {
        var obj = _mapper.Map<Models.Shared.PersonnelStatus>(input);
         await _personnelStatusManager.Update(obj);
    }

    /// <summary>
    /// 
    /// </summary>
    /// <param name="Id"></param>
    public async Task<bool> Delete(Guid id)
    {
      return await _personnelStatusManager.Delete(id);

    }
}