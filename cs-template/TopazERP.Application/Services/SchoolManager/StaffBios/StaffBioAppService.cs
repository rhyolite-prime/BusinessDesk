using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using AutoMapper;
using TopazERP.DomainServices.SchoolManger.StaffBios;
using TopazERP.Models.Sch;
using TopazERP.Services.SchoolManager.StaffBios.Dto;

namespace TopazERP.Services.SchoolManager.StaffBios
{
    public class StaffBioAppService : TopazERPAppServiceBase, IStaffBioAppService
    {
        private readonly IStaffBioManager _staffBioManager;
        private readonly IMapper _mapper;
        
        public StaffBioAppService(IStaffBioManager staffBioManager, IMapper mapper)
        {
            _staffBioManager = staffBioManager;
            _mapper = mapper;
        }

        public async Task<object> Create(CreateStaffBioInput input)
        {
            var entity = _mapper.Map<StaffBio>(input);
            return await _staffBioManager.Create(entity);
        }

        public async Task Update(UpdateStaffBioInput input)
        {
            var entity = _mapper.Map<StaffBio>(input);
            await _staffBioManager.Update(entity);
        }

        public async Task<IEnumerable<object>> ListAll()
        {
            return await _staffBioManager.ListAll();
        }

        public async Task Delete(Guid id)
        {
            await _staffBioManager.Delete(id);
        }
        public async Task<object> GetById(Guid id)
        {
            return await _staffBioManager.GetById(id);
           
        }
    }
}