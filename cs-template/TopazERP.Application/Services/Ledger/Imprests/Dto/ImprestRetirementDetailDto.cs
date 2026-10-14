using Abp.Application.Services.Dto;
using Abp.AutoMapper;
using System;
using TopazERP.Models.Ledger;

namespace TopazERP.Services.Ledger.Imprests.Dto
{
    [AutoMap(typeof(ImprestRetirementDetail))]
    public class ImprestRetirementDetailDto : EntityDto<Guid>
    {
        public Guid ImprestRetirementId { get; set; }
        public DateTime ReceiptDate { get; set; }
        public string ReceiptNo { get; set; }
        public string Description { get; set; }
        public decimal Amount { get; set; }
        public Guid DebitAccountId { get; set; }
        public Guid CreditAccountId { get; set; }
        public Guid OuId { get; set; }
    }
}
