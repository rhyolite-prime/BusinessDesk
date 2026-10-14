using AutoMapper;
using TopazERP.DomainServices.Shared.CustomerGroups;
using TopazERP.DomainServices.Shared.Customers;
using TopazERP.Models.Shared;
using TopazERP.Services.Shared.CustomerGroups.Dto;
using TopazERP.Services.Shared.Customers.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TopazERP.DomainServices.Shared.Currencies;
using TopazERP.DomainServices.Shared.Statuses;

namespace TopazERP.Services.Shared.Customers
{
    public class CustomerAppService: TopazERPAppServiceBase, ICustomerAppService
    {

        private readonly ICustomerManager _customerManager;
        private readonly ICurrencyManager _currencyManager;
        private readonly IStatusManager _statusManager;
        private readonly ICustomerGroupManager _customerGroupManager;
        private readonly IMapper _mapper;

        public CustomerAppService(ICustomerManager customerManager, IMapper mapper, ICurrencyManager currencyManager, ICustomerGroupManager customerGroupManager, IStatusManager statusManager)
        {
            _customerManager = customerManager;
            _mapper = mapper;
            _currencyManager = currencyManager;
            _customerGroupManager = customerGroupManager;
            _statusManager = statusManager;
        }

        public async Task<object> ListAll()
        {
            return await _customerManager.ListAll();
        }


        public async Task<object> ListAllByGroup(Guid groupId)
        {
            return await _customerManager.ListAllByGroup(groupId);
        }

        public async Task<object> Create(CreateCustomerInput input)
        {
            var obj = _mapper.Map<Customer>(input);
            return await _customerManager.Create(obj);
        }

        public async Task<object> Update(UpdateCustomerInput input)
        {
            var obj = _mapper.Map<Customer>(input);
            return await _customerManager.Update(obj);
        }


        public async Task Delete(Guid id)
        {
            await _customerManager.Delete(id);

        }

    }
}
