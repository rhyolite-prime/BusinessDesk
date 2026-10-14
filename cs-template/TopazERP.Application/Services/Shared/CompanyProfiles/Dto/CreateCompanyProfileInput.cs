using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Shared.CompanyProfiles.Dto
{
    public class CreateCompanyProfileInput
    {
        public string CompanyName { get; set; }
        public string CountryName { get; set; }
        public string CityName { get; set; }
        public string PhoneNo { get; set; }
        public string Address { get; set; }
        public Guid CountryId { get; set; }
        public Guid CountryStateId { get; set; }
        public string CompanyTin { get; set; }
        public string Email { get; set; }
        public string SenderId { get; set; }
        public string ClientId { get; set; }
        public string ClientSecret { get; set; }
        public int FirstMonthOfFiscalYear { get; set; }
        public string VATNo { get; set; }

        //Social Security Rates...
        public string EmployerSocialSecurityNo { get; set; }
        public bool PaySocialSecurityFund { get; set; }
        public decimal SocialSecurityFundEmployeeRate { get; set; }
        public decimal SocialSecurityFundEmployerRate { get; set; }

        //Provident Fund Rates...
        public bool PayProvidentFund { get; set; }
        public decimal ProvidentFundEmployeeRate { get; set; }
        public decimal ProvidentFundEmployerRate { get; set; }
        public bool ProvidentFundTreatAsSocialSecurityFund { get; set; }
        public bool ProvidentFundTaxEmployerPortion { get; set; }

        // 2nd provident fund
        public bool PaySecondProvidentOrOthers { get; set; }
        public decimal SecondProvidentEmployeeRate { get; set; }
        public decimal SecondProvidentEmployerRate { get; set; }
        public bool TreatSecondProvidentAsSsf { get; set; }
        public bool SecondProvidentTaxEmployerPortion { get; set; }

        //Overtime Percentage...
        public bool OvertimePercentageOnBasicSalary { get; set; }
        public bool OvertimePercentageOnDailyWage { get; set; }

        public Guid DefaultCurrenyId { get; set; }
        //email settings
        public string MailHostName { get; set; }
        public bool IsSSLEnabled { get; set; }
        public int PortNumber { get; set; }
        public string PrimaryEmailAddress { get; set; }
        public string EmailPassword { get; set; }
        public string IsTaxLeviesInclusive { get; set; }
        public bool ApproveInvoiceBeforePayment { get; set; }
        public string CompanyLogoBase64 { get; set; }
        public string CompanyLogoUrl { get; set; }
        
        public bool EnforceOu { get; set; }
        
        
    }
}
