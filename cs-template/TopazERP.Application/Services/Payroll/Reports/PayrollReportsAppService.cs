using TopazERP.DomainServices.Payroll.Reports;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Payroll.Reports
{
    public class PayrollReportsAppService : TopazERPAppServiceBase, IPayrollReportsAppService
    {

        private readonly IReportManager _reportManager;

        public PayrollReportsAppService(IReportManager reportManager)
        {
            _reportManager = reportManager;
        }

        public async Task<object> GetReportHeader(string title)
        {
            return await _reportManager.GetReportHeader(title);
        }

        public async Task<object> GetLoanDeductions()
        {
            return await _reportManager.GetLoanDeductions();
        }

        public async Task<object> GetLoanDeductions(Guid loanTypeId)
        {
            return await _reportManager.GetLoanDeductions(loanTypeId);
        }

        public async Task<object> GetEmployeeLoans(DateTime startDate, DateTime endDate)
        {
            return await _reportManager.GetEmployeeLoans(startDate, endDate);
        }

        public async Task<object> GetEmployeeLoans(Guid employeeId, DateTime startDate, DateTime endDate)
        {
            return await _reportManager.GetEmployeeLoans(employeeId, startDate, endDate);

        }
        public async Task<object> GetEmployeeLoans(DateTime startDate, DateTime endDate, Guid loanTypeId)
        {
            return await _reportManager.GetEmployeeLoans(startDate, endDate, loanTypeId);

        }

        public async Task<object> GetMonthlyLoanPayout(Guid loanTypeId)
        {
            return await _reportManager.GetMonthlyLoanPayout(loanTypeId);
        }

        public async Task<object> GetOutstandingLoans()
        {
            return await _reportManager.GetOutstandingLoans();
        }

        public async Task<object> GetOutstandingLoans(Guid employeeId, Guid loanTypeId)
        {
            return await _reportManager.GetOutstandingLoans(employeeId, loanTypeId);
        }

        public async Task<object> GetAllowances()
        {
            return await _reportManager.GetAllowances();
        }


        public async Task<object> GetAllowances(Guid allowanceTypeId)
        {
            return await _reportManager.GetAllowances(allowanceTypeId);
        }

        public async Task<object> GetPayRegister()
        {
            return await _reportManager.GetPayRegister();
        }

        public async Task<object> GetSalaryAdvance()
        {
            return await _reportManager.GetSalaryAdvance();
        }


        public async Task<object> GetPaySlip(Guid employeeId, string payslipType)
        {
            return await _reportManager.GetPaySlip(employeeId, payslipType);
        }


        public async Task<object> GetDeductions()
        {
            return await _reportManager.GetDeductions();
        }


        public async Task<object> GetDeductions(Guid deductionTypeId)
        {
            return await _reportManager.GetDeductions(deductionTypeId);
        }

        public async Task<object> GetDaysWorked()
        {
            return await _reportManager.GetDaysWorked();
        }

        public async Task<object> GetEmployeeList()
        {
            return await _reportManager.GetEmployeeList();
        }

        public async Task<object> GetEmployeeSalaryInfo()
        {
            return await _reportManager.GetEmployeeSalaryInfo();
        }

        public async Task<object> GetPensionScheme(string schemeType)
        {
            return await _reportManager.GetPensionScheme(schemeType);
        }

        public async Task<object> GetBankPayments()
        {
            return await _reportManager.GetBankPayments();
        }

        public async Task<object> GetBankPayments(Guid bankId)
        {
            return await _reportManager.GetBankPayments(bankId);
        }

        public async Task<object> GetCashPayments()
        {
            return await _reportManager.GetCashPayments();
        }

        public async Task<object> GetTaxReliefs()
        {
            return await _reportManager.GetTaxReliefs();
        }

        public async Task<object> GetPayeeReturns()
        {
            return await _reportManager.GetPayeeReturns();
        }

        public async Task<object> GetPensionSchemeDeductions()
        {
            return await _reportManager.GetPensionSchemeDeductions();
        }

        public async Task<object> GetProvidentFundContributions()
        {
            return await _reportManager.GetProvidentFundContributions();
        }

        public async Task<object> GetSecondProvidentFundContributions()
        {
            return await _reportManager.GetSecondProvidentFundContributions();
        }

        //historical
        public async Task<object> GetAllowances(int month, int year)
        {
            return await _reportManager.GetAllowances(month, year);
        }

        public async Task<object> GetLoanDeductions(int month, int year)
        {
            return await _reportManager.GetLoanDeductions(month, year);
        }

        public async Task<object> GetLoanDeductions(int month, int year, Guid loanTypeId)
        {
            return await _reportManager.GetLoanDeductions(month, year, loanTypeId);
        }

        public async Task<object> GetEmployeeLoans(int month, int year, DateTime startDate, DateTime endDate)
        {
            return await _reportManager.GetEmployeeLoans(month, year, startDate, endDate);
        }


        public async Task<object> GetEmployeeLoans(int month, int year, DateTime startDate, DateTime endDate, Guid employeeId)
        {
            return await _reportManager.GetEmployeeLoans(month, year, startDate, endDate, employeeId);

        }

        public async Task<object> GetMonthlyLoanPayout(int month, int year, Guid loanTypeId)
        {
            return await _reportManager.GetMonthlyLoanPayout(month, year, loanTypeId);
        }

        public async Task<object> GetOutstandingLoans(int month, int year)
        {
            return await _reportManager.GetOutstandingLoans(month, year);
        }

        public async Task<object> GetOutstandingLoans(int month, int year, Guid employeeId, Guid loanTypeId)
        {
            return await _reportManager.GetOutstandingLoans(month, year, employeeId, loanTypeId);
        }


        public async Task<object> GetAllowances(int month, int year, Guid allowanceTypeId)
        {
            return await _reportManager.GetAllowances(month, year, allowanceTypeId);
        }

        public async Task<object> GetPayRegister(int month, int year)
        {
            return await _reportManager.GetPayRegister(month, year);
        }

        public async Task<object> GetSalaryAdvance(int month, int year)
        {
            return await _reportManager.GetSalaryAdvance(month, year);
        }


        public async Task<object> GetPaySlip(Guid employeeId, string payslipType, int month, int year)
        {
            return await _reportManager.GetPaySlip(employeeId, payslipType, month, year);
        }


        public async Task<object> GetDeductions(int month, int year)
        {
            return await _reportManager.GetDeductions(month, year);
        }

        public async Task<object> GetDeductions(int month, int year, Guid deductionTypeId)
        {
            return await _reportManager.GetDeductions(month, year, deductionTypeId);
        }

        public async Task<object> GetDaysWorked(int month, int year)
        {
            return await _reportManager.GetDaysWorked(month, year);
        }

        public async Task<object> GetEmployeeList(int month, int year)
        {
            return await _reportManager.GetEmployeeList(month, year);
        }

        public async Task<object> GetEmployeeSalaryInfo(int month, int year)
        {
            return await _reportManager.GetEmployeeSalaryInfo(month, year);
        }

        public async Task<object> GetPensionScheme(string schemeType, int month, int year)
        {
            return await _reportManager.GetPensionScheme(schemeType, month, year);
        }

        public async Task<object> GetSecondPensionSchemeFirstTier(int month, int year)
        {
            return await _reportManager.GetSecondPensionSchemeFirstTier(month, year);
        }

        public async Task<object> GetBankPayments(int month, int year)
        {
            return await _reportManager.GetBankPayments(month, year);
        }

        public async Task<object> GetBankPayments(int month, int year, Guid bankId)
        {
            return await _reportManager.GetBankPayments(month, year, bankId);
        }

        public async Task<object> GetCashPayments(int month, int year)
        {
            return await _reportManager.GetCashPayments(month, year);
        }

        public async Task<object> GetTaxReliefs(int month, int year)
        {
            return await _reportManager.GetTaxReliefs(month, year);
        }

        public async Task<object> GetPayeeReturns(int month, int year)
        {
            return await _reportManager.GetPayeeReturns(month, year);
        }

        public async Task<object> GetPensionSchemeDeductions(int month, int year)
        {
            return await _reportManager.GetPensionSchemeDeductions(month, year);
        }

        public async Task<object> GetProvidentFundContributions(int month, int year)
        {
            return await _reportManager.GetProvidentFundContributions(month, year);
        }

        public async Task<object> GetSecondProvidentFundContributions(int month, int year)
        {
            return await _reportManager.GetSecondProvidentFundContributions(month, year);
        }
    }
}
