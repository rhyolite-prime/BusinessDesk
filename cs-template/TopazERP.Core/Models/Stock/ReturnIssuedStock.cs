using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Models.Stock
{
   public class ReturnIssuedStock : Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
    {
        public DateTime DateReturned { get; set; }
        public string BatchNo { get; set; }
        public string InvoiceNo { get; set; }
        public Guid WareHouseId { get; set; }
        public string WareHouseName { get; set; }
        public DateTime DateIssued { get; set; }
        public string ReturnedBy { get; set; }
        public string ReceivedBy { get; set; }
        public string Reason { get; set; }
        [Column(TypeName = "jsonb")] public List<ReturnIssuedStockDetail> Details { get; set; }
        public int TenantId { get; set; }
    }
}
