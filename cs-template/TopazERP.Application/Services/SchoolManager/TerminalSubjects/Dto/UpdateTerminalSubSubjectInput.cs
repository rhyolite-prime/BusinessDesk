using System;
using Abp.Application.Services.Dto;

namespace TopazERP.Services.SchoolManager.TerminalSubjects.Dto
{
    public class UpdateTerminalSubSubjectInput : EntityDto<Guid>
    {
        public Guid TerminalSubjectId { get; set; }
        public string Name { get; set; }
        public int Mark { get; set; }
        public int TenantId { get; set; }
    }
}