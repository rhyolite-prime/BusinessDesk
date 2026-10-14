using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.DomainServices.SchoolManger.Dashboard.Dto;

namespace TopazERP.Services.SchoolManager.Dashboard;

public interface IDashboardAppService: Abp.Application.Services.IApplicationService
{
    Task<FinanceDashboardDto> GetFinanceDashboard();
    Task<List<StudentDebtorDto>> GetStudentDebtors(Guid classId);
}