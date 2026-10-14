using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.Hostels;

public interface IHostelManager: Abp.Domain.Services.IDomainService
{
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(Hostel hostel);
    Task Update(Hostel hostel);
    Task Delete(Guid id);
}
