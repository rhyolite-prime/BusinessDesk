using System;
using System.Threading.Tasks;
using Abp.Domain.Services;

namespace TopazERP.DomainServices.Payroll.SetupIntegrityGuard;

public interface ISetupIntegrityGuardManager: IDomainService
{
    Task<bool> ValidateIntegrity(Guid id, string dataSource);
}