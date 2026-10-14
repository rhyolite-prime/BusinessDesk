using AutoMapper;
using TopazERP.DomainServices.Payroll.SalaryGrades;
using TopazERP.DomainServices.Payroll.SalaryGrades.Dto;
using TopazERP.Models.Payroll;
using TopazERP.Services.Payroll.SalaryGrades.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Payroll.SalaryGrades
{
   public class SalaryGradeAppService: TopazERPAppServiceBase, ISalaryGradeAppService
    {
        private readonly ISalaryGradeManager _salaryGradeManager;
        private readonly IMapper _mapper;

        public SalaryGradeAppService(ISalaryGradeManager salaryGradeManager, IMapper mapper)
        {
            _salaryGradeManager = salaryGradeManager;
            _mapper = mapper;
        }

        public async Task<object> ListAll()
        {
            return await _salaryGradeManager.ListAll();
        }

        public async Task<object> Create(CreateSalaryGradeInput input)
        {
            var obj = _mapper.Map<SalaryGrade>(input);
            return await _salaryGradeManager.Create(obj);
        }

        public async Task<object> CreateSalaryNotch(SalaryNotchInput input)
        {
            return await _salaryGradeManager.CreateSalaryNotch(input);
        }

        public async Task Update(UpdateSalaryGradeInput input)
        {
            var obj = _mapper.Map<SalaryGrade>(input);
            await _salaryGradeManager.Update(obj);
        }

        public async Task UpdateSalaryNotch(SalaryNotchInput input)
        {
            await _salaryGradeManager.UpdateSalaryNotch(input);
        }
        public async Task<bool> Delete(Guid Id)
        {
           return await _salaryGradeManager.Delete(Id);

        }

        public async Task DeleteSalaryNotch(SalaryNotchInput input)
        {
            await _salaryGradeManager.DeleteSalaryNotch(input);
        }
    }
}
