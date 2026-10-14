using Abp.Domain.Repositories;
using TopazERP.DomainServices.Payroll.AllowanceTypes.Dto;
using TopazERP.DomainServices.Payroll.BikTypes.Dto;
using TopazERP.Models.Payroll;
using System;
using System.Collections.Generic;
using System.Dynamic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TopazERP.DomainServices.Payroll.SetupIntegrityGuard;

namespace TopazERP.DomainServices.Payroll.BikTypes
{
   public class BikTypeManager : Abp.Domain.Services.DomainService, IBikTypeManager
    {
        private readonly IRepository<BikType, Guid> _repositoryBikType;
        private readonly IRepository<AllowanceType, Guid> _repositoryAllowanceType;
        private readonly IRepository<EmployeeSalaryInfo, Guid> _repositoryEmployeeSalaryInfo;
        private readonly ISetupIntegrityGuardManager _setupIntegrityGuardManager;

        public BikTypeManager(IRepository<BikType, Guid> repositoryBikType, IRepository<AllowanceType, Guid> repositoryAllowanceType, IRepository<EmployeeSalaryInfo, Guid> repositoryEmployeeSalaryInfo, ISetupIntegrityGuardManager setupIntegrityGuardManager)
        {
            _repositoryBikType = repositoryBikType;
            _repositoryAllowanceType = repositoryAllowanceType;
            _repositoryEmployeeSalaryInfo = repositoryEmployeeSalaryInfo;
            _setupIntegrityGuardManager = setupIntegrityGuardManager;
        }

        public async Task<object> Create(BikType entity)
        {
            var datta = await _repositoryBikType.FirstOrDefaultAsync(x => x.Name.Trim().ToLower() == entity.Name.Trim().ToLower());

            if (datta == null)
            {
                await _repositoryBikType.InsertAsync(entity);

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

        public async Task<object> CreateBikRate(BikRateInput input)
        {
            var allowanceTypeData = await _repositoryAllowanceType.FirstOrDefaultAsync(input.AllowanceTypeId);

            var bikTypeData = await _repositoryBikType.GetAsync(input.BikTypeId);
            var ratesList = bikTypeData.BikRates;
            var rateInfo = ratesList.FirstOrDefault(x => x.Id == input.Id);

            if (rateInfo == null)
            {
                
                var existingBikRate =
                    bikTypeData.BikRates.FirstOrDefault(x => x.AllowanceTypeId == input.AllowanceTypeId && x.EmployeeCategoryId == input.EmployeeCategoryId);

                if (existingBikRate != null)
                {
                    return new
                    {
                        code = 400,
                        message = "Duplicate records are not allowed."
                    };
                }
                
                bikTypeData.BikRates.Add(new BikRate
                {
                    Id = input.Id,
                    BikTypeId = input.BikTypeId,  
                    AllowanceTypeName = allowanceTypeData.Name,
                    AllowanceTypeId = input.AllowanceTypeId,
                    Amount = input.Amount,
                    EmployeeCategoryId = input.EmployeeCategoryId,
                    EmployeeCategoryName = input.EmployeeCategoryName,
                    FixedAmount = input.FixedAmount,
                    MaximumAmount = input.MaximumAmount,
                    PercentageBasic = input.PercentageBasic,

                });

                await _repositoryBikType.UpdateAsync(bikTypeData);

                return new
                {
                    code = 200,
                    message = "successful"
                };
            }
            else
            {
                return new
                {
                    code = 400,
                    message = "Duplicate records are not allowed."
                };
            }
        }
       
        public async Task Update(BikType entity)
        {
            await _repositoryBikType.UpdateAsync(entity);
        }

        public async Task UpdateBikRate(BikRateInput input)
        {
            var allowanceTypeData = await _repositoryAllowanceType.GetAsync(input.AllowanceTypeId);

            var bikTypeData = await _repositoryBikType.GetAsync(input.BikTypeId);
            var ratesList = bikTypeData.BikRates;
            var rateInfo = ratesList.FirstOrDefault(x => x.Id == input.Id);
            ratesList.Remove(rateInfo);

            if (rateInfo != null)
            {
                rateInfo.AllowanceTypeName = allowanceTypeData.Name;
                rateInfo.AllowanceTypeId = input.AllowanceTypeId;
                rateInfo.Amount = input.Amount;
                rateInfo.EmployeeCategoryId = input.EmployeeCategoryId;
                rateInfo.EmployeeCategoryName = input.EmployeeCategoryName;
                rateInfo.FixedAmount = input.FixedAmount;
                rateInfo.MaximumAmount = input.MaximumAmount;
                rateInfo.PercentageBasic = input.PercentageBasic;

                ratesList.Add(rateInfo);
            }

            bikTypeData.BikRates = ratesList;

            await _repositoryBikType.UpdateAsync(bikTypeData);
        }

        public async Task<object> GetAsync(Guid id)
        {
            return await _repositoryBikType.FirstOrDefaultAsync(id);
        }

        public async Task<BikType> GetAsync(string name)
        {
            return await _repositoryBikType.FirstOrDefaultAsync(x=>x.Name.ToLower() == name.Trim().ToLower());
        }

        public async Task<object> ListAll()
        {
            var data = await _repositoryBikType.GetAllListAsync();

            return data.OrderBy(x => x.Name).ToList();

        }

        public async Task<object> ListAll(Guid bikTypeId, Guid employeeId, Guid categoryId)
        {
            var salaryInfo = await _repositoryEmployeeSalaryInfo.FirstOrDefaultAsync(a => a.EmployeeId == employeeId);

            List<BikRate> bikRates = new List<BikRate>();

            var data = await _repositoryBikType.GetAllListAsync();

            data.ForEach((a) =>
            {
                bikRates.AddRange(a.BikRates);
            });

            var bikRate = bikRates.FirstOrDefault(o => categoryId != Guid.Empty && o.EmployeeCategoryId == categoryId && o.BikTypeId == bikTypeId);

            if (bikRate != null)
            {
                if (bikRate.FixedAmount)
                {
                    bikRate.Amount = bikRate.Amount;
                    if (bikRate.MaximumAmount != 0 && bikRate.Amount > bikRate.MaximumAmount)
                    {
                        bikRate.Amount = bikRate.MaximumAmount;
                    }
                }
                else if (!bikRate.FixedAmount)
                {
                    bikRate.Amount = (bikRate.PercentageBasic * salaryInfo.MonthlySalary) / 100;
                    if (bikRate.MaximumAmount != 0 && bikRate.Amount > bikRate.MaximumAmount)
                    {
                        bikRate.Amount = bikRate.MaximumAmount;
                    }
                }
                return bikRate;

            }
            else
            {
                return new
                {
                    Amount = 0,

                };

            }



        }
        
        public async Task<bool> Delete(Guid id)
        {
            var hasPassedIntegrity = await _setupIntegrityGuardManager.ValidateIntegrity(id, "BikType");
            
            if (hasPassedIntegrity)
            {
                await _repositoryBikType.DeleteAsync(id);
            }

            return hasPassedIntegrity;

        }
        public async Task DeleteBikRate(BikRateInput input)
        {
            var bikTypeData = await _repositoryBikType.GetAsync(input.BikTypeId);
            var ratesList = bikTypeData.BikRates;
            var rateInfo = ratesList.FirstOrDefault(x => x.Id == input.Id);
            ratesList.Remove(rateInfo);

            bikTypeData.BikRates = ratesList;

            await _repositoryBikType.UpdateAsync(bikTypeData);

        }
    }
}
