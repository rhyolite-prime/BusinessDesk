using TopazERP.DomainServices.Payroll.EmployeeBioDatas.Dto;
using TopazERP.Services.Payroll.EmployeeBioDatas.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Payroll.EmployeeBioDatas
{
   public interface IEmployeeBioDataAppService: Abp.Application.Services.IApplicationService
    {
        Task<object> ListAll();
        Task<object> Create(CreateEmployeeBioDataInput input);
        Task Import(List<ImportEmployeeBioDataInput> inputList);
        Task Update(UpdateEmployeeBioDataInput input);
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
