using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Payroll.Reports
{
    public interface IPayrollReportsAppService : Abp.Application.Services.IApplicationService
    {
        Task<object> GetReportHeader(string title);
        Task<object> GetLoanDeductions();
        Task<object> GetLoanDeductions(Guid loanTypeId);
        Task<object> GetEmployeeLoans(DateTime startDate, DateTime endDate);
        Task<object> GetEmployeeLoans(Guid employeeId, DateTime startDate, DateTime endDate);
        Task<object> GetEmployeeLoans(DateTime startDate, DateTime endDate, Guid loanTypeId);
        
        Task<object> GetMonthlyLoanPayout(Guid loanTypeId);
        Task<object> GetOutstandingLoans();
        Task<object> GetOutstandingLoans(Guid employeeId, Guid loanTypeId);
        Task<object> GetAllowances();
        Task<object> GetAllowances(Guid allowanceTypeId);
        Task<object> GetPayRegister();
        Task<object> GetSalaryAdvance();
        Task<object> GetPaySlip(Guid employeeId, string payslipType);
        Task<object> GetDeductions();
        Task<object> GetDeductions(Guid deductionTypeId);
        Task<object> GetDaysWorked();
        Task<object> GetEmployeeList();
        Task<object> GetEmployeeSalaryInfo();
        Task<object> GetPensionScheme(string schemeType);
        Task<object> GetBankPayments();
        Task<object> GetBankPayments(Guid bankId);
        Task<object> GetCashPayments();
        Task<object> GetTaxReliefs();
        Task<object> GetPayeeReturns();
        Task<object> GetPensionSchemeDeductions();
        Task<object> GetProvidentFundContributions();
        Task<object> GetSecondProvidentFundContributions();

        // historical 
        Task<object> GetLoanDeductions(int month, int year);
        Task<object> GetLoanDeductions(int month, int year, Guid loanTypeId);
        Task<object> GetEmployeeLoans(int month, int year, DateTime startDate, DateTime endDate);
        Task<object> GetEmployeeLoans(int month, int year, DateTime startDate, DateTime endDate, Guid employeeId);
        Task<object> GetMonthlyLoanPayout(int month, int year, Guid loanTypeId);
        Task<object> GetOutstandingLoans(int month, int year);
        Task<object> GetOutstandingLoans(int month, int year, Guid employeeId, Guid loanTypeId);
        Task<object> GetAllowances(int month, int year);

        Task<object> GetAllowances(int month, int year, Guid allowanceTypeId);
        Task<object> GetPayRegister(int month, int year);
        Task<object> GetSalaryAdvance(int month, int year);
        Task<object> GetPaySlip(Guid employeeId, string payslipType, int month, int year);
        Task<object> GetDeductions(int month, int year);
        Task<object> GetDeductions(int month, int year, Guid deductionTypeId);
        Task<object> GetDaysWorked(int month, int year);
        Task<object> GetEmployeeList(int month, int year);
        Task<object> GetEmployeeSalaryInfo(int month, int year);
        Task<object> GetPensionScheme(string schemeType, int month, int year);
        Task<object> GetSecondPensionSchemeFirstTier(int month, int year);
        Task<object> GetBankPayments(int month, int year);
        Task<object> GetBankPayments(int month, int year, Guid bankId);
        Task<object> GetCashPayments(int month, int year);
        Task<object> GetTaxReliefs(int month, int year);

        Task<object> GetPayeeReturns(int month, int year);
        Task<object> GetPensionSchemeDeductions(int month, int year);
        Task<object> GetProvidentFundContributions(int month, int year);
        Task<object> GetSecondProvidentFundContributions(int month, int year);
    }
}
