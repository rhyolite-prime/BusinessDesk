using System;

namespace TopazERP.Services.SchoolManager.StudentAllergies.Dto;

public class CreateStudentAllergyInput
{
    public Guid AllergyTypeId { get; set; }
    public string AllergyTypeName { get; set; }
    public Guid StudentId { get; set; }
    public string StudentName { get; set; }
}