using AutoMapper;
using TopazERP.DomainServices.Payroll.EmployeeSalaryAdvances;
using TopazERP.Models.Payroll;
using TopazERP.Services.Payroll.EmployeeSalaryAdvances.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Payroll.EmployeeSalaryAdvances
{
   public class EmployeeSalaryAdvanceAppService: TopazERPAppServiceBase, IEmployeeSalaryAdvanceAppService
    {
        private readonly IEmployeeSalaryAdvanceManager _employeeSalaryAdvanceManager;
        private readonly IMapper _mapper;

        /// <summary>
        /// 
        /// </summary>
        /// <param name="employeeSalaryAdvanceManager"></param>
        /// <param name="mapper"></param>
        public EmployeeSalaryAdvanceAppService(IEmployeeSalaryAdvanceManager employeeSalaryAdvanceManager, IMapper mapper)
        {
            _employeeSalaryAdvanceManager = employeeSalaryAdvanceManager;
            _mapper = mapper;
        }

        /// <summary>
        /// 
        /// </summary>
        /// <returns></returns>
        public async Task<object> ListAll()
        {
            return await _employeeSalaryAdvanceManager.ListAll();
        }

        /// <summary>
        /// 
        /// </summary>
        /// <param name="employeeId"></param>
        /// <returns></returns>
        public async Task<object> ListAll(Guid employeeId)
        {
            return await _employeeSalaryAdvanceManager.ListAll(employeeId);
        }

        /// <summary>
        /// 
        /// </summary>
        /// <returns></returns>
        public async Task<object> ListPendingSalaryAdvance()
        {
            return await _employeeSalaryAdvanceManager.ListPendingSalaryAdvance();
        }
        
        /// <summary>
        /// 
        /// </summary>
        /// <param name="id"></param>
        /// <returns></returns>
        public async Task<object> GetAsync(Guid id)
        {
            return await _employeeSalaryAdvanceManager.GetAsync(id);
        }

        /// <summary>
        /// 
        /// </summary>
        /// <param name="ids"></param>
        /// <param name="approvalType"></param>
        public async Task Approve(List<Guid> ids, string approvalType)
        {
            await _employeeSalaryAdvanceManager.Approve(ids, approvalType);
        }

        /// <summary>
        /// 
        /// </summary>
        /// <param name="input"></param>
        public async Task Create(CreateEmployeeSalaryAdvanceInput input)
        {
            var obj = _mapper.Map<EmployeeSalaryAdvance>(input);
            await _employeeSalaryAdvanceManager.Create(obj);
        }

        
        /// <summary>
        /// 
        /// </summary>
        /// <param name="input"></param>
        public async Task Update(UpdateEmployeeSalaryAdvanceInput input)
        {
            var obj = _mapper.Map<EmployeeSalaryAdvance>(input);
            await _employeeSalaryAdvanceManager.Update(obj);
        }
        
        /// <summary>
        /// 
        /// </summary>
        /// <param name="id"></param>
        public async Task Delete(Guid id)
        {
            await _employeeSalaryAdvanceManager.Delete(id);

        }
    }
}
