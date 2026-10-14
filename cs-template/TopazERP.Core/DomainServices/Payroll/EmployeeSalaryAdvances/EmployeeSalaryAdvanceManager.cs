using Abp.Domain.Repositories;
using TopazERP.Models.Payroll;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.Payroll.EmployeeSalaryAdvances
{
   public class EmployeeSalaryAdvanceManager: Abp.Domain.Services.DomainService, IEmployeeSalaryAdvanceManager
    {
        private readonly IRepository<EmployeeSalaryAdvance, Guid> _repositoryEmployeeSalaryAdvance;

        public EmployeeSalaryAdvanceManager(IRepository<EmployeeSalaryAdvance, Guid> repositoryEmployeeSalaryAdvance)
        {
            _repositoryEmployeeSalaryAdvance = repositoryEmployeeSalaryAdvance;
        }

        public async Task Create(EmployeeSalaryAdvance entity)
        {
            entity.IsApproved = false;
            entity.Status = "Pending";
            entity.IsPaid = false;
            await _repositoryEmployeeSalaryAdvance.InsertAsync(entity);

        }

        public async Task Update(EmployeeSalaryAdvance entity)
        {
            var existingSalaryAdvance = await _repositoryEmployeeSalaryAdvance.FirstOrDefaultAsync(entity.Id);
            
            existingSalaryAdvance.Amount = entity.Amount;
            existingSalaryAdvance.LoanDate = entity.LoanDate;
            existingSalaryAdvance.LoanTypeId = entity.LoanTypeId;
            existingSalaryAdvance.LoanTypeName = entity.LoanTypeName;
             
            await _repositoryEmployeeSalaryAdvance.UpdateAsync(existingSalaryAdvance);
            
            
        }

        public async Task<object> GetAsync(Guid id)
        {
            return await _repositoryEmployeeSalaryAdvance.FirstOrDefaultAsync(id);
        }
        
        
        public async Task<object> ListPendingSalaryAdvance()
        {
            return await _repositoryEmployeeSalaryAdvance.GetAllListAsync(x => !x.IsApproved && (x.Status == "Pending" || x.Status == "Approved"));
        }

        public async Task<object> ListAll()
        {
            var data = await _repositoryEmployeeSalaryAdvance.GetAllListAsync();
            
            return data.OrderBy(a => a.EmployeeName);
        }

        public async Task<object> ListAll(Guid employeeId)
        {
            return await _repositoryEmployeeSalaryAdvance.GetAllListAsync(x=> x.EmployeeId == employeeId);
        }
        
        
        public async Task Approve(List<Guid> ids, string approvalType)
        {
            foreach (var id in ids)
            {
                var data = await _repositoryEmployeeSalaryAdvance.FirstOrDefaultAsync(x => x.Id == id && !x.IsApproved && x.Status == "Pending");
                
                if (data != null)
                {
                    switch (approvalType)
                    {
                        case "approve":
                            data.IsApproved = true;
                            data.Status = "Approved";
                            break;

                        case "reject":
                            data.IsApproved = false;
                            data.Status = "Rejected";
                            break;

                        default:
                            break;
                    }

                    await _repositoryEmployeeSalaryAdvance.UpdateAsync(data);

                }

            }

        }

        public async Task Delete(Guid id)
        {
            await _repositoryEmployeeSalaryAdvance.DeleteAsync(id);
        }
    }
}
