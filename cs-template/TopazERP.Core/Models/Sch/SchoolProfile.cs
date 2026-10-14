using System;

namespace TopazERP.Models.Sch;

public class SchoolProfile: Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
    {
        public int TenantId { get; set; }
        public string SchoolName { get; set; }
        public string CountryName { get; set; }
        public string CityName { get; set; }
        public string CountryStateName { get; set; }
        public string PhoneNo { get; set; }
        public string Address { get; set; }
        public Guid CountryId { get; set; }
        public Guid CountryStateId { get; set; }
        public Guid CityId { get; set; }
        public string Email { get; set; }
        public string SenderId { get; set; }
        public string ClientId { get; set; }
        public string ClientSecret { get; set; }
        public string RegistrationNo { get; set; }
        public bool EnforceExamSecurity { get; set; }
        public int SchoolDays { get; set; }
        public string FaxNo { get; set; }
        public string Website { get; set; }
        public Guid CurrentAcademicYearId { get; set; }
        public string CurrentAcademicYearName { get; set; }
        public string SubMetro { get; set; }
        public string Circuit { get; set; }
        public Guid CurrentTermId { get; set; }
        public string CurrentTermName { get; set; }
        public Guid CurrencyId { get; set; }
        
        
        //email settings
        public string MailHostName { get; set; }
        public bool IsSSLEnabled { get; set; }
        public int PortNumber { get; set; }
        public string PrimaryEmailAddress { get; set; }
        public string EmailPassword { get; set; }
        
        //logo and signature
        public byte[] CompanyLogo { get; set; }
        public byte[] Signature { get; set; }
        public bool ShowSignature { get; set; }
        public string SchoolLogo { get; set; }
        public string SignatureUrl { get; set; }
        public bool ShowSignatureOnResults { get; set; }
        public bool ShowSignatureOnBills { get; set; }
        public bool ShowSignatureOnStatement { get; set; }
        public bool ShowSignatureOnReceipt { get; set; }
        
        // terminal report
        public bool IsClassPosition { get; set; }
        public bool IsSubjectPosition { get; set; }
    }
   