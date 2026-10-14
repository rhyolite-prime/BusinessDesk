using System;
using System.Collections.Generic;

namespace TopazERP.Actors.MessageModels;

public class EmailPaymentReceiptDto
{
    public Guid CustomerId { get; set; }
    public List<Guid> PaymentIds { get; set; } = new();
}