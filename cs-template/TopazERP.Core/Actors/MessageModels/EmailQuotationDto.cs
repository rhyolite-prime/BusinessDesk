using System;
using System.Collections.Generic;

namespace TopazERP.Actors.MessageModels;

public class EmailQuotationDto
{
    public Guid CustomerId { get; set; }
    public List<Guid> QuotationIds { get; set; } = new();
}