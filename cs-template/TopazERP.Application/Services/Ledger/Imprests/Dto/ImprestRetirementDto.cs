using Abp.Application.Services.Dto;
using Abp.AutoMapper;
using System;
using System.Collections.Generic;
using TopazERP.Models.Ledger;

namespace TopazERP.Services.Ledger.Imprests.Dto
{
    [AutoMap(typeof(ImprestRetirement))]
    public class ImprestRetirementDto : EntityDto<Guid>
    {
        public Guid ImprestId { get; set; }
        public Guid EmployeeId { get; set; }
        public DateTime RetirementDate { get; set; }
        public decimal AmountRetired { get; set; }
        public Guid CurrencyId { get; set; }
        public decimal Rate { get; set; }
        public string RetiredBy { get; set; }
        public bool PostedToGL { get; set; }
        
        public List<ImprestRetirementDetailDto> Details { get; set; }
    }
}
