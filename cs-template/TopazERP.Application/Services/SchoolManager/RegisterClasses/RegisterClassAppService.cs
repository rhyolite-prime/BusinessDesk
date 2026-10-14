using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using AutoMapper;
using TopazERP.DomainServices.SchoolManger.RegisterClasses;
using TopazERP.Models.Sch;
using TopazERP.Services.SchoolManager.RegisterClasses.Dto;

namespace TopazERP.Services.SchoolManager.RegisterClasses;

public class RegisterClassAppService: TopazERPAppServiceBase, IRegisterClassAppService
{
    private readonly IRegisterClassManager _registerClassManager;
    private readonly IMapper _mapper;

    public RegisterClassAppService(IRegisterClassManager registerClassManager, IMapper mapper)
    {
        _registerClassManager = registerClassManager;
        _mapper = mapper;
    }
    
    public async Task<object> Create(CreateRegisterClassInput input)
    {
        var entity = _mapper.Map<RegisteredClass>(input);
        return await _registerClassManager.Create(entity);
    }
    
    public async Task Update(UpdateRegisterClassInput input)
    {
        var entity = _mapper.Map<RegisteredClass>(input);
        await _registerClassManager.Update(entity);
    }
    public async Task Delete(Guid id)
    {
        await _registerClassManager.Delete(id);
    }
    public async Task<IEnumerable<object>> ListAll()
    {
        return await _registerClassManager.ListAll();
    }
    
}