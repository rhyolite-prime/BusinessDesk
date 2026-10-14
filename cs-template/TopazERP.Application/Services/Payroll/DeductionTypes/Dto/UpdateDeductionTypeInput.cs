using Abp.Application.Services.Dto;
using Castle.MicroKernel.SubSystems.Conversion;
using TopazERP.Models.Payroll;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Payroll.DeductionTypes.Dto
{
   public class UpdateDeductionTypeInput:EntityDto<Guid>
    {
        public string Name { get; set; }
        public Guid AccountId { get; set; }
        [Column(TypeName = "jsonb")] public List<DeductionRate> Rates { get; set; }
        public int TenantId { get; set; }
    }
}
