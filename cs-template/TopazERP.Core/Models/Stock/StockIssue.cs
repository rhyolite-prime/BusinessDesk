using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Models.Stock
{
   public class StockIssue : Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
    {
        public DateTime IssueDate { get; set; }
        public Guid WareHouseId { get; set; }
        public string WareHouseName { get; set; }
        public Guid SourceOuId { get; set; }
        public string SourceOuIdName { get; set; }
        public string SalesPerson { get; set; }
        public Guid ExpenseAccountId { get; set; }
        public string ExpenseAccountName { get; set; }
        public string BatchNo { get; set; }
        public Guid DestinationOuId { get; set; }
        public string DestinationOuIdName { get; set; }
        public string SalesInvoiceNo { get; set; }  
        public string CostingMethod { get; set; }
        public decimal TotalAmount { get; set; }
        [Column(TypeName = "jsonb")] public List<StockIssueDetail> Details { get; set; }
        public int TenantId { get; set; }
    }
}
