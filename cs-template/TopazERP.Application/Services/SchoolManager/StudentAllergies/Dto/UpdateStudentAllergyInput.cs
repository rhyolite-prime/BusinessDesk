using System;
using Abp.Application.Services.Dto;

namespace TopazERP.Services.SchoolManager.StudentAllergies.Dto;

public class UpdateStudentAllergyInput : EntityDto<Guid>
{
    public Guid AllergyTypeId { get; set; }
    public string AllergyTypeName { get; set; }
    public Guid StudentId { get; set; }
    public string StudentName { get; set; }
    public int TenantId { get; set; }
}