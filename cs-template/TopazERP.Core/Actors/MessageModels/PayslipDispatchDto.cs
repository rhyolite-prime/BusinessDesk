using System;
using System.Collections.Generic;
using TopazERP.DomainServices.Payroll.Reports.Dto;

namespace TopazERP.Actors.MessageModels;

public class PayslipDispatchDto
{
    public Guid[] EmployeeIds { get; set; }
    public List<EmployeePayslip> EmployeePayslip { get; set; }
    public int IntervalCount { get; set; }
    public string IntervalType { get; set; }
    public int BatchSize { get; set; }
}

// Message class for scheduling
public class ProcessBatch
{
    
    
}