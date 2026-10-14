using Abp.Application.Services.Dto;
using Castle.MicroKernel.SubSystems.Conversion;
using TopazERP.Models.Shared;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Shared.Banks.Dto
{
    public class UpdateBankInput:EntityDto<Guid>
    {
        public string Name { get; set; }
        public string ContactPerson { get; set; }
        public string ContactNo { get; set; }
        public string Email { get; set; }
        public string BankCode { get; set; }
        public List<BankBranch> BankBranches { get; set; }
        public int TenantId { get; set; }
    }
}
