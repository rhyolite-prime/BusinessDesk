using Abp.Domain.Repositories;
using TopazERP.Models.Shared;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.Shared.SmsHistories
{
   public class SmsHistoryManager: Abp.Domain.Services.DomainService, ISmsHistoryManager
    {
        private readonly IRepository<SmsHistory, Guid> _repositoryStudent;

        public SmsHistoryManager(IRepository<SmsHistory, Guid> repositoryStudent)
        {
            _repositoryStudent = repositoryStudent;
        }


        public async Task Create(SmsHistory entity)
        {
            await _repositoryStudent.InsertAsync(entity);
        }

        public async Task<object> ListAll(DateTime startDate, DateTime endDate)
        {
           return await _repositoryStudent.GetAllListAsync(x=> x.CreationTime >= startDate &&  x.CreationTime >= endDate);
        }
       
    }
}
