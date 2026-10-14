using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Shared.Countries.Dto
{
    public class CreateCountryInput
    {
        public string Name { get; set; }
        public string Code { get; set; }
        public int NumericIsoCode { get; set; }
        public string Nationality { get; set; }
    }
}
