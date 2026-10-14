using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using AutoMapper;
using TopazERP.DomainServices.SchoolManger.StaffGrades;
using TopazERP.Models.Sch;
using TopazERP.Services.SchoolManager.StaffGrades.Dto;

namespace TopazERP.Services.SchoolManager.StaffGrades
{
    public class StaffGradeAppService : TopazERPAppServiceBase, IStaffGradeAppService
    {
        private readonly IStaffGradeManager _staffGradeManager;
        private readonly IMapper _mapper;
        
        public StaffGradeAppService(IStaffGradeManager staffGradeManager, IMapper mapper)
        {
            _staffGradeManager = staffGradeManager;
            _mapper = mapper;
        }

        public async Task<object> Create(CreateStaffGradeInput input)
        {
            var entity = _mapper.Map<StaffGrade>(input);
            return await _staffGradeManager.Create(entity);
        }

        public async Task Update(UpdateStaffGradeInput input)
        {
            var entity = _mapper.Map<StaffGrade>(input);
            await _staffGradeManager.Update(entity);
        }

        public async Task<IEnumerable<object>> ListAll()
        {
            return await _staffGradeManager.ListAll();
        }

        public async Task Delete(Guid id)
        {
            await _staffGradeManager.Delete(id);
        }
    }
}