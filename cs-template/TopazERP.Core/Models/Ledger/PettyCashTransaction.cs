using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using Abp.Domain.Entities;
using Abp.Domain.Entities.Auditing;

namespace TopazERP.Models.Ledger;

public class PettyCashTransaction : FullAuditedEntity<Guid>, IMustHaveTenant
{
    public DateTime BatchDate { get; set; }
    public string BatchNo { get; set; }
    public string SourceDocNo { get; set; }
    
    public Guid PettyCashAccountId { get; set; }
    public string PettyCashAccountName { get; set; }
    
    public string BatchOriginator { get; set; }
    
    public Guid CurrencyId { get; set; }
    public string CurrencyName { get; set; }
    
    public string CurrencyCode { get; set; }
    
    public decimal CurrencyRate { get; set; }
    public decimal TotalAmount { get; set; }
    public bool IsPosted { get; set; }

    [Column(TypeName = "jsonb")] 
    public List<PettyCashTransactionDetail> Details { get; set; }

    public int TenantId { get; set; }
}
