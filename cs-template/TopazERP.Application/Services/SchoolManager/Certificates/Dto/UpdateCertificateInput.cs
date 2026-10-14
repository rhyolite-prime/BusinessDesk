using System;
using Abp.Application.Services.Dto;

namespace TopazERP.Services.SchoolManager.Certificates.Dto
{
    public class UpdateCertificateInput : EntityDto<Guid>
    {
        public string Name { get; set; }
        public int TenantId { get; set; }
    }
}