using System;
using System.Threading.Tasks;
using Abp.Domain.Repositories;
using Abp.Domain.Services;
using TopazERP.Models.Payroll;

namespace TopazERP.DomainServices.Payroll.SetupIntegrityGuard;

public class SetupIntegrityGuardManager: DomainService, ISetupIntegrityGuardManager
{
    
    private readonly IRepository<EmployeeLoan, Guid> _repositoryEmployeeLoan;
    private readonly IRepository<SalaryAdvanceApplication, Guid> _repositorySalaryAdvanceApplication;
    private readonly IRepository<MonthlySalaryAdvance, Guid> _repositoryMonthlySalaryAdvance;
    private readonly IRepository<MonthlySalaryAdvanceHist, Guid> _repositoryMonthlySalaryAdvanceHist;
    private readonly IRepository<LoanApplication, Guid> _repositoryLoanApplication;
    private readonly IRepository<EmployeeAllowance, Guid> _repositoryEmployeeAllowance;
    private readonly IRepository<MonthlyAllowance, Guid> _repositoryMonthlyAllowance;
    private readonly IRepository<MonthlyBenefitsInKind, Guid> _repositoryMonthlyBenefitsInKind;
    private readonly IRepository<MonthlyAllowanceHist, Guid> _repositoryMonthlyAllowanceHist;
    private readonly IRepository<MonthlyBenefitsInKindHist, Guid> _repositoryMonthlyBenefitsInKindHist;
    private readonly IRepository<BonusAndOnetimeAllowance, Guid> _repositoryBonusAndOnetimeAllowance;
    private readonly IRepository<EmployeeSalaryInfo, Guid> _repositoryEmployeeSalaryInfo;
    private readonly IRepository<EmployeeBioData, Guid> _repositoryEmployeeBioData;
    private readonly IRepository<EmployeeDeduction, Guid> _repositoryEmployeeDeduction;
    private readonly IRepository<EmployeeOnetimeDeduction, Guid> _repositoryEmployeeOnetimeDeduction;
    private readonly IRepository<MonthlyDeduction, Guid> _repositoryMonthlyDeduction;
    private readonly IRepository<MonthlyDeductionHist, Guid> _repositoryMonthlyDeductionHist;
    private readonly IRepository<EmployeeBenefitInKind, Guid> _repositoryEmployeeBenefitInKind;
    
    
    public SetupIntegrityGuardManager(IRepository<EmployeeAllowance, Guid> repositoryEmployeeAllowance, IRepository<EmployeeSalaryInfo, Guid> repositoryEmployeeSalaryInfo, IRepository<BonusAndOnetimeAllowance, Guid> repositoryBonusAndOnetimeAllowance, IRepository<MonthlyAllowance, Guid> repositoryMonthlyAllowance, IRepository<MonthlyAllowanceHist, Guid> repositoryMonthlyAllowanceHist, IRepository<EmployeeDeduction, Guid> repositoryEmployeeDeduction, IRepository<EmployeeOnetimeDeduction, Guid> repositoryEmployeeOnetimeDeduction, IRepository<MonthlyDeduction, Guid> repositoryMonthlyDeduction, IRepository<MonthlyDeductionHist, Guid> repositoryMonthlyDeductionHist, IRepository<EmployeeBenefitInKind, Guid> repositoryEmployeeBenefitInKind, IRepository<MonthlyBenefitsInKind, Guid> repositoryMonthlyBenefitsInKind, IRepository<MonthlyBenefitsInKindHist, Guid> repositoryMonthlyBenefitsInKindHist, IRepository<EmployeeBioData, Guid> repositoryEmployeeBioData, IRepository<EmployeeLoan, Guid> repositoryEmployeeLoan, IRepository<LoanApplication, Guid> repositoryLoanApplication, IRepository<SalaryAdvanceApplication, Guid> repositorySalaryAdvanceApplication, IRepository<MonthlySalaryAdvance, Guid> repositoryMonthlySalaryAdvance, IRepository<MonthlySalaryAdvanceHist, Guid> repositoryMonthlySalaryAdvanceHist)
    {
        _repositoryEmployeeAllowance = repositoryEmployeeAllowance;
        _repositoryEmployeeSalaryInfo = repositoryEmployeeSalaryInfo;
        _repositoryBonusAndOnetimeAllowance = repositoryBonusAndOnetimeAllowance;
        _repositoryMonthlyAllowance = repositoryMonthlyAllowance;
        _repositoryMonthlyAllowanceHist = repositoryMonthlyAllowanceHist;
        _repositoryEmployeeDeduction = repositoryEmployeeDeduction;
        _repositoryEmployeeOnetimeDeduction = repositoryEmployeeOnetimeDeduction;
        _repositoryMonthlyDeduction = repositoryMonthlyDeduction;
        _repositoryMonthlyDeductionHist = repositoryMonthlyDeductionHist;
        _repositoryEmployeeBenefitInKind = repositoryEmployeeBenefitInKind;
        _repositoryMonthlyBenefitsInKind = repositoryMonthlyBenefitsInKind;
        _repositoryMonthlyBenefitsInKindHist = repositoryMonthlyBenefitsInKindHist;
        _repositoryEmployeeBioData = repositoryEmployeeBioData;
        _repositoryEmployeeLoan = repositoryEmployeeLoan;
        _repositoryLoanApplication = repositoryLoanApplication;
        _repositorySalaryAdvanceApplication = repositorySalaryAdvanceApplication;
        _repositoryMonthlySalaryAdvance = repositoryMonthlySalaryAdvance;
        _repositoryMonthlySalaryAdvanceHist = repositoryMonthlySalaryAdvanceHist;
    }

    public async Task<bool> ValidateIntegrity(Guid id, string dataSource)
    {
        bool hasPassedIntegrityTest = false;
        
        switch (dataSource)
        {
            case "AllowanceType":
                hasPassedIntegrityTest = await CheckAllowanceTypeIntegrity(id);
                
                break;
            case "BikType":
                hasPassedIntegrityTest = await CheckBikTypeIntegrity(id);
                break;
            
            case "DeductionType":
                hasPassedIntegrityTest = await CheckDeductionTypeIntegrity(id);
                break;
            
            case "EmployeeCategory":
                hasPassedIntegrityTest = await CheckEmployeeCategoryIntegrity(id);
                break;
            
            case "EmployeeRank":
                hasPassedIntegrityTest = await CheckEmployeeRankIntegrity(id);
                break;
            
            case "LoanType":
                hasPassedIntegrityTest = await CheckLoanTypeIntegrity(id);
                break;
            
            case "SalaryGradeNotch":
                hasPassedIntegrityTest = await CheckSalaryGradeNotchIntegrity(id);
                break;
            
            case "PersonnelStatus":
                hasPassedIntegrityTest = await CheckPersonnelStatus(id);
                break;
            
        }
        
        return hasPassedIntegrityTest;
    }
    
    
    
    private async Task<bool> CheckSalaryGradeNotchIntegrity(Guid id)
    {
        var employeeBioDataInfo = await _repositoryEmployeeBioData.FirstOrDefaultAsync(x=> x.SalaryGradeId == id);
     
        if (employeeBioDataInfo == null)
        {
            return true;
        }
        
        return false; 
    }
    
    private async Task<bool> CheckLoanTypeIntegrity(Guid id)
    {
        var employeeBioDaEmployeeLoan = await _repositoryEmployeeLoan.FirstOrDefaultAsync(x=> x.LoanTypeId == id);
        
        var loanApplication = await _repositoryLoanApplication.FirstOrDefaultAsync(x=> x.LoanTypeId == id);
     
        var salaryAdvanceApplication = await _repositorySalaryAdvanceApplication.FirstOrDefaultAsync(x=> x.LoanTypeId == id);
        
        var monthlySalaryAdvance = await _repositoryMonthlySalaryAdvance.FirstOrDefaultAsync(x=> x.LoanTypeId == id);
        
        var monthlySalaryAdvanceHist = await _repositoryMonthlySalaryAdvanceHist.FirstOrDefaultAsync(x=> x.LoanTypeId == id);
        
        if (employeeBioDaEmployeeLoan == null && loanApplication == null && salaryAdvanceApplication == null && monthlySalaryAdvance == null && monthlySalaryAdvanceHist == null)
        {
            return true;
        }
        
        return false; 
    }
    
    
    private async Task<bool> CheckEmployeeRankIntegrity(Guid id)
    {
        var employeeBioDataInfo = await _repositoryEmployeeBioData.FirstOrDefaultAsync(x=> x.RankId == id);
     
        if (employeeBioDataInfo == null)
        {
            return true;
        }
        
        return false; 
    }
    private async Task<bool> CheckEmployeeCategoryIntegrity(Guid id)
    {
        
        var employeeSalaryInfo = await _repositoryEmployeeSalaryInfo.FirstOrDefaultAsync(x=> x.EmployeeCategoryId == id);
        
        var employeeBioDataInfo = await _repositoryEmployeeBioData.FirstOrDefaultAsync(x=> x.CategoryId == id);
     
        if (employeeSalaryInfo == null && employeeBioDataInfo == null)
        {
            return true;
        }
        
        return false; 
    }
    
    private async Task<bool> CheckAllowanceTypeIntegrity(Guid id)
    {
        
        var employeeAllowance = await _repositoryEmployeeAllowance.FirstOrDefaultAsync(x=> x.AllowanceTypeId == id);
        var bonusAndOnetimeAllowance = await _repositoryBonusAndOnetimeAllowance.FirstOrDefaultAsync(x=> x.AllowanceTypeId == id);
        var monthlyAllowanceInfo = await _repositoryMonthlyAllowance.FirstOrDefaultAsync(x=> x.AllowanceTypeId == id);
        var monthlyAllowanceHist = await _repositoryMonthlyAllowanceHist.FirstOrDefaultAsync(x=> x.AllowanceTypeId == id);
        
        if (employeeAllowance == null && bonusAndOnetimeAllowance == null && monthlyAllowanceInfo == null && monthlyAllowanceHist == null)
        {
            return true;
        }
        
        return false; 
    }
    
    
    private async Task<bool> CheckBikTypeIntegrity(Guid id)
    {
        
        var employeeBenefitInKindInfo = await _repositoryEmployeeBenefitInKind.FirstOrDefaultAsync(x=> x.BenefitInKindTypeId == id);
        var monthlyBenefitsInKindInfo = await _repositoryMonthlyBenefitsInKind.FirstOrDefaultAsync(x=> x.BenefitInKindTypeId == id);
        var monthlyBenefitsInKindHistInfo = await _repositoryMonthlyBenefitsInKindHist.FirstOrDefaultAsync(x=> x.BenefitInKindTypeId == id);
        
        if (employeeBenefitInKindInfo == null && monthlyBenefitsInKindInfo == null && monthlyBenefitsInKindHistInfo == null)
        {
            return true;
        }
        
        return false;

    }
    
    private async Task<bool> CheckDeductionTypeIntegrity(Guid id)
    {
        var employeeDeductionInfo = await _repositoryEmployeeDeduction.FirstOrDefaultAsync(x=> x.DeductionTypeId == id);
        var employeeOnetimeDeductionInfo = await _repositoryEmployeeOnetimeDeduction.FirstOrDefaultAsync(x=> x.DeductionTypeId == id);
        var monthlyDeductionInfo = await _repositoryMonthlyDeduction.FirstOrDefaultAsync(x=> x.DeductionTypeId == id);
        var monthlyDeductionHist = await _repositoryMonthlyDeductionHist.FirstOrDefaultAsync(x=> x.DeductionTypeId == id);
        
        if (employeeDeductionInfo == null && employeeOnetimeDeductionInfo == null && monthlyDeductionInfo == null && monthlyDeductionHist == null)
        {
            return true;
        }
        
        return false; 
    }
    
    
    private async Task<bool> CheckPersonnelStatus(Guid id)
    {
        var employeeBioDataInfo = await _repositoryEmployeeBioData.FirstOrDefaultAsync(x=> x.StatusId == id);
     
        if (employeeBioDataInfo == null)
        {
            return true;
        }
        
        return false; 
    }
    
}