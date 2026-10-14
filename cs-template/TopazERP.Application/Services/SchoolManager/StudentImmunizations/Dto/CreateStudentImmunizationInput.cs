using System;

namespace TopazERP.Services.SchoolManager.StudentImmunizations.Dto;

public class CreateStudentImmunizationInput
{
    public Guid StudentId { get; set; }
    public string StudentName { get; set; }
    public Guid ImmunizationTypeId { get; set; }
    public string ImmunizationTypeName { get; set; }
    public bool IsImmunized { get; set; }
    public DateTime ImmunizationDate { get; set; }
}
