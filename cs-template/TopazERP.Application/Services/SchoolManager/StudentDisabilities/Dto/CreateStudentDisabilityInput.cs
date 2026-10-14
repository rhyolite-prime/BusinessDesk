using System;

namespace TopazERP.Services.SchoolManager.StudentDisabilities.Dto;

public class CreateStudentDisabilityInput
{
    public Guid DisabilityId { get; set; }
    public string DisabilityName { get; set; }
    public Guid StudentId { get; set; }
    public string StudentName { get; set; }
}