using AutoMapper;
using TopazERP.DomainServices.Payroll.Gratuities;
using TopazERP.Models.Payroll;
using TopazERP.Services.Payroll.Gratuities.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Payroll.Gratuities
{
    public class GratuityAppService: IGratuityAppService
    {

        private readonly IGratuityManager _gratuityManager;
        private readonly IMapper _mapper;

        public GratuityAppService(IGratuityManager gratuityManager, IMapper mapper)
        {
            _gratuityManager = gratuityManager;
            _mapper = mapper;
        }

        public async Task<object> ListAll()
        {
            return await _gratuityManager.ListAll();
        }

        public async Task Create(CreateGratuityInput input)
        {
            var obj = _mapper.Map<Gratuity>(input);
             await _gratuityManager.Create(obj);
        }

        public async Task Update(UpdateGratuityInput input)
        {
            var obj = _mapper.Map<Gratuity>(input);
            await _gratuityManager.Update(obj);
        }

        public async Task Delete(Guid Id)
        {
            await _gratuityManager.Delete(Id);

        }
    }
}
