using Abp.Domain.Uow;
using AutoMapper;
using TopazERP.DomainServices.Shared.SmsHistories;
using TopazERP.Models.Shared;
using TopazERP.Services.Shared.SmsHistories.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Shared.SmsHistories
{
   public class SmsHistoryAppService: TopazERPAppServiceBase, ISmsHistoryAppService
    {

        private readonly ISmsHistoryManager _smsHistoryManager;
        private readonly IUnitOfWorkManager _unitOfWorkManager;
        private readonly IMapper _mapper;

        public SmsHistoryAppService(ISmsHistoryManager smsHistoryManager, IMapper mapper, IUnitOfWorkManager unitOfWorkManager)
        {
            _smsHistoryManager = smsHistoryManager;
            _mapper = mapper;
            _unitOfWorkManager = unitOfWorkManager;
        }

        public async Task Create(SmsHistoryInput input)
        {
            using (_unitOfWorkManager.Current.SetTenantId(input.TenantId))
            {
                var obj = _mapper.Map<SmsHistory>(input);
                await _smsHistoryManager.Create(obj);
            }
           
        }

        public async Task<object> ListAll(DateTime startDate, DateTime endDate)
        {
            return await _smsHistoryManager.ListAll(startDate,endDate);
        }
    }
}
