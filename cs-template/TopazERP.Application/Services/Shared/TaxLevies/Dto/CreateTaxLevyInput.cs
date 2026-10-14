using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Abp.Application.Services.Dto;
using Abp.Domain.Entities;
namespace TopazERP.Services.Shared.TaxLevies.Dto;
public class CreateTaxLevyInput
{
    public string Name { get; set; }
    public decimal Rate { get; set; }
    public string Type { get; set; }
}

public class UpdateTaxLevyInput:EntityDto<Guid>
{
    public string Name { get; set; }
    public decimal Rate { get; set; }
    public string Type { get; set; }
    public int TenantId { get; set; }
    
}