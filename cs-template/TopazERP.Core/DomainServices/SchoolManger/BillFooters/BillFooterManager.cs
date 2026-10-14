using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Abp.Domain.Repositories;
using Abp.Domain.Services;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.BillFooters;

public class BillFooterManager:DomainService, IBillFooterManager
{
    public readonly IRepository<BillFooter, Guid> _billFooterRepository;

    public BillFooterManager(IRepository<BillFooter, Guid> billFooterRepository)
    {
        _billFooterRepository = billFooterRepository;
    }
    
    public async Task<object> Create(BillFooter entity)
    {
        var exists = await _billFooterRepository.FirstOrDefaultAsync(x =>
            x.AcademicYearId == entity.AcademicYearId &&
            x.TermId == entity.TermId &&
            x.ToSchool == entity.ToSchool &&
            x.ToClass == entity.ToClass &&
            x.OrderNumber == entity.OrderNumber &&
            x.TenantId == entity.TenantId
        );

        if (exists != null)
        {
            return new { code = 409, message = "Bill footer already exists." };
        }

        await _billFooterRepository.InsertAsync(entity);

        return new { code = 200, message = "successful" };
    }
    public async Task Update(BillFooter entity)
    {
        await _billFooterRepository.UpdateAsync(entity);
    }

    public async Task<IEnumerable<object>> ListAll()
    {
        var data = await _billFooterRepository.GetAllListAsync();
        return data.ToList();
    }
    public async Task Delete(Guid id)
    {
        await _billFooterRepository.DeleteAsync(id);
    }

}