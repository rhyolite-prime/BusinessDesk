using Abp.Application.Services.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Shared.Customers.Dto
{
    public class UpdateCustomerInput:EntityDto<Guid>
    {
        public string AccountNumber { get; set; }
        public Guid CustomerGroupId { get; set; }
        public string CustomerGroupName { get; set; }
        public string Status { get; set; }
        public Guid StatusId { get; set; }
        public decimal Balance { get; set; }
        public string VatNumber { get; set; }
        public Guid VatAccountId { get; set; }
        public string VatAccountName { get; set; }
        public Guid CreditAccountId { get; set; }
        public string CreditAccountName { get; set; }
        public string TinNumber { get; set; }
        public string Name { get; set; }
        public string Email { get; set; }
        public string PhoneNo { get; set; }
        public string Address { get; set; }
        public Guid CurrencyId { get; set; }
        public string CurrencyName { get; set; }
        public string CurrencyCode { get; set; }
        public decimal BuyingRate { get; set; }
        public decimal SellingRate { get; set; }
        
        public decimal CreditLimit { get; set; }
        public Guid IrsAccountId { get; set; }
        public string IrsAccountName { get; set; }
        public string ContactPerson { get; set; }
        public string ContactPersonPhone { get; set; }
        public string ContactPersonEmail { get; set; }
        public int TenantId { get; set; }
    }
}
