using TopazERP.DomainServices.Payroll.EmployeeBioDatas.Dto;
using TopazERP.Models.Payroll;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.Payroll.EmployeeBioDatas
{
   public interface IEmployeeBioDataManager: Abp.Domain.Services.IDomainService
    {
        Task<object> ListAll();
        Task<object> Create(EmployeeBioData input);
        Task<EmployeeBioData> GetAsync(string employeeIdentifier);
        Task Update(EmployeeBioData input);
        Task Delete(Guid Id);
        Task UpdateStatus(Guid employeeId, Guid statusId);

        //export
        Task<IEnumerable<AllowanceExportDto>> ExportAllowances();
        Task<IEnumerable<BenefitsExportDto>> ExportBenefitsInKind();
        Task<IEnumerable<SalaryInfoDto>> ExportSalaryInfo();
        Task<IEnumerable<SsnitExportDto>> ExportSsnit();
        Task<IEnumerable<DeductionsExportDto>> ExportDeductions();
        Task<IEnumerable<EmployeeLoansExportDto>> ExportEmployeeLoans();
    }
}
