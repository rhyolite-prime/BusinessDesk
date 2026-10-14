using Abp.Application.Services.Dto;
using Castle.MicroKernel.SubSystems.Conversion;
using TopazERP.Models.Payroll;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Payroll.PayCalendars.Dto
{
   public class UpdatePayCalendarInput:EntityDto<Guid>
    {
        public int Year { get; set; }
        public List<PayCalendarDetail> PayCalendarDetails { get; set; }
        public int TenantId { get; set; }
    }
}
