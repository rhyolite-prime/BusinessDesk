using TopazERP.Services.Payroll.BonusAndOnetimeAllowances.Dto;
using TopazERP.Services.Payroll.EmployeeOnetimeDeductions.Dto;
using System.Collections.Generic;
using System;

namespace TopazERP.Web.Models.Dto
{
    public class BulkBonusAndOnetimeAllowanceInput
    {
        public List<CreateBonusAndOnetimeAllowanceInput> BonusList { get; set; }
    }

    public class BulkOnetimeDeductionInput
    {
        public List<CreateEmployeeOnetimeDeductionInput> DeductionList { get; set; }
    }

    public class LoanApprovalDto
    {
        public List<Guid> Ids { get; set; }
        public string ApprovalType { get; set; }
    }
    
    public class SalaryAdvanceApprovalDto: LoanApprovalDto
    {}
}
