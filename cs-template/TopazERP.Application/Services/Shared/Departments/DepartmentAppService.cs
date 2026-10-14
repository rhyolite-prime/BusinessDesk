using AutoMapper;
using TopazERP.DomainServices.Shared.CostCenters;
using TopazERP.DomainServices.Shared.Departments;
using TopazERP.Models.Shared;
using TopazERP.Services.Shared.CostCenters.Dto;
using TopazERP.Services.Shared.Departments.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Shared.Departments
{
    public class DepartmentAppService: TopazERPAppServiceBase, IDepartmentAppService
    {
        private readonly IDepartmentManager _departmentManager;
        private readonly IMapper _mapper;

        public DepartmentAppService(IDepartmentManager departmentManager, IMapper mapper)
        {
            _departmentManager = departmentManager;
            _mapper = mapper;
        }

        public async Task<object> ListAll()
        {
            return await _departmentManager.ListAll();
        }

        public async Task<object> Create(CreateDepartmentInput input)
        {
            var obj = _mapper.Map<Department>(input);
            return await _departmentManager.Create(obj);
        }

        public async Task Update(UpdateDepartmentInput input)
        {
            var obj = _mapper.Map<Department>(input);
            await _departmentManager.Update(obj);
        }

        public async Task Delete(Guid Id)
        {
            await _departmentManager.Delete(Id);
        }
    }
}
