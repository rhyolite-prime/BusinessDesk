using AutoMapper;
using TopazERP.DomainServices.Payroll.OvertimeTimeSheets;
using TopazERP.Models.Payroll;
using TopazERP.Services.Payroll.OvertimeTimeSheets.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Payroll.OvertimeTimeSheets
{
   public class OvertimeTimeSheetAppService: TopazERPAppServiceBase, IOvertimeTimeSheetAppService
    {
        private readonly IOvertimeTimeSheetManager _overtimeTimeSheetManager;
        private readonly IMapper _mapper;

        public OvertimeTimeSheetAppService(IOvertimeTimeSheetManager overtimeTimeSheetManager, IMapper mapper)
        {
            _overtimeTimeSheetManager = overtimeTimeSheetManager;
            _mapper = mapper;
        }

        public async Task<object> ListAll()
        {
            return await _overtimeTimeSheetManager.ListAll();
        }

        public async Task<object> ListAll(int month, int year)
        {
            return await _overtimeTimeSheetManager.ListAll(month, year);
        }

        public async Task Create(CreateOvertimeTimeSheetInput input)
        {
            var obj = _mapper.Map<OvertimeTimeSheet>(input);
            await _overtimeTimeSheetManager.Create(obj);
        }

        public async Task Update(UpdateOvertimeTimeSheetInput input)
        {
            var obj = _mapper.Map<OvertimeTimeSheet>(input);
            await _overtimeTimeSheetManager.Update(obj);
        }

        public async Task Delete(Guid Id)
        {
            await _overtimeTimeSheetManager.Delete(Id);

        }
    }
}
