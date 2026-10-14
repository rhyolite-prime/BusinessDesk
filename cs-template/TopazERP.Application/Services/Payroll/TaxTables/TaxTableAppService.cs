using AutoMapper;
using TopazERP.DomainServices.Payroll.TaxTables;
using TopazERP.Models.Payroll;
using TopazERP.Services.Payroll.TaxTables.Dto;
using System;
using System.Threading.Tasks;

namespace TopazERP.Services.Payroll.TaxTables
{
   public class TaxTableAppService: TopazERPAppServiceBase, ITaxTableAppService
    {
        private readonly ITaxTableManager _taxTableManager;
        private readonly IMapper _mapper;

        public TaxTableAppService(ITaxTableManager taxTableManager, IMapper mapper)
        {
            _taxTableManager = taxTableManager;
            _mapper = mapper;
        }

        public async Task<object> ListAll()
        {
            return await _taxTableManager.ListAll();
        }

        public async Task Create(CreateTaxTableInput input)
        {
            var obj = _mapper.Map<TaxTable>(input);
            await _taxTableManager.Create(obj);
        }

        public async Task Update(UpdateTaxTableInput input)
        {
            var obj = _mapper.Map<TaxTable>(input);
            await _taxTableManager.Update(obj);
        }

        public async Task Delete(Guid Id)
        {
            await _taxTableManager.Delete(Id);
        }
    }
}
