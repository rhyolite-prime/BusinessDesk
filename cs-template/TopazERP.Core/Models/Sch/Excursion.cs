using System;
using System.Collections.Generic;

namespace TopazERP.Models.Sch;

public class Excursion: Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
{
    public DateTime DepartureDate { get; set; }
    public TimeSpan DepartureTime { get; set; }
    public DateTime ReturnDate { get; set; }
    public TimeSpan ReturnTime { get; set; }
    public string Point { get; set; }
    public string Destination { get; set; }
    public Guid ClassId { get; set; }
    public string ClassName { get; set; }
    public Guid AcademicYearId { get; set; }
    public string AcademicYearName { get; set; }
    public Guid TermId { get; set; }
    public string TermName { get; set; }
    [System.ComponentModel.DataAnnotations.Schema.Column(TypeName = "jsonb")]
    public List<StudentExcursion> Students { get; set; }
    [System.ComponentModel.DataAnnotations.Schema.Column(TypeName = "jsonb")]
    public List<TeacherExcursion> Teachers { get; set; }
    public int TenantId { get; set; }
    
}