using System;
using System.Collections.Generic;

namespace TopazERP.DomainServices.SchoolManger.Reports.Dto;

public class PaymentReceiptRequestDto
{
    public List<Guid> PaymentIds { get; set; }
}