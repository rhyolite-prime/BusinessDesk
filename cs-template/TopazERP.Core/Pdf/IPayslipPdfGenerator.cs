using System.Threading.Tasks;
using Abp.Domain.Services;
using TopazERP.DomainServices.Payroll.Reports.Dto;

namespace TopazERP.Pdf;

public interface IPayslipPdfGenerator: IDomainService
{
    Task<byte[]> RenderPdf(EmployeePayslip payslip);
}