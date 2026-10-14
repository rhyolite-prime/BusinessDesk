using System;
using System.Collections.Generic;

namespace TopazERP.Services.SchoolManager.ProcessBills.Dto;

public class CancelBillForStudentInput
{
        public List<Guid> studentBillInfoIds { get; set; } = new();
}