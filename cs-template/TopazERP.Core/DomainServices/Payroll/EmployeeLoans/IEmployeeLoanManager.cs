using TopazERP.Models.Payroll;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TopazERP.DomainServices.Payroll.EmployeeLoans.Dto;

namespace TopazERP.DomainServices.Payroll.EmployeeLoans
{
   public interface IEmployeeLoanManager: Abp.Domain.Services.IDomainService
    {
        Task<object> ListAll();
        Task<object> GetPendingLoans();
        Task<object> GetLoanRepaymentSummary(Guid loanId);
        Task AmortizeLoan(LoanAmortizationDto dto);
        Task<object> GetOutStandingLoans();
        Task<object> GetApprovedLoans();
        Task<object> GetPastLoans();
        Task Approve(List<Guid> ids, string approvalType);
        Task<object> ListAll(Guid employeeId);
        Task Create(EmployeeLoan input);
        Task Update(EmployeeLoan input);
        Task<EmployeeLoan> GetAsync(Guid id);
        Task Delete(Guid Id);
    }
}
