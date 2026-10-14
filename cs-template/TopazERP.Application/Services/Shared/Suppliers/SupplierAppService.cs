using AutoMapper;
using TopazERP.DomainServices.Shared.Suppliers;
using TopazERP.Models.Shared;
using TopazERP.Services.Shared.Suppliers.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TopazERP.DomainServices.Shared.SupplierGroups;
using TopazERP.DomainServices.Shared.Currencies;
using TopazERP.DomainServices.Shared.Statuses;
namespace TopazERP.Services.Shared.Suppliers
{
    public class SupplierAppService : TopazERPAppServiceBase, ISupplierAppService
    {

        private readonly ISupplierManager _supplierManager;
        private readonly ICurrencyManager _currencyManager;
        private readonly ISupplierGroupManager _supplierGroupManager;
        private readonly IStatusManager _statusManager;
        private readonly IMapper _mapper;

        public SupplierAppService(ISupplierManager supplierManager, IMapper mapper, ICurrencyManager currencyManager, ISupplierGroupManager supplierGroupManager, IStatusManager statusManager)
        {
            _supplierManager = supplierManager;
            _mapper = mapper;
            _currencyManager = currencyManager;
            _supplierGroupManager = supplierGroupManager;
            _statusManager = statusManager;
        }

        public async Task<object> ListAll()
        {
            return await _supplierManager.ListAll();
        }


        public async Task<object> ListAllByGroup(Guid groupId)
        {
            return await _supplierManager.ListAllByGroup(groupId);
        }

        public async Task<object> Create(CreateSupplierInput input)
        {
            var obj = _mapper.Map<Supplier>(input);
            return await _supplierManager.Create(obj);
        }

        public async Task Update(UpdateSupplierInput input)
        {
            var obj = _mapper.Map<Supplier>(input);
             await _supplierManager.Update(obj);
        }


        public async Task Delete(Guid id)
        {
            await _supplierManager.Delete(id);

        }
    }
}
