using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Models.Stock
{
   public class WareHouse : Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
    {
        public string Name { get; set; }
        public string AddessLine1 { get; set; }
        public string AddessLine2 { get; set; }
        public Guid CountryId { get; set; }
        public string CountryName { get; set; }
        public string ContactPerson { get; set; }
        public Guid RegionId { get; set; }
        public string RegionName { get; set; }
        public Guid DistrictId { get; set; }
        public string DistrictName { get; set; }
        public Guid CityId { get; set; }
        public string CityName { get; set; }
        public string PhoneNo { get; set; }
        public string Email { get; set; }
        public string GpsCordinates { get; set; }
        public int TenantId { get; set; }
    }
}
