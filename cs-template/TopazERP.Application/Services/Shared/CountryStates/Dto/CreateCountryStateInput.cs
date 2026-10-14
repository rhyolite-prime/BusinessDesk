using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Shared.CountryStates.Dto
{
    public class CreateCountryStateInput
    {
        public Guid CountryId { get; set; }
        public string Name { get; set; }
    }
}
