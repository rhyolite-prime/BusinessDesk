using Abp.Application.Services.Dto;
using Abp.AutoMapper;
using System;
using TopazERP.Models.Ledger;

namespace TopazERP.Services.Ledger.Imprests.Dto
{
    [AutoMap(typeof(ImprestWriteoff))]
    public class ImprestWriteoffDto : EntityDto<Guid>
    {
        public Guid ImprestId { get; set; }
        public Guid EmployeeId { get; set; }
        public DateTime WriteOffDate { get; set; }
        public decimal Amount { get; set; }
        public Guid CurrencyId { get; set; }
        public decimal Rate { get; set; }
        public Guid? AuthorizedBy { get; set; }
        public string WrittenOffBy { get; set; }
        public Guid DebitAccountId { get; set; }
        public Guid CreditAccountId { get; set; }
        public string Notes { get; set; }
        public bool PostedToGL { get; set; }
    }
}
