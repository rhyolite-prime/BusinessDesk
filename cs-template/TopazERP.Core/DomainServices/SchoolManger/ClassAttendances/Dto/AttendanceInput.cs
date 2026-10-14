using System;
using System.Collections.Generic;

namespace TopazERP.DomainServices.SchoolManger.ClassAttendances.Dto;

public class AttendanceInput
{
    public Guid ClassId { get; set; }
    public string ClassName { get; set; }
    public DateTime Date { get; set; }
    public int TenantId { get; set; }
    public List<StudentAttendanceInput> Students { get; set; }
}

public class StudentAttendanceInput
{
    public Guid StudentId { get; set; }
    public string StudentIdentifier { get; set; }
    public string StudentName { get; set; }
    public bool IsPresent { get; set; }
}
