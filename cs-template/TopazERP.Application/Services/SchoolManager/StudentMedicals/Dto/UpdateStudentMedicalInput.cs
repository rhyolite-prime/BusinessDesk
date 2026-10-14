using System;
using Abp.Application.Services.Dto;

namespace TopazERP.Services.SchoolManager.StudentMedicals.Dto;

public class UpdateStudentMedicalInput:EntityDto<Guid>
{
    public string DoctorName { get; set; }
    public string DoctorPhone { get; set; }
    public string[] MedicalConditions { get; set; }
    public string[] Medications { get; set; }
    public string ClinicName { get; set; }
    public string ClinicPhone { get; set; }
    public string EmergencyContactName { get; set; }
    public string EmergencyContactPhone { get; set; }
    public Guid StudentId { get; set; }
    public string StudentName { get; set; }
    public int TenantId { get; set; }
}