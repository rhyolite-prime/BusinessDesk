using AutoMapper;
using TopazERP.DomainServices.Ledger.ImprestCategories;
using TopazERP.DomainServices.Ledger.PettyCashRecipients;
using TopazERP.Models.Ledger;
using TopazERP.Services.Ledger.ImprestCategories.Dto;
using TopazERP.Services.Ledger.PettyCashRecipients.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Ledger.PettyCashRecipients
{
    public class PettyCashRecipientAppService: TopazERPAppServiceBase, IPettyCashRecipientAppService
    {

        private readonly IPettyCashRecipientManager _pettyCashRecipientManager;
        private readonly IMapper _mapper;

        public PettyCashRecipientAppService(IPettyCashRecipientManager pettyCashRecipientManager, IMapper mapper)
        {
            _pettyCashRecipientManager = pettyCashRecipientManager;
            _mapper = mapper;
        }


        public async Task<object> Create(CreatePettyCashRecipientInput input)
        {
            var obj = _mapper.Map<PettyCashRecipient>(input);
            return await _pettyCashRecipientManager.Create(obj);
        }

        public async Task Update(UpdatePettyCashRecipientInput input)
        {
            var obj = _mapper.Map<PettyCashRecipient>(input);
            await _pettyCashRecipientManager.Update(obj);
        }

        public async Task<object> ListAll()
        {
            return await _pettyCashRecipientManager.ListAll();
        }

        public async Task Delete(Guid id)
        {
            await _pettyCashRecipientManager.Delete(id);
        }

    }
}
