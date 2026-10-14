using Abp.Application.Services.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Shared.CountryStates.Dto
{
    public class UpdateCountryStateInput:EntityDto<Guid>
    {
        public Guid CountryId { get; set; }
        public string Name { get; set; }
        public int TenantId { get; set; }
    }
}
