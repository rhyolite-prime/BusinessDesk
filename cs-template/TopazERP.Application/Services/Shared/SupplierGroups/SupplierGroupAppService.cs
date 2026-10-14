using AutoMapper;
using TopazERP.DomainServices.Shared.Religions;
using TopazERP.DomainServices.Shared.SupplierGroups;
using TopazERP.Models.Shared;
using TopazERP.Services.Shared.Religions.Dto;
using TopazERP.Services.Shared.SupplierGroups.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Shared.SupplierGroups
{
    public class SupplierGroupAppService: TopazERPAppServiceBase, ISupplierGroupAppService
    {

        private readonly ISupplierGroupManager _supplierGroupManager;
        private readonly IMapper _mapper;

        public SupplierGroupAppService(ISupplierGroupManager supplierGroupManager, IMapper mapper)
        {
            _supplierGroupManager = supplierGroupManager;
            _mapper = mapper;
        }


        public async Task<object> ListAll()
        {
            return await _supplierGroupManager.ListAll();
        }

        public async Task<object> Create(CreateSupplierGroupInput input)
        {
            var obj = _mapper.Map<SupplierGroup>(input);
            return await _supplierGroupManager.Create(obj);
        }

        public async Task Update(UpdateSupplierGroupInput input)
        {
            var obj = _mapper.Map<SupplierGroup>(input);
            await _supplierGroupManager.Update(obj);
        }

        public async Task Delete(Guid Id)
        {
            await _supplierGroupManager.Delete(Id);

        }

    }
}
