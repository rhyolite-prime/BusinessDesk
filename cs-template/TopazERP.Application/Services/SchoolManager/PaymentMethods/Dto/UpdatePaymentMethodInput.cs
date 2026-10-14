using System;
using Abp.Application.Services.Dto;

namespace TopazERP.Services.SchoolManager.PaymentMethods.Dto;

public class UpdatePaymentMethodInput : EntityDto<Guid>
{
    public string Name { get; set; }
    public int TenantId { get; set; }
}