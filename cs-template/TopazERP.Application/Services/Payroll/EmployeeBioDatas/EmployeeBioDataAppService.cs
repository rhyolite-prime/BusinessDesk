using AutoMapper;
using TopazERP.DomainServices.Payroll.EmployeeBioDatas;
using TopazERP.DomainServices.Payroll.EmployeeBioDatas.Dto;
using TopazERP.Models.Payroll;
using TopazERP.Services.Payroll.EmployeeBioDatas.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using TopazERP.DomainServices.Payroll.EmployeeCategories;
using TopazERP.DomainServices.Shared.Departments;
using TopazERP.DomainServices.Shared.Religions;
using TopazERP.DomainServices.Payroll.SalaryGrades;
using TopazERP.DomainServices.Shared.Countries;
using TopazERP.DomainServices.Shared.PersonnelStatuses;

namespace TopazERP.Services.Payroll.EmployeeBioDatas
{
   public class EmployeeBioDataAppService: TopazERPAppServiceBase, IEmployeeBioDataAppService
    {
        private readonly IEmployeeBioDataManager _employeeBioDataManager;
        private readonly IEmployeeCategoryManager _employeeCategoryManager;
        private readonly IDepartmentManager _departmentManager;
        private readonly IReligionManager _religionManager;
        private readonly ISalaryGradeManager _salaryGradeManager;
        private readonly IPersonnelStatusManager _personnelStatusManager;
        private readonly ICountryManager _countryManager;
        private readonly IMapper _mapper;

        public EmployeeBioDataAppService(IEmployeeBioDataManager employeeBioDataManager, IMapper mapper, IEmployeeCategoryManager employeeCategoryManager, IDepartmentManager departmentManager, IReligionManager religionManager, IPersonnelStatusManager personnelStatusManager, ICountryManager countryManager, ISalaryGradeManager salaryGradeManager)
        {
            _employeeBioDataManager = employeeBioDataManager;
            _mapper = mapper;
            _employeeCategoryManager = employeeCategoryManager;
            _departmentManager = departmentManager;
            _religionManager = religionManager;
            _personnelStatusManager = personnelStatusManager;
            _countryManager = countryManager;
            _salaryGradeManager = salaryGradeManager;
        }

        /// <summary>
        /// 
        /// </summary>
        /// <returns></returns>
        public async Task<object> ListAll()
        {
            return await _employeeBioDataManager.ListAll();
        }

        /// <summary>
        /// 
        /// </summary>
        /// <param name="input"></param>
        /// <returns></returns>
        public async Task<object> Create(CreateEmployeeBioDataInput input)
        {
            var obj = _mapper.Map<EmployeeBioData>(input);
            return await _employeeBioDataManager.Create(obj);
        }

        /// <summary>
        /// 
        /// </summary>
        /// <param name="inputList"></param>
        public async Task Import(List<ImportEmployeeBioDataInput> inputList)
        {
            foreach (var input in inputList)
            {
                var categoryInfo = await _employeeCategoryManager.GetAsync(input.CategoryName);
                var departmentInfo = await _departmentManager.GetAsync(input.DepartmentName);
                var religionInfo = await _religionManager.GetAsync(input.ReligionName);
                var salaryGradeInfo = await _salaryGradeManager.GetAsync(input.SalaryGradeName);
                var statusInfo = await _personnelStatusManager.GetAsync(input.StatusName);
                var nationalityInfo = await _countryManager.GetNationality(input.NationalityName);

                var salaryNotchId = Guid.Empty;

                if (salaryGradeInfo != null)
                {
                    var salaryNotchList = salaryGradeInfo.SalaryNotches;

                    var salaryNotchInfo = salaryNotchList.FirstOrDefault(x=> x.Notch == input.SalaryNotchName);

                    if(salaryNotchInfo != null)
                    {
                        salaryNotchId = salaryNotchInfo.Id;
                    }

                }

                var employeeBioData = new CreateEmployeeBioDataInput
                {
                     CategoryId= categoryInfo?.Id ?? Guid.Empty,
                     CategoryName= input.CategoryName,
                     CityOrLocation = input.CityOrLocation,
                     DepartmentId = departmentInfo?.Id ?? Guid.Empty,
                     DepartmentName= input.DepartmentName,
                     ReligionId = religionInfo?.Id ?? Guid.Empty,
                     ReligionName = input.ReligionName,
                     CompanyEmail= input.CompanyEmail,
                     DateAppointed= input.DateAppointed,
                     DateOfBirth= input.DateOfBirth,
                     DriverLicenseNo = input.DriverLicenseNo,
                     EmployeeIdentifier = input.EmployeeIdentifier,
                     EmployeePhoto = input.EmployeePhoto, 
                     FirstName = input.FirstName, 
                     Gender= input.Gender, 
                     LastName = input.LastName,
                     MaritalStatus= input.MaritalStatus, 
                     OtherName = input.OtherName, 
                     PersonalEmail = input.PersonalEmail, 
                     ResidenceAddress = input.ResidenceAddress, 
                     NationalID= input.NationalID,
                     StatusId = statusInfo != null ? statusInfo.Id : Guid.Empty,
                     StatusName= input.StatusName,
                     Hometown = input.Hometown,
                     TaxIdentificationNo = input.TaxIdentificationNo, 
                     PrimaryPhoneNumber = input.PrimaryPhoneNumber,
                     SalaryGradeId = salaryGradeInfo?.Id ?? Guid.Empty,
                     SalaryGradeName = input.SalaryGradeName,
                     SalaryNotchId = salaryNotchId,
                     SecondaryPhoneNumber= input.SecondaryPhoneNumber, 
                     SalaryNotchName = input.SalaryNotchName, 
                     NationalityId = nationalityInfo?.Id ?? Guid.Empty,
                     NationalityName = input.NationalityName,
                     Title= input.Title,
                     JobTitle = input.JobTitle,
                     Designation = input.Designation,
                     ContractEndDate= input.ContractEndDate,
                     ContractStartDate= input.ContractStartDate, 
                     ContractStatus= input.ContractStatus, 
                     UserId = 0, Height = 0, Weight = 0, LeaveDaysEntitled = 0, 
                     MedicalExpensesLimit = 0,
                };
                var obj = _mapper.Map<EmployeeBioData>(employeeBioData);
                await _employeeBioDataManager.Create(obj);
            }
        }

        public async Task Update(UpdateEmployeeBioDataInput input)
        {
            var obj = _mapper.Map<EmployeeBioData>(input);
            await _employeeBioDataManager.Update(obj);
        }

        public async Task Delete(Guid id)
        {
            await _employeeBioDataManager.Delete(id);

        }

        public async Task UpdateStatus(Guid employeeId, Guid statusId)
        {
            await _employeeBioDataManager.UpdateStatus(employeeId, statusId);
        }

        // export ...
        public async Task<IEnumerable<AllowanceExportDto>> ExportAllowances()
        {
            return await _employeeBioDataManager.ExportAllowances();
        }

        public async Task<IEnumerable<BenefitsExportDto>> ExportBenefitsInKind()
        {
            return await _employeeBioDataManager.ExportBenefitsInKind();
        }

        public async Task<IEnumerable<SalaryInfoDto>> ExportSalaryInfo()
        {
            return await _employeeBioDataManager.ExportSalaryInfo();
        }

        public async Task<IEnumerable<SsnitExportDto>> ExportSsnit()
        {
            return await _employeeBioDataManager.ExportSsnit();
        }

        public async Task<IEnumerable<DeductionsExportDto>> ExportDeductions()
        {
            return await _employeeBioDataManager.ExportDeductions();

        }

        public async Task<IEnumerable<EmployeeLoansExportDto>> ExportEmployeeLoans()
        {
            return await _employeeBioDataManager.ExportEmployeeLoans();

        }

        
        

    }
}
