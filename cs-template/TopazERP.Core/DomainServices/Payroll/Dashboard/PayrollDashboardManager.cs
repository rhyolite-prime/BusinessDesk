using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Abp.Domain.Repositories;
using TopazERP.Models.Payroll;

namespace TopazERP.DomainServices.Payroll.Dashboard;

public class PayrollDashboardManager: Abp.Domain.Services.DomainService, IPayrollDashboardManager
{
    
    private readonly IRepository<EmployeeBioData, Guid> _repositoryEmployeeBioData;
    private readonly IRepository<EmployeeLoan, Guid> _repositoryEmployeeLoan;
    private readonly IRepository<EmployeeLoanRepaymentSchedule, Guid> _repositoryEmployeeLoanRepaymentSchedule;

    public PayrollDashboardManager(IRepository<EmployeeBioData, Guid> repositoryEmployeeBioData, IRepository<EmployeeLoan, Guid> repositoryEmployeeLoan, IRepository<EmployeeLoanRepaymentSchedule, Guid> repositoryEmployeeLoanRepaymentSchedule)
    {
        _repositoryEmployeeBioData = repositoryEmployeeBioData;
        _repositoryEmployeeLoan = repositoryEmployeeLoan;
        _repositoryEmployeeLoanRepaymentSchedule = repositoryEmployeeLoanRepaymentSchedule;
    }

    public async Task<Dictionary<string, object>> GetEmployeeGenderDistribution()
    {
        var employees = await _repositoryEmployeeBioData.GetAllListAsync();
        
        Dictionary<string, object> keyValuePairs = new Dictionary<string, object>();
        
        int males = employees.Count(a => a.Gender == "Male");
        int females = employees.Count(a => a.Gender == "Female");
        int totalPopulation = employees.Count;

        string maleLabel = $"{Math.Round(totalPopulation != 0 ? ((decimal)males / totalPopulation) * 100 : 0, 2)}% Males";
        string femaleLabel = $"{Math.Round(totalPopulation != 0 ? ((decimal)females / totalPopulation) * 100 : 0, 2)}% Females";

        keyValuePairs.Add("maleInfo", new { label = maleLabel, nos = males });
        keyValuePairs.Add("femaleInfo", new { label = femaleLabel, nos = females });
        
        return keyValuePairs;
    }

    public async Task<object> GetEmployeeCategoryDistribution()
    {
        var employees = await _repositoryEmployeeBioData.GetAllListAsync(x=> !string.IsNullOrEmpty(x.CategoryName) );
        
        var queryResults = (from u1 in employees
                                                        group u1 by u1.CategoryName into groupedData
                                                        select new
                                                        {
                                                            CategoryName = groupedData.Key,
                                                            EmployeeCount = groupedData.Count()
                                                        }).ToList();

        return queryResults;

    }

    public async Task<object> GetLoanDistribution()
    {
        var loans = await _repositoryEmployeeLoan.GetAllListAsync(x=> x.IsApproved);
        
        var queryResults = (from u1 in loans
            group u1 by u1.LoanTypeName into groupedData
            select new
            {
                LoanTypeName = groupedData.Key,
                TotalLoanAmount = groupedData.Sum(a=> a.Amount),
                
            }).ToList();

        return queryResults;


    }
    
    public async Task<object> GetLoanPaymentDistribution()
    {
        var paidLoans = await _repositoryEmployeeLoanRepaymentSchedule.GetAllListAsync(a=> a.IsPaid);
        
        var queryResults = (from u1 in paidLoans
            group u1 by u1.EmployeeLoanName into groupedData
            select new 
            {
                LoanTypeName = groupedData.Key,
                AmountPaid = groupedData.Sum(a=> a.MonthlyPayment),
                
            }).ToList();

        return queryResults;


    }
    
}