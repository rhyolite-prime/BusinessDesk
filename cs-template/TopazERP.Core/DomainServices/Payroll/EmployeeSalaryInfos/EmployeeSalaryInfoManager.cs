using Abp.Domain.Entities;
using Abp.Domain.Repositories;
using TopazERP.DomainServices.Payroll.EmployeeSalaryInfos.Dto;
using TopazERP.Models.Payroll;
using TopazERP.Models.Shared;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Abp.Domain.Uow;
using Microsoft.EntityFrameworkCore;

namespace TopazERP.DomainServices.Payroll.EmployeeSalaryInfos
{
   public class EmployeeSalaryInfoManager: Abp.Domain.Services.DomainService, IEmployeeSalaryInfoManager
    {
        private readonly IRepository<EmployeeSalaryInfo, Guid> _repositoryEmployeeSalaryInfo;
        private readonly IRepository<Bank, Guid> _repositoryBank;
        private readonly IRepository<InitializePayMonth, Guid> _repositoryInitializePayMonth;
        private readonly IRepository<PayCalendar, Guid> _repositoryPayCalendar;
        private readonly IRepository<EmployeeDaysWorked, Guid> _repositoryEmployeeDaysWorked;
        private readonly IUnitOfWorkManager _unitOfWorkManager;
        
        private readonly IRepository<Models.Payroll.SalaryIncrementHistory, Guid> _repositorySalaryIncrementHistory;

        public EmployeeSalaryInfoManager(IRepository<EmployeeSalaryInfo, Guid> repositoryEmployeeSalaryInfo, IRepository<Models.Payroll.SalaryIncrementHistory, Guid> repositorySalaryIncrementHistory, IRepository<Bank, Guid> repositoryBank, IRepository<InitializePayMonth, Guid> repositoryInitializePayMonth, IRepository<PayCalendar, Guid> repositoryPayCalendar, IRepository<EmployeeDaysWorked, Guid> repositoryEmployeeDaysWorked, IUnitOfWorkManager unitOfWorkManager)
        {
            _repositoryEmployeeSalaryInfo = repositoryEmployeeSalaryInfo;
            _repositorySalaryIncrementHistory = repositorySalaryIncrementHistory;
            _repositoryBank = repositoryBank;
            _repositoryInitializePayMonth = repositoryInitializePayMonth;
            _repositoryPayCalendar = repositoryPayCalendar;
            _repositoryEmployeeDaysWorked = repositoryEmployeeDaysWorked;
            _unitOfWorkManager = unitOfWorkManager;
        }

        public async Task Create(EmployeeSalaryInfo entity)
        {
            var datta = await _repositoryEmployeeSalaryInfo.FirstOrDefaultAsync(x => x.EmployeeId == entity.EmployeeId);

            if (datta == null)
            {
                var bankInfo = await _repositoryBank.FirstOrDefaultAsync(entity.BankId);
                if (bankInfo != null)
                {
                    entity.BankName = bankInfo.Name;
                    var branchInfo = bankInfo.BankBranches.FirstOrDefault(x=>x.Id == entity.BankBranchId);

                    if (branchInfo != null)
                    {
                        entity.BankBranchName = branchInfo.Name;
                    }
                }

                await _repositoryEmployeeSalaryInfo.InsertAsync(entity);
            }
            else
            {
                datta.MonthlySalary = entity.MonthlySalary;
                datta.SalaryType = entity.SalaryType;
                datta.PayType = entity.PayType;
                datta.DailyHours = entity.DailyHours;
                datta.BankId = entity.BankId;
                datta.BankBranchId = entity.BankBranchId;
                datta.AccountNumber = entity.AccountNumber;
                datta.PreviousSalary = entity.PreviousSalary;
                datta.VacationDaysPaid = entity.VacationDaysPaid;
                datta.CurrentHourlyRate = entity.CurrentHourlyRate;
                datta.PaysGraduatedTax = entity.PaysGraduatedTax;
                datta.PaysWithHoldingTax = entity.PaysWithHoldingTax;
                datta.WithHoldingTaxRate = entity.WithHoldingTaxRate;
                
                
                var bankInfo = await _repositoryBank.FirstOrDefaultAsync(entity.BankId);
                if (bankInfo != null)
                {
                    entity.BankName = bankInfo.Name;
                    var branchInfo = bankInfo.BankBranches.FirstOrDefault(x=>x.Id == entity.BankBranchId);

                    if (branchInfo != null)
                    {
                        datta.BankBranchName = branchInfo.Name;
                    }
                }
                
                await _repositoryEmployeeSalaryInfo.UpdateAsync(datta);
            }
        }

        public async Task Update(EmployeeSalaryInfo entity)
        {
            await _repositoryEmployeeSalaryInfo.UpdateAsync(entity);
        }

        public async Task<object> GetAllBySalaryType(string salaryType)
        {

           return await _repositoryEmployeeSalaryInfo.GetAllListAsync(x=>x.SalaryType == salaryType);

        }

        public async Task<object> GetAllBySalaryType(string salaryType, Guid categoryId)
        {
            return await _repositoryEmployeeSalaryInfo.GetAllListAsync(x => x.SalaryType == salaryType && x.EmployeeCategoryId == categoryId);

        }

        public async Task<object> GetAllBySalaryGrade(string salaryType, Guid salaryGradeId, Guid salaryNotchId)
        {
            return await _repositoryEmployeeSalaryInfo.GetAllListAsync(x => x.SalaryType == salaryType && x.EmployeeSalaryGradeId == salaryGradeId && x.EmployeeSalaryNotchId == salaryNotchId);
        }

        public async Task<object> GetAsync(Guid employeeId)
        {
            decimal vacationDaysPaid = 0M;
            string vacationDaySource = string.Empty;

            var currentPayMonth = await _repositoryInitializePayMonth.GetAll().FirstOrDefaultAsync();
 

            if (employeeId != Guid.Empty)
            {
                var employeeSalaryInfo = await _repositoryEmployeeSalaryInfo.FirstOrDefaultAsync(x => x.EmployeeId == employeeId);

                if (employeeSalaryInfo != null)
                {
                    
                    if (employeeSalaryInfo.VacationDaysPaid > 0)
                    {
                        vacationDaysPaid = employeeSalaryInfo.VacationDaysPaid;
                        vacationDaySource = "Employee Salary Info";
                    }
                    else
                    {
                        if (currentPayMonth != null)
                        {

                            var employeeDaysWorked = await _repositoryEmployeeDaysWorked.FirstOrDefaultAsync(x => x.EmployeeId == employeeId && x.Year == currentPayMonth.Year && x.Month == currentPayMonth.Month);
                                
                            if (employeeDaysWorked != null)
                            {
                                vacationDaysPaid = employeeDaysWorked.Days;
                                vacationDaySource = "Employee Days Worked";
                            }
                            else
                            {
                                var payYear = await _repositoryPayCalendar.FirstOrDefaultAsync(x => x.Year == currentPayMonth.Year);

                                var payMonth = payYear.PayCalendarDetails.FirstOrDefault(x => x.Year == currentPayMonth.Year && x.Month == currentPayMonth.Month);
                           
                                if (payMonth is { Days: > 0 })
                                {
                                    vacationDaysPaid = payMonth.Days;
                                    vacationDaySource = "Employee Days Worked";
                                }
                            }
                        }
                        
                    }
                    
                    return new
                {
                    employeeSalaryInfo.Id,
                    employeeSalaryInfo.EmployeeId,
                    employeeSalaryInfo.EmployeeName,
                    employeeSalaryInfo.EmployeeIdentifier,
                    employeeSalaryInfo.MonthlySalary,
                    employeeSalaryInfo.PreviousSalary,
                    employeeSalaryInfo.SalaryType,
                    employeeSalaryInfo.EmployeeCategoryId,
                    employeeSalaryInfo.AccountNumber,
                    employeeSalaryInfo.BankId,
                    employeeSalaryInfo.BankName,
                    employeeSalaryInfo.BankBranchId,
                    employeeSalaryInfo.BankBranchName,
                    employeeSalaryInfo.PayType,
                    employeeSalaryInfo.DailyHours,
                    employeeSalaryInfo.CurrentHourlyRate,
                    employeeSalaryInfo.CurrencyId,
                    employeeSalaryInfo.CurrencyName,
                    employeeSalaryInfo.EmployeeSalaryGradeId,
                    employeeSalaryInfo.EmployeeSalaryNotchId,
                    employeeSalaryInfo.PaysGraduatedTax,
                    employeeSalaryInfo.PaysWithHoldingTax,
                    employeeSalaryInfo.WithHoldingTaxRate,
                    employeeSalaryInfo.EmployeePhoto,
                    employeeSalaryInfo.TenantId,
                    vacationDaysPaid,
                    vacationDaySource
                };
                }
            }

            return new { vacationDaysPaid , vacationDaySource, paysGraduatedTax = true, withHoldingTaxRate = false };
        }

        public async Task<object> ListAll()
        {
            var data = await _repositoryEmployeeSalaryInfo.GetAllListAsync();

            return data.OrderBy(a => a.EmployeeName);
        }
        
        public async Task Delete(Guid id)
        {
            await _repositoryEmployeeSalaryInfo.DeleteAsync(id);
        }

        public async Task ProcessSalaryIncrement(List<SalaryIncrement> salaryDataList)
        {
            foreach (var salaryData in salaryDataList)
            {
                var employeeSalaryInfo = await _repositoryEmployeeSalaryInfo.FirstOrDefaultAsync(x=>x.EmployeeId == salaryData.EmployeeId);

                employeeSalaryInfo.MonthlySalary = salaryData.MonthlySalary;
                employeeSalaryInfo.PreviousSalary= salaryData.PreviousSalary;

                await _repositoryEmployeeSalaryInfo.UpdateAsync(employeeSalaryInfo);

                var salaryIncrementHistory = new Models.Payroll.SalaryIncrementHistory
                {
                    EmployeeId = salaryData.EmployeeId,
                    EmployeeIdentifier= employeeSalaryInfo.EmployeeIdentifier,
                    EmployeeName= employeeSalaryInfo.EmployeeName,
                    CurrentSalary = salaryData.MonthlySalary,
                    PreviousSalary = salaryData.PreviousSalary,
                    IncrementAmount = salaryData.IncrementAmount,
                };

                await _repositorySalaryIncrementHistory.InsertAsync(salaryIncrementHistory);


            }

        }

        public async Task Restore(List<EmployeeSalaryInfo> salaryDataList, int tenantId)
        {
            using (_unitOfWorkManager.Current.SetTenantId(tenantId))
            {
                foreach (var employeeSalaryInfo in salaryDataList)
                {
                    await _repositoryEmployeeSalaryInfo.InsertAsync(employeeSalaryInfo);
                }
                
            }

        }
        
    }
}
