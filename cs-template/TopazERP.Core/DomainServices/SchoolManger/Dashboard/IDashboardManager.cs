using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.DomainServices.SchoolManger.Dashboard.Dto;

namespace TopazERP.DomainServices.SchoolManger.Dashboard;

public interface IDashboardManager: Abp.Domain.Services.IDomainService
{
    Task<FinanceDashboardDto> GetFinanceDashboard();
    Task<List<StudentDebtorDto>> GetStudentDebtors(Guid classId);
}