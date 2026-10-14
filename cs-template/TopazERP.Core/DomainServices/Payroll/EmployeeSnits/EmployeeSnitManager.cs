using Abp.Domain.Repositories;
using TopazERP.Models.Payroll;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.Payroll.EmployeeSnits
{
   public class EmployeeSnitManager: Abp.Domain.Services.DomainService, IEmployeeSnitManager
    {
        private readonly IRepository<EmployeeSnit, Guid> _repositoryEmployeeSnit;

        public EmployeeSnitManager(IRepository<EmployeeSnit, Guid> repositoryEmployeeSnit)
        {
            _repositoryEmployeeSnit = repositoryEmployeeSnit;
        }

        public async Task Create(EmployeeSnit entity)
        {
            var datta = await _repositoryEmployeeSnit.FirstOrDefaultAsync(x => x.EmployeeId == entity.EmployeeId);

            if (datta == null)
            {
                await _repositoryEmployeeSnit.InsertAsync(entity);

            }
            else
            {

                datta.SecondProvidentFundEmployeeContribution = entity.SecondProvidentFundEmployeeContribution;
                datta.SecondProvidentFundEmployerContribution = entity.SecondProvidentFundEmployerContribution;
                datta.ProvidentFundEmployeeContribution = entity.ProvidentFundEmployeeContribution;
                datta.ProvidentFundEmployerContribution = entity.ProvidentFundEmployerContribution;
                datta.SuperAnnuationEmployeeContribution = entity.SuperAnnuationEmployeeContribution;
                datta.SuperAnnuationEmployerContribution = entity.SuperAnnuationEmployerContribution;
                datta.SocialSecurityFundEmployeeContribution = entity.SocialSecurityFundEmployeeContribution;
                datta.SocialSecurityFundEmployerContribution = entity.SocialSecurityFundEmployerContribution;

                await _repositoryEmployeeSnit.UpdateAsync(datta);

            }
        }

        public async Task Update(EmployeeSnit entity)
        {
            await _repositoryEmployeeSnit.UpdateAsync(entity);
        }

        public async Task<object> GetAsync(Guid employeeId)
        {
            return await _repositoryEmployeeSnit.FirstOrDefaultAsync(x=>x.EmployeeId == employeeId);
        }

        public async Task<object> ListAll()
        {
            var data = await _repositoryEmployeeSnit.GetAllListAsync();
            return data.OrderBy(a => a.EmployeeName);

        }
        public async Task Delete(Guid id)
        {
            await _repositoryEmployeeSnit.DeleteAsync(id);

        }
    }
}
