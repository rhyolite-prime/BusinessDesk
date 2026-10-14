using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.DomainServices.SchoolManger.Dashboard;
using TopazERP.DomainServices.SchoolManger.Dashboard.Dto;

namespace TopazERP.Services.SchoolManager.Dashboard;

public class DashboardAppService: TopazERPAppServiceBase, IDashboardAppService
{
    private readonly IDashboardManager _dashboardManager;

    public DashboardAppService(IDashboardManager dashboardManager)
    {
        _dashboardManager = dashboardManager;
    }
    public async Task<FinanceDashboardDto> GetFinanceDashboard()
    {
        return await _dashboardManager.GetFinanceDashboard();
    }
    
    public async Task<List<StudentDebtorDto>> GetStudentDebtors(Guid classId)
    {
        return await _dashboardManager.GetStudentDebtors(classId);
    }
}
