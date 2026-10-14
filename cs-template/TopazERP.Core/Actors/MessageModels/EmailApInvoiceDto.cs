using System;
using System.Collections.Generic;
using TopazERP.DomainServices.Ap.Reports.Dto;
using TopazERP.Models.Ap;

namespace TopazERP.Actors.MessageModels;

public class EmailApInvoiceDto
{
    public Guid SupplierId { get; set; }
    public List<Guid> InvoiceIds { get; set; } = new();
   
    
}
