using AutoMapper;
using TopazERP.DomainServices.Payroll.InitializePayMonths;
using TopazERP.Models.Payroll;
using TopazERP.Services.Payroll.InitializePayMonths.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Payroll.InitializePayMonths
{
    public class InitializePayMonthAppService: TopazERPAppServiceBase, IInitializePayMonthAppService
    {
        private readonly IInitializePayMonthManager _initializePayMonthManager;
        private readonly IMapper _mapper;

        public InitializePayMonthAppService(IInitializePayMonthManager initializePayMonthManager, IMapper mapper)
        {
            _initializePayMonthManager = initializePayMonthManager;
            _mapper = mapper;
        }


        public async Task<object> GetData()
        {
            return await _initializePayMonthManager.GetData();
        }

        public async Task Create(CreateInitializePayMonthInput input)
        {
            var obj = _mapper.Map<InitializePayMonth>(input);
            await _initializePayMonthManager.Create(obj);
        }

    }
}
