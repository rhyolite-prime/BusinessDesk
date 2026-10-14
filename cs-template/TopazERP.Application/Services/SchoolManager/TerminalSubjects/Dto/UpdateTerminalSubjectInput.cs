using System;
using Abp.Application.Services.Dto;

namespace TopazERP.Services.SchoolManager.TerminalSubjects.Dto
{
    public class UpdateTerminalSubjectInput : EntityDto<Guid>
    {
        public string Name { get; set; }
        public int Mark { get; set; }
        public int TenantId { get; set; }
    }
}