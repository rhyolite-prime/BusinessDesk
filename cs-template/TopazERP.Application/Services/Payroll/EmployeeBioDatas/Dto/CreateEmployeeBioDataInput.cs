using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Payroll.EmployeeBioDatas.Dto
{
   public class CreateEmployeeBioDataInput
    {
        public string EmployeeIdentifier { get; set; }
        public string FirstName { get; set; }
        public string OtherName { get; set; }
        public string LastName { get; set; }
        public string EmployeePhoto { get; set; }
        public string Gender { get; set; }
        public Guid StatusId { get; set; }
        public string StatusName { get; set; }

        public string Title { get; set; }
        public string ContractStatus { get; set; }
        public string ContractStartDate { get; set; }
        public string ContractEndDate { get; set; }
        public string JobTitle { get; set; }
        public string Designation { get; set; }

        public string CityOrLocation { get; set; }
        public string ResidenceAddress { get; set; }
        public Guid DepartmentId { get; set; }
        public string DepartmentName { get; set; }
        public Guid CategoryId { get; set; }
        public string CategoryName { get; set; }
        public DateTime DateAppointed { get; set; }
        public Guid SalaryGradeId { get; set; }
        public string SalaryGradeName { get; set; }
        public Guid SalaryNotchId { get; set; }
        public string SalaryNotchName { get; set; }
        public Guid RankId { get; set; }
        public string RankName { get; set; }
        public string TaxIdentificationNo { get; set; }

        // personal info
        public DateTime DateOfBirth { get; set; }
        public string PersonalEmail { get; set; }
        public string MaritalStatus { get; set; }
        public Guid ReligionId { get; set; }
        public string ReligionName { get; set; }
        public Guid NationalityId { get; set; }
        public string NationalityName { get; set; }
        public string Hometown { get; set; }

        // contact info
        public string PrimaryPhoneNumber { get; set; }
        public string SecondaryPhoneNumber { get; set; }
        public string CompanyEmail { get; set; }

        //HR related...
        public string NationalIdentificationNo { get; set; }
        public string NationalHealthInsuranceNo { get; set; }
        public string PassportNo { get; set; }
        public string PassportIssueDate { get; set; }
        public string PassportExpiryDate { get; set; }
        public string DriverLicenseNo { get; set; }
        public string LicenseIssueDate { get; set; }
        public string LicenseExpiryDate { get; set; }
        public string VotersIDNo { get; set; }
        public string NationalID { get; set; }
        public decimal Height { get; set; } //in meters
        public decimal Weight { get; set; } // in kg
        public string Languages { get; set; }  //separated by semi-colon
        public string Interests { get; set; }  //separated by semi-colon
        public string HealthIssues { get; set; }  //separated by semi-colon
        public int LeaveDaysEntitled { get; set; }

        //medical expenses settings...
        public decimal MedicalExpensesLimit { get; set; }
        //branch details
        public int UserId { get; set; }
    }

    public class ImportEmployeeBioDataInput
    {
        public string EmployeeIdentifier { get; set; }
        public string FirstName { get; set; }
        public string OtherName { get; set; }
        public string LastName { get; set; }
        public string EmployeePhoto { get; set; }
        public string PersonalEmail { get; set; }
        public string Gender { get; set; }
        public string CategoryName { get; set; }
        public string CityOrLocation { get; set; }
        public string CompanyEmail { get; set; }
        public DateTime DateAppointed { get; set; }
        public DateTime DateOfBirth { get; set; }
        public string DepartmentName { get; set; }
        public string DriverLicenseNo { get; set; }
        public string Hometown { get; set; }
        public string NationalityName { get; set; }
        public string MaritalStatus { get; set; }
        public string NationalIdentificationNo { get; set; }
        public string NationalID { get; set; }
        public string ReligionName { get; set; }
        public string ResidenceAddress { get; set; }
        public string SalaryGradeName { get; set; }
        public string SalaryNotchName { get; set; }
        public string PrimaryPhoneNumber { get; set; }
        public string SecondaryPhoneNumber { get; set; }
        public string StatusName { get; set; }
        public string TaxIdentificationNo { get; set; }
        public string Title { get; set; }
        public string ContractStatus { get; set; }
        public string ContractStartDate { get; set; }
        public string ContractEndDate { get; set; }
        public string JobTitle { get; set; }
        public string Designation { get; set; }

    }
}
