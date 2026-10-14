using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Models.Stock
{
   public class StockTransfer : Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
    {
        public DateTime TransferDate { get; set; }
        public string BatchNo { get; set; }
        public string ReferenceNo { get; set; }
        public Guid SourceWareHouseId { get; set; }
        public string SourceWareHouseName { get; set; }
        public Guid DestinationWareHouseId { get; set; }
        public Guid DestinationWareHouseName { get; set; }
        public Guid SourceAccountId { get; set; }
        public Guid DestinationAccountId { get; set; }
        [Column(TypeName = "jsonb")] public List<StockTransferDetail> Details { get; set; }
        public int TenantId { get; set; }
    }
}
