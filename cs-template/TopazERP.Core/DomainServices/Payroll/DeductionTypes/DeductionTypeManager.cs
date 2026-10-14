using Abp.Domain.Repositories;
using Castle.MicroKernel.Registration;
using TopazERP.DomainServices.Payroll.DeductionTypes.Dto;
using TopazERP.Models.Payroll;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TopazERP.DomainServices.Payroll.SetupIntegrityGuard;

namespace TopazERP.DomainServices.Payroll.DeductionTypes
{
   public class DeductionTypeManager: Abp.Domain.Services.DomainService, IDeductionTypeManager
    {
        private readonly IRepository<DeductionType, Guid> _repositoryDeductionType;
        private readonly IRepository<EmployeeSalaryInfo, Guid> _repositoryEmployeeSalaryInfo;
        private readonly IRepository<EmployeeCategory, Guid> _repositoryEmployeeCategory;
        private readonly ISetupIntegrityGuardManager _setupIntegrityGuardManager;

        public DeductionTypeManager(IRepository<DeductionType, Guid> repositoryDeductionType, IRepository<EmployeeSalaryInfo, Guid> repositoryEmployeeSalaryInfo, IRepository<EmployeeCategory, Guid> repositoryEmployeeCategory, ISetupIntegrityGuardManager setupIntegrityGuardManager)
        {
            _repositoryDeductionType = repositoryDeductionType;
            _repositoryEmployeeSalaryInfo = repositoryEmployeeSalaryInfo;
            _repositoryEmployeeCategory = repositoryEmployeeCategory;
            _setupIntegrityGuardManager = setupIntegrityGuardManager;
        }

        public async Task<object> Create(DeductionType entity)
        {
            var datta = await _repositoryDeductionType.FirstOrDefaultAsync(x => x.Name.Trim().ToLower() == entity.Name.Trim().ToLower());

            if (datta == null)
            {
                await _repositoryDeductionType.InsertAsync(entity);

                return new
                {
                    code = 200,
                    message = "successful"
                };
            }

            return new
            {
                code = 400,
                message = "Duplicate records are not allowed."
            };
        }

        public async Task<object> CreateDeductionRate(DeductionRateInput input)
        {
            var deductionTypeData = await _repositoryDeductionType.GetAsync(input.DeductionTypeId);
            var ratesList = deductionTypeData.Rates;
            var rateInfo = ratesList.FirstOrDefault(x => x.Id == input.Id);

            if (rateInfo == null)
            {
                
                var existingDeductionRate =
                    deductionTypeData.Rates.FirstOrDefault(x => x.DeductionTypeId == input.DeductionTypeId && x.EmployeeCategoryId == input.EmployeeCategoryId);

                if (existingDeductionRate != null)
                {
                    return new
                    {
                        code = 400,
                        message = "Duplicate records are not allowed."
                    };
                }
                
                //get category name...
                
                var employeeCategoryInfo = await _repositoryEmployeeCategory.FirstOrDefaultAsync(input.EmployeeCategoryId);
                
                deductionTypeData.Rates.Add(new DeductionRate
                {
                    Id = Guid.NewGuid(),
                    Amount = input.Amount,
                    DeductionTypeId = input.DeductionTypeId,
                    EmployeeCategoryId = input.EmployeeCategoryId,
                    EmployeeCategoryName = employeeCategoryInfo != null ? employeeCategoryInfo.Name : string.Empty,
                    DeductionTypeName = deductionTypeData.Name,
                    FixedAmount = input.FixedAmount,
                    MaximumAmount = input.MaximumAmount,
                    PercentageBasic = input.PercentageBasic,
                    Prorate = input.Prorate,
                });

                await _repositoryDeductionType.UpdateAsync(deductionTypeData);

                return new
                {
                    code = 200,
                    message = "successful"
                };
            }

            return new
            {
                code = 400,
                message = "Duplicate records are not allowed."
            };
        }

        public async Task Update(DeductionType entity)
        {
            await _repositoryDeductionType.UpdateAsync(entity);
        }


        public async Task UpdateDeductionRate(DeductionRateInput input)
        {
            var deductionTypeData = await _repositoryDeductionType.GetAsync(input.DeductionTypeId);
            var ratesList = deductionTypeData.Rates;
            var rateInfo = ratesList.FirstOrDefault(x => x.Id == input.Id);

            ratesList.Remove(rateInfo);

            if (rateInfo != null)
            {
                //get category name...
                
                var employeeCategoryInfo = await _repositoryEmployeeCategory.FirstOrDefaultAsync(input.EmployeeCategoryId);

                rateInfo.Amount = input.Amount;
                rateInfo.EmployeeCategoryId = input.EmployeeCategoryId;
                rateInfo.EmployeeCategoryName = employeeCategoryInfo != null ? employeeCategoryInfo.Name : string.Empty;
                rateInfo.FixedAmount = input.FixedAmount;
                rateInfo.MaximumAmount = input.MaximumAmount;
                rateInfo.PercentageBasic = input.PercentageBasic;
                rateInfo.DeductionTypeName = deductionTypeData.Name;
                rateInfo.Prorate = input.Prorate;
                ratesList.Add(rateInfo);
                
                deductionTypeData.Rates = ratesList;

                await _repositoryDeductionType.UpdateAsync(deductionTypeData);
            }

           
        }


        public async Task<object> GetAsync(Guid id)
        {
            return await _repositoryDeductionType.FirstOrDefaultAsync(id);
        }

        public async Task<DeductionType> GetAsync(string name)
        {
            return await _repositoryDeductionType.FirstOrDefaultAsync(x => x.Name.ToLower() == name.Trim().ToLower());
        }
        public async Task<object> ListAll()
        {
            var data = await _repositoryDeductionType.GetAllListAsync();

            return data.OrderBy(a=>a.Name).ToList();
        }

        public async Task<object> ListAll(Guid deductionTypeId, Guid employeeId, Guid categoryId)
        {

            List<DeductionRate> deductionRates = new List<DeductionRate>();

            var deductionTypes = await _repositoryDeductionType.GetAllListAsync();

            deductionTypes.ForEach((a) =>
            {
                deductionRates.AddRange(a.Rates);
            });

            var deductionRate = deductionRates.FirstOrDefault(o => categoryId != Guid.Empty && o.EmployeeCategoryId == categoryId && o.DeductionTypeId == deductionTypeId);

            var salaryInfo = await _repositoryEmployeeSalaryInfo.FirstOrDefaultAsync(a => a.EmployeeId == employeeId);

            if (deductionRate != null)
            {
                if (deductionRate.FixedAmount)
                {
                    deductionRate.Amount = deductionRate.Amount;
                    if (deductionRate.MaximumAmount != 0 && deductionRate.Amount > deductionRate.MaximumAmount)
                    {
                        deductionRate.Amount = deductionRate.MaximumAmount;
                    }
                }
                else if (!deductionRate.FixedAmount)
                {
                    deductionRate.Amount = (deductionRate.PercentageBasic * salaryInfo.MonthlySalary) / 100;
                    if (deductionRate.MaximumAmount != 0 && deductionRate.Amount > deductionRate.MaximumAmount)
                    {
                        deductionRate.Amount = deductionRate.MaximumAmount;
                    }
                }
            }

            return deductionRate;
        }

        public async Task<object> ListAll(Guid categoryId)
        {
            List<DeductionRate> deductionRates = new List<DeductionRate>();

            List<DeductionType> deductionTypes = new List<DeductionType>();

            var data = await _repositoryDeductionType.GetAllListAsync();

            data.ForEach((a) =>
            {
                deductionRates.AddRange(a.Rates);
            });

            var filteredDeductionRates = deductionRates.Where(o => categoryId != Guid.Empty && o.EmployeeCategoryId == categoryId).ToList();

            filteredDeductionRates.ForEach((a) =>
            {
                var deductionType = data.FirstOrDefault(x=> x.Id == a.DeductionTypeId);
                deductionTypes.Add(deductionType);

            });

            return deductionTypes.OrderBy(a=>a.Name).ToList();

        }

        public async Task<bool> Delete(Guid id)
        {
            var hasPassedIntegrity = await _setupIntegrityGuardManager.ValidateIntegrity(id, "DeductionType");
            
            if (hasPassedIntegrity)
            {
                await _repositoryDeductionType.DeleteAsync(id);
            }

            return hasPassedIntegrity;
        }

        public async Task DeleteDeductionRate(DeductionRateInput input)
        {
            var deductionTypeData = await _repositoryDeductionType.GetAsync(input.DeductionTypeId);
            var ratesList = deductionTypeData.Rates;
            var rateInfo = ratesList.FirstOrDefault(x => x.Id == input.Id);
            ratesList.Remove(rateInfo);

            deductionTypeData.Rates = ratesList;

            await _repositoryDeductionType.UpdateAsync(deductionTypeData);

        }
    }
}
