using AutoMapper;
using TopazERP.DomainServices.Payroll.EmployeeCategories;
using TopazERP.Models.Payroll;
using TopazERP.Services.Payroll.EmployeeCategories.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Payroll.EmployeeCategories
{
   public class EmployeeCategoryAppService: TopazERPAppServiceBase, IEmployeeCategoryAppService
    {
        private readonly IEmployeeCategoryManager _employeeCategoryManager;
        private readonly IMapper _mapper;

        public EmployeeCategoryAppService(IEmployeeCategoryManager employeeCategoryManager, IMapper mapper)
        {
            _employeeCategoryManager = employeeCategoryManager;
            _mapper = mapper;
        }

        public async Task<object> ListAll()
        {
            return await _employeeCategoryManager.ListAll();
        }

        public async Task<object> Create(CreateEmployeeCategoryInput input)
        {
            var obj = _mapper.Map<EmployeeCategory>(input);
            return await _employeeCategoryManager.Create(obj);
        }

        public async Task Update(UpdateEmployeeCategoryInput input)
        {
            var obj = _mapper.Map<EmployeeCategory>(input);
            await _employeeCategoryManager.Update(obj);
        }

        public async Task<bool> Delete(Guid Id)
        {
           return await _employeeCategoryManager.Delete(Id);

        }
    }
}
