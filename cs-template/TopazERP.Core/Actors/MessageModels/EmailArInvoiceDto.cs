using System;
using System.Collections.Generic;
using TopazERP.DomainServices.Ar.Reports.Dto;
using TopazERP.Models.Ar;

namespace TopazERP.Actors.MessageModels;

public class EmailArInvoiceDto
{
    public Guid CustomerId { get; set; }
    public List<Guid> InvoiceIds { get; set; } = new();
    
}