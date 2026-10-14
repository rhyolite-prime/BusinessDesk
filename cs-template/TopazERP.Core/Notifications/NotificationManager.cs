using System.Threading.Tasks;
using Abp.Domain.Services;
using TopazERP.DomainServices.Payroll.Reports.Dto;

namespace TopazERP.Notifications;

public class NotificationManager: DomainService, INotificationManager
{
    
 
    public async Task SendEmployeePayslipViaEmail(EmployeePayslip notification)
    {
        await Task.Delay(1);
    }
    
}