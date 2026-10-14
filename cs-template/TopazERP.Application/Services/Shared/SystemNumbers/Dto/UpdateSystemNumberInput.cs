using Abp.Application.Services.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Shared.SystemNumbers.Dto
{
   public class UpdateSystemNumberInput:EntityDto<Guid>
    {
        public string ModuleName { get; set; }
        public string ItemName { get; set; }
        public string Prefix { get; set; }
        public string Suffix { get; set; }
        public int TenantId { get; set; }
        public int LastNo { get; set; }
        public string FriendlyName { get; set; }
    }
}
