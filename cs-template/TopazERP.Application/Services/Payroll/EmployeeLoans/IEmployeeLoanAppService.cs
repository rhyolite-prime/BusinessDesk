using TopazERP.Services.Payroll.EmployeeLoans.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TopazERP.DomainServices.Payroll.EmployeeLoans.Dto;
using TopazERP.Models.Payroll;

namespace TopazERP.Services.Payroll.EmployeeLoans
{
   public interface IEmployeeLoanAppService: Abp.Application.Services.IApplicationService
    {
        Task<object> ListAll();
        Task<EmployeeLoan> GetAsync(Guid id);
        Task AmortizeLoan(LoanAmortizationDto dto);
        Task<object> GetLoanRepaymentSummary(Guid loanId);
        Task Create(CreateEmployeeLoanInput input);
        Task Update(UpdateEmployeeLoanInput input);
        Task Import(List<ImportEmployeeLoanInput> inputList);
        Task Delete(Guid Id); 
        Task Approve(List<Guid> ids, string approvalType);
        Task<object> ListOutStandingLoans();
        Task<object> ListApprovedLoans();
        Task<object> ListPendingLoans();
        Task<object> ListPastLoans();
    }
}
