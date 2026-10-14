using System;
using Abp.Application.Services.Dto;

namespace TopazERP.Services.SchoolManager.StudentImmunizations.Dto;

public class UpdateStudentImmunizationInput : EntityDto<Guid>
{
    public Guid StudentId { get; set; }
    public string StudentName { get; set; }
    public Guid ImmunizationTypeId { get; set; }
    public string ImmunizationTypeName { get; set; }
    public bool IsImmunized { get; set; }
    public DateTime ImmunizationDate { get; set; }
    public int TenantId { get; set; }
}