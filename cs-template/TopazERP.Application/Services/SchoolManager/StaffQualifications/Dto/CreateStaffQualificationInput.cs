using System;

namespace TopazERP.Services.SchoolManager.StaffQualifications.Dto;

public class CreateStaffQualificationInput
{
    public Guid staffId { get; set; }
    public string staffName { get; set; }
    public string Institute { get; set; }
    public string Programme { get; set; }
    public string CertificateId { get; set; }
    public string CertificateName { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public bool IsAcademic { get; set; }
    public string Comments { get; set; }
}