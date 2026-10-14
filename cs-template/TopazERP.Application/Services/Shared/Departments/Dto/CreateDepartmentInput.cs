using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Shared.Departments.Dto
{
    public class CreateDepartmentInput
    {
        public Guid ParentId { get; set; }
        public string Name { get; set; }
    }
}
