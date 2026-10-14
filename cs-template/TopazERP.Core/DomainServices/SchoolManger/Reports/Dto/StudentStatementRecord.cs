using System;

namespace TopazERP.DomainServices.SchoolManger.Reports.Dto;

public class StudentStatementRecord
{
    public string Type        { get; set; }
    public DateTime Date      { get; set; }
    public string Description { get; set; }
    public decimal Amount     { get; set; }
    public decimal Payment    { get; set; }
    public decimal Balance    { get; set; }
    public Guid StudentId     { get; set; }
    public string StudentName { get; set; }
    public string RegNo { get; set; }
    public string Address { get; set; }
    public string ClassName { get; set; }
    public string CityName { get; set; }
}