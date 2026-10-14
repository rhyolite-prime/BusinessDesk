using System;
using System.Collections.Generic;

namespace TopazERP.Models.Sch;

public class BillFooter: Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
{
        public int TenantId { get; set; }
        public string Message { get; set; }
        public Guid AcademicYearId { get; set; }
        public Guid TermId { get; set; }
        public bool ToSchool { get; set; }
        public bool ToClass { get; set; }
        public int OrderNumber { get; set; }
        [System.ComponentModel.DataAnnotations.Schema.Column(TypeName = "jsonb")]
        public List<BillFooterDetails> Details { get; set; }
}