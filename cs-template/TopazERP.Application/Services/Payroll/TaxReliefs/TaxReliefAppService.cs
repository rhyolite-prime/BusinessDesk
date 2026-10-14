using AutoMapper;
using TopazERP.DomainServices.Payroll.TaxReliefs;
using TopazERP.Models.Payroll;
using TopazERP.Services.Payroll.TaxReliefs.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Payroll.TaxReliefs
{
   public class TaxReliefAppService: TopazERPAppServiceBase, ITaxReliefAppService
    {
        private readonly ITaxReliefManager _taxReliefManager;
        private readonly IMapper _mapper;

        public TaxReliefAppService(ITaxReliefManager taxReliefManager, IMapper mapper)
        {
            _taxReliefManager = taxReliefManager;
            _mapper = mapper;
        }

        public async Task<object> ListAll()
        {
            return await _taxReliefManager.ListAll();
        }

        public async Task<object> Create(CreateTaxReliefInput input)
        {
            var obj = _mapper.Map<TaxRelief>(input);
            return await _taxReliefManager.Create(obj);
        }

        public async Task Update(UpdateTaxReliefInput input)
        {
            var obj = _mapper.Map<TaxRelief>(input);
            await _taxReliefManager.Update(obj);
        }

        public async Task Delete(Guid Id)
        {
            await _taxReliefManager.Delete(Id);

        }
    }
}
