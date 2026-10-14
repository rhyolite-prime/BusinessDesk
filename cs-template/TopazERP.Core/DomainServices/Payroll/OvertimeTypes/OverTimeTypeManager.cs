using Abp.Domain.Repositories;
using TopazERP.DomainServices.Payroll.DeductionTypes.Dto;
using TopazERP.DomainServices.Payroll.OvertimeTypes.Dto;
using TopazERP.Models.Payroll;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.Payroll.OvertimeTypes
{
   public class OverTimeTypeManager : Abp.Domain.Services.DomainService, IOverTimeTypeManager
    {
        private readonly IRepository<OvertimeType, Guid> _repositoryOverTimeType;

        public OverTimeTypeManager(IRepository<OvertimeType, Guid> repositoryOverTimeType)
        {
            _repositoryOverTimeType = repositoryOverTimeType;
        }

        public async Task<object> Create(OvertimeType entity)
        {
            var datta = await _repositoryOverTimeType.FirstOrDefaultAsync(x => x.Name.Trim().ToLower() == entity.Name.Trim().ToLower());

            if (datta == null)
            {
                await _repositoryOverTimeType.InsertAsync(entity);

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

        public async Task<object> CreateOvertimeRate(OvertimeRateInput input)
        {
            var overtimeTypeData = await _repositoryOverTimeType.GetAsync(input.OvertimeTypeId);
            var ratesList = overtimeTypeData.Rates;
            var rateInfo = ratesList.FirstOrDefault(x => x.Id == input.Id);

            if (rateInfo == null)
            {
                overtimeTypeData.Rates.Add(new OvertimeRate
                {
                    Id = input.Id,
                    Amount = input.Amount,
                    OvertimeTypeId = input.OvertimeTypeId,
                    EmployeeCategoryId = input.EmployeeCategoryId,
                    EmployeeCategoryName = input.EmployeeCategoryName,
                    FixedAmount = input.FixedAmount,
                    MaximumAmount = input.MaximumAmount,
                    PercentageBasic = input.PercentageBasic,
                    IsFactor = input.IsFactor,
                    AnnualHours = input.AnnualHours,
                    PercentageLimitOfBasic= input.PercentageLimitOfBasic,
                    Prorate = input.Prorate,

                });

                await _repositoryOverTimeType.UpdateAsync(overtimeTypeData);

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

        public async Task Update(OvertimeType entity)
        {
            await _repositoryOverTimeType.UpdateAsync(entity);
        }

        public async Task UpdateOvertimeRate(OvertimeRateInput input)
        {
            var overtimeTypeData = await _repositoryOverTimeType.GetAsync(input.OvertimeTypeId);
            var ratesList = overtimeTypeData.Rates;
            var rateInfo = ratesList.FirstOrDefault(x => x.Id == input.Id);

            ratesList.Remove(rateInfo);

            if (rateInfo != null)
            {
                rateInfo.Amount = input.Amount;
                rateInfo.OvertimeTypeId = input.OvertimeTypeId;
                rateInfo.EmployeeCategoryId = input.EmployeeCategoryId;
                rateInfo.EmployeeCategoryName = input.EmployeeCategoryName;
                rateInfo.FixedAmount = input.FixedAmount;
                rateInfo.MaximumAmount = input.MaximumAmount;
                rateInfo.PercentageBasic = input.PercentageBasic;
                rateInfo.Prorate = input.Prorate;
                rateInfo.Factor = input.Factor;
                rateInfo.AnnualHours = input.AnnualHours;
                rateInfo.PercentageLimitOfBasic = input.PercentageLimitOfBasic;
                
                ratesList.Add(rateInfo);

                overtimeTypeData.Rates = ratesList;

                await _repositoryOverTimeType.UpdateAsync(overtimeTypeData);
                
            }
            
        }


        public async Task<OvertimeType> GetAsync(Guid id)
        {
            return await _repositoryOverTimeType.FirstOrDefaultAsync(id);
        }

        public async Task<object> ListAll()
        {
            var data = await _repositoryOverTimeType.GetAllListAsync();
            return data.OrderBy(a => a.Name).ToList();

        }
        public async Task Delete(Guid id)
        {
            await _repositoryOverTimeType.DeleteAsync(id);

        }

        public async Task DeleteOvertimeRate(OvertimeRateInput input)
        {
            var overtimeTypeData = await _repositoryOverTimeType.GetAsync(input.OvertimeTypeId);
            var ratesList = overtimeTypeData.Rates;
            var rateInfo = ratesList.FirstOrDefault(x => x.Id == input.Id);
            ratesList.Remove(rateInfo);

            overtimeTypeData.Rates = ratesList;

            await _repositoryOverTimeType.UpdateAsync(overtimeTypeData);

        }
    }
}
