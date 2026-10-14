using AutoMapper;
using TopazERP.DomainServices.Payroll.EmployeeBioDatas;
using TopazERP.DomainServices.Payroll.EmployeeSalaryInfos;
using TopazERP.DomainServices.Payroll.EmployeeSalaryInfos.Dto;
using TopazERP.DomainServices.Shared.Banks;
using TopazERP.DomainServices.Shared.Currencies;
using TopazERP.Models.Payroll;
using TopazERP.Services.Payroll.EmployeeSalaryInfos.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using TopazERP.DomainServices.Payroll.SalaryGrades;

namespace TopazERP.Services.Payroll.EmployeeSalaryInfos
{
   public class EmployeeSalaryInfoAppService: TopazERPAppServiceBase, IEmployeeSalaryInfoAppService
    {
        private readonly IEmployeeSalaryInfoManager _employeeSalaryInfoManager;
        private readonly IEmployeeBioDataManager _employeeBioDataManager;
        private readonly ISalaryGradeManager _salaryGradeManager;
        
        private readonly IBankManager _bankManager;
        private readonly ICurrencyManager _currencyManager;
        private readonly IMapper _mapper;

        public EmployeeSalaryInfoAppService(IEmployeeSalaryInfoManager employeeSalaryInfoManager, IMapper mapper, IEmployeeBioDataManager employeeBioDataManager, IBankManager bankManager, ICurrencyManager currencyManager)
        {
            _employeeSalaryInfoManager = employeeSalaryInfoManager;
            _mapper = mapper;
            _employeeBioDataManager = employeeBioDataManager;
            _bankManager = bankManager;
            _currencyManager = currencyManager;
        }

        public async Task<object> ListAll()
        {
            return await _employeeSalaryInfoManager.ListAll();
        }

        public async Task<object> GetAllBySalaryType(string salaryType)
        {
            return await _employeeSalaryInfoManager.GetAllBySalaryType(salaryType);
        }

        public async Task<object> GetAllBySalaryType(string salaryType, Guid categoryId)
        {
            return await _employeeSalaryInfoManager.GetAllBySalaryType(salaryType, categoryId);
        }

        public async Task<object> GetAllBySalaryGrade(string salaryType, Guid salaryGradeId, Guid salaryNotchId)
        {
            return await _employeeSalaryInfoManager.GetAllBySalaryGrade(salaryType, salaryGradeId, salaryNotchId);

        }
        public async Task<object> GetAsync(Guid employeeId)
        {
            return await _employeeSalaryInfoManager.GetAsync(employeeId);
        }

        public async Task Create(CreateEmployeeSalaryInfoInput input)
        {
            var obj = _mapper.Map<EmployeeSalaryInfo>(input);
            await _employeeSalaryInfoManager.Create(obj);
        }


        public async Task Import(List<ImportEmployeeSalaryInfoInput> inputList)
        {

            foreach (var input in inputList)
            {
                var employee = await _employeeBioDataManager.GetAsync(input.EmployeeIdentifier);
                var bankInfo = await _bankManager.GetAsync(input.BankName);
                var currencyInfo = await _currencyManager.GetAsync(input.CurrencyName);
                var salaryGradeInfo = await _salaryGradeManager.GetAsync(input.SalaryGrade);

                var bankBranchId = Guid.Empty;
                var salaryNotchId = Guid.Empty;

                if (bankInfo != null)
                {
                    var branchList = bankInfo.BankBranches;

                    var bankBranchInfo  = branchList.FirstOrDefault(a=> a.Name == input.BankBranch);

                    if (bankBranchInfo != null)
                    {
                        bankBranchId = bankBranchInfo.Id;

                    }

                }


                if(salaryGradeInfo != null) 
                {

                    var salaryNotchList = salaryGradeInfo.SalaryNotches;

                    var salaryNotchInfo = salaryNotchList.FirstOrDefault(x=> x.SalaryGradeName == input.SalaryNotch);

                    if (salaryNotchInfo != null)
                    {

                        salaryNotchId = salaryNotchInfo.Id;
                    }

                }


                if (employee != null) 
                {
                    var employeeSalaryInfo = new CreateEmployeeSalaryInfoInput
                    {
                        EmployeeIdentifier = employee.EmployeeIdentifier,
                        EmployeeName = string.IsNullOrEmpty(employee.OtherName) ? $"{employee.LastName} {employee.FirstName}" : $"{employee.LastName} {employee.FirstName} {employee.OtherName}",
                        SalaryType = input.SalaryType,
                        EmployeeCategoryId = employee.CategoryId,
                        EmployeeId = employee.Id,
                        AccountNumber = input.AccountNumber,
                        BankBranchId = bankBranchId,
                        PayType = input.PayType,
                        MonthlySalary = input.MonthlySalary,
                        PreviousSalary = input.PreviousSalary,
                        BankId = bankInfo != null ? bankInfo.Id : Guid.Empty,
                        CurrencyId = currencyInfo != null ? currencyInfo.Id : Guid.Empty,
                        CurrencyName = currencyInfo != null ? currencyInfo.CurrencyName : string.Empty,
                        CurrentHourlyRate = input.CurrentHourlyRate,
                        DailyHours = input.DailyHours,
                        EmployeePhoto = string.Empty,
                        EmployeeSalaryGradeId = salaryGradeInfo != null ? salaryGradeInfo.Id : Guid.Empty,
                        EmployeeSalaryNotchId = salaryNotchId,
                        VacationDaysPaid = input.VacationDaysPaid,

                    };


                    var obj = _mapper.Map<EmployeeSalaryInfo>(employeeSalaryInfo);
                    await _employeeSalaryInfoManager.Create(obj);
                }

            }
        }
        public async Task ProcessSalaryIncrement(List<SalaryIncrement> salaryDataList)
        {
             await _employeeSalaryInfoManager.ProcessSalaryIncrement(salaryDataList);
        }

        public async Task Update(UpdateEmployeeSalaryInfoInput input)
        {
            var obj = _mapper.Map<EmployeeSalaryInfo>(input);
            await _employeeSalaryInfoManager.Update(obj);
        }

        public async Task Delete(Guid id)
        {
            await _employeeSalaryInfoManager.Delete(id);
        }

        /// <summary>
        /// Restore Employee Salary Data
        /// </summary>
        /// <param name="dto"></param>
        [HttpPost]
        public async Task Restore(EmployeeSalaryDataRestoreDto dto)
        {
            await _employeeSalaryInfoManager.Restore(dto.SalaryDataList, dto.TenantId);
        }
        
    }
}
