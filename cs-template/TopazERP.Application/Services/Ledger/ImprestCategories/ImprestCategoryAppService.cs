using AutoMapper;
using TopazERP.DomainServices.Ledger.ImprestCategories;
using TopazERP.Models.Ledger;
using TopazERP.Services.Ledger.ImprestCategories.Dto;
using System;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Ledger.ImprestCategories
{
    public class ImprestCategoryAppService: TopazERPAppServiceBase, IImprestCategoryAppService
    {
        private readonly IImprestCategoryManager _imprestCategoryManager;
        private readonly IMapper _mapper;

        public ImprestCategoryAppService(IImprestCategoryManager imprestCategoryManager, IMapper mapper)
        {
            _imprestCategoryManager = imprestCategoryManager;
            _mapper = mapper;
        }


        public async Task<object> Create(CreateImprestCategoryInput input)
        {
            var obj = _mapper.Map<ImprestCategory>(input);
            return await _imprestCategoryManager.Create(obj);
        }

        public async Task Update(UpdateImprestCategoryInput input)
        {
            var obj = _mapper.Map<ImprestCategory>(input);
            await _imprestCategoryManager.Update(obj);
        }

        public async Task<object> ListAll()
        {
            return await _imprestCategoryManager.ListAll();
        }

        public async Task Delete(Guid id)
        {
            await _imprestCategoryManager.Delete(id);
        }

    }
}
