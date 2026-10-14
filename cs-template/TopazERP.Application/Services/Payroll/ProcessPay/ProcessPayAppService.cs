using TopazERP.DomainServices.Payroll.ProcessPay;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TopazERP.Actors.MessageModels;

namespace TopazERP.Services.Payroll.ProcessPay
{
    public class ProcessPayAppService: TopazERPAppServiceBase, IProcessPayAppService
    {

        private readonly IProcessPayManager _processPayManager;

        public ProcessPayAppService(IProcessPayManager processPayManager)
        {
            _processPayManager = processPayManager;
        }

        public async Task PostPayroll()
        {
             await _processPayManager.PostPayroll();
        }

        public async Task<object> ProcessPayroll(Guid id)
        {
           return await _processPayManager.ProcessPayroll(id);
        }

        public async Task<object> Process13thMonth(Guid defaultStatusId,Guid earningTypeId)
        {
            return await _processPayManager.Process13thMonth(defaultStatusId,earningTypeId);
        }

        public async Task<object> GetSpecialEarningsPayrollResults()
        {
            return await _processPayManager.GetSpecialEarningsPayrollResults();
        }
        
        public async Task<object> GetSpecialEarningsPayrollResults(Guid employeeId)
        {
            return await _processPayManager.GetSpecialEarningsPayrollResults(employeeId);
        }
        
        public async Task<object> GetPayrollResults()
        {
            return await _processPayManager.GetPayrollResults();
        }

        public async Task<object> GetPayrollResults(Guid employeeId)
        {
            return await _processPayManager.GetPayrollResults(employeeId);
        }

        public async Task DispatchPayslips(PayslipDispatchDto dto)
        {
            await _processPayManager.DispatchPayslips(dto);
        }

        

    }
}
