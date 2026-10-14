using TopazERP.Models.Shared;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Shared.Banks.Dto
{
    public class CreateBankInput
    {
        public string Name { get; set; }
        public string ContactPerson { get; set; }
        public string ContactNo { get; set; }
        public string Email { get; set; }
        public string BankCode { get; set; }
        public List<BankBranch> BankBranches { get; set; }
    }
}
