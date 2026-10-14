using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Shared.Cties.Dto
{
    public class CreateCityInput
    {
        public Guid CountryId { get; set; }
        public Guid CountryStateId { get; set; }
        public string Name { get; set; }
    }
}
