using Abp.Domain.Repositories;
using TopazERP.DomainServices.Payroll.SalaryGrades.Dto;
using TopazERP.Models.Payroll;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TopazERP.DomainServices.Payroll.SetupIntegrityGuard;

namespace TopazERP.DomainServices.Payroll.SalaryGrades
{
   public class SalaryGradeManager : Abp.Domain.Services.DomainService, ISalaryGradeManager
    {
        private readonly IRepository<SalaryGrade, Guid> _repositorySalaryGrade;
        private readonly ISetupIntegrityGuardManager _setupIntegrityGuardManager;

        public SalaryGradeManager(IRepository<SalaryGrade, Guid> repositorySalaryGrade, ISetupIntegrityGuardManager setupIntegrityGuardManager)
        {
            _repositorySalaryGrade = repositorySalaryGrade;
            _setupIntegrityGuardManager = setupIntegrityGuardManager;
        }

        public async Task<object> Create(SalaryGrade entity)
        {
            var datta = await _repositorySalaryGrade.FirstOrDefaultAsync(x => x.Name.Trim().ToLower() == entity.Name.Trim().ToLower());

            if (datta == null)
            {
                await _repositorySalaryGrade.InsertAsync(entity);

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

        public async Task<object> CreateSalaryNotch(SalaryNotchInput input)
        {
            var salaryGradeData = await _repositorySalaryGrade.GetAsync(input.SalaryGradeId);
            var notchList = salaryGradeData.SalaryNotches;
            var notchInfo = notchList.FirstOrDefault(x => x.Id == input.Id);

            if (notchInfo == null)
            {
                salaryGradeData.SalaryNotches.Add(new SalaryNotch
                {
                    Id = Guid.NewGuid(),
                    SalaryGradeId = input.SalaryGradeId,
                    SalaryGradeName = salaryGradeData.Name,
                    Notch = input.Notch,
                    Salary = input.Salary,

                });

                await _repositorySalaryGrade.UpdateAsync(salaryGradeData);

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
        public async Task Update(SalaryGrade entity)
        {
            await _repositorySalaryGrade.UpdateAsync(entity);
        }

        public async Task UpdateSalaryNotch(SalaryNotchInput input)
        {
            var salaryGradeData = await _repositorySalaryGrade.GetAsync(input.SalaryGradeId);
            var notchList = salaryGradeData.SalaryNotches;
            var notchInfo = notchList.FirstOrDefault(x => x.Id == input.Id);

            notchList.Remove(notchInfo);

            if (notchInfo != null)
            {
                notchInfo.SalaryGradeName = salaryGradeData.Name;
                notchInfo.Notch = input.Notch;
                notchInfo.Salary = input.Salary;
                notchInfo.NumericalOrder = input.NumericalOrder;

                notchList.Add(notchInfo);
            }

            salaryGradeData.SalaryNotches = notchList;

            await _repositorySalaryGrade.UpdateAsync(salaryGradeData);
        }
        public async Task<object> GetAsync(Guid id)
        {
            return await _repositorySalaryGrade.FirstOrDefaultAsync(id);
        }

        public async Task<SalaryGrade> GetAsync(string name)
        {
            return await _repositorySalaryGrade.FirstOrDefaultAsync(x=> x.Name == name);
        }

        public async Task<object> ListAll()
        {
            var data = await _repositorySalaryGrade.GetAllListAsync();

            return data.OrderBy(a => a.Name).ToList();

        }

        public async Task<bool> Delete(Guid id)
        {
            var hasPassedIntegrity = await _setupIntegrityGuardManager.ValidateIntegrity(id, "SalaryGradeNotch");
            
            if (hasPassedIntegrity)
            {
                await _repositorySalaryGrade.DeleteAsync(id);
            }

            return hasPassedIntegrity;

        }

        public async Task DeleteSalaryNotch(SalaryNotchInput input)
        {
            var salaryGradeData = await _repositorySalaryGrade.GetAsync(input.SalaryGradeId);
            var notchList = salaryGradeData.SalaryNotches;
            var notchInfo = notchList.FirstOrDefault(x => x.Id == input.Id);

            notchList.Remove(notchInfo);

            salaryGradeData.SalaryNotches = notchList;

            await _repositorySalaryGrade.UpdateAsync(salaryGradeData);

        }
    
    
    }
}
