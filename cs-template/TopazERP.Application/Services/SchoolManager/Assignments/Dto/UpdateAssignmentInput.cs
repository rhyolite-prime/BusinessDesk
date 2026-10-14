using System;
using System.Collections.Generic;
using Abp.Application.Services.Dto;
using TopazERP.Models.Sch;

namespace TopazERP.Services.SchoolManager.Assignments.Dto;

public class UpdateAssignmentInput:EntityDto<Guid>
{
    public Guid AcademicYearId { get; set; }
    public string AcademicYearName {get; set;}
    public Guid TermId { get; set; }
    public string TermName {get; set;}
    public Guid ClassId { get; set; }
    public string ClassName {get; set;}
    public Guid SubjectId { get; set; }
    public string SubjectName {get; set;}
    public int AssignmentNumber { get; set; } 
    public string Type { get; set; }
    public decimal OverallMark { get; set; }
    public DateTime AssignedDate { get; set; }
    public bool IsRawMark { get; set; }
    public bool IsPercentage { get; set; }
    public bool IsCanceled { get; set; }
    public List<AssignmentImport> Details { get; set; }
    public int TenantId { get; set; }
}