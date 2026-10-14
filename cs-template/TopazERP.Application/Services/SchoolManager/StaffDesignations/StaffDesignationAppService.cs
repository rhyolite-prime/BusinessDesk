using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using AutoMapper;
using TopazERP.DomainServices.SchoolManger.StaffDesignations;
using TopazERP.Models.Sch;
using TopazERP.Services.SchoolManager.StaffDesignations.Dto;

namespace TopazERP.Services.SchoolManager.StaffDesignations
{
    public class StaffDesignationAppService : TopazERPAppServiceBase, IStaffDesignationAppService
    {
        private readonly IStaffDesignationManager _staffDesignationManager;
        private readonly IMapper _mapper;


        public StaffDesignationAppService(IStaffDesignationManager staffDesignationManager, IMapper mapper)
        {
            _staffDesignationManager = staffDesignationManager;
            _mapper = mapper;
        }

        public async Task<object> Create(CreateStaffDesignationInput input)
        {
            var entity = _mapper.Map<StaffDesignation>(input);
            return await _staffDesignationManager.Create(entity);
        }

        public async Task Update(UpdateStaffDesignationInput input)
        {
            var entity = _mapper.Map<StaffDesignation>(input);
            await _staffDesignationManager.Update(entity);
        }

        public async Task<IEnumerable<object>> ListAll()
        {
            return await _staffDesignationManager.ListAll();
        }

        public async Task Delete(Guid id)
        {
            await _staffDesignationManager.Delete(id);
        }
    }
}