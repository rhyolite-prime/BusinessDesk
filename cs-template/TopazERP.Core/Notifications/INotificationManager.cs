using System.Threading.Tasks;
using Abp.Domain.Services;
using TopazERP.DomainServices.Payroll.Reports.Dto;

namespace TopazERP.Notifications;

public interface INotificationManager: IDomainService
{
    Task SendEmployeePayslipViaEmail(EmployeePayslip notification);
}