using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using TopazERP.Controllers;
using Syncfusion.XlsIO;
using System.Data;
using System.Threading.Tasks;
using System;
using System.IO;
using Microsoft.AspNetCore.Hosting;
using TopazERP.Services.Payroll.AllowanceTypes;
using TopazERP.Services.Payroll.DeductionTypes;
using TopazERP.Services.Payroll.BikTypes;
using TopazERP.Services.Payroll.EmployeeCategories;
using TopazERP.Services.Payroll.EmployeeBioDatas;
using TopazERP.Services.Payroll.EmployeeAllowances;
using System.Collections.Generic;
using Abp.Authorization;
using TopazERP.Authorization;
using TopazERP.Services.Payroll.EmployeeAllowances.Dto;
using TopazERP.Services.Payroll.LoanTypes;
using TopazERP.Services.Payroll.EmployeeSalaryInfos.Dto;
using TopazERP.Services.Payroll.EmployeeSalaryInfos;
using TopazERP.Services.Payroll.EmployeeSnits.Dto;
using TopazERP.Services.Payroll.EmployeeSnits;
using TopazERP.Services.Payroll.EmployeeDeductions.Dto;
using TopazERP.Services.Payroll.EmployeeDeductions;
using TopazERP.Services.Payroll.EmployeeBioDatas.Dto;
using TopazERP.Services.Payroll.EmployeeBenefitInKinds;
using TopazERP.Services.Payroll.EmployeeBenefitInKinds.Dto;
using TopazERP.Services.Payroll.EmployeeLoans.Dto;
using TopazERP.Services.Payroll.EmployeeLoans;

namespace TopazERP.Web.Controllers
{
    [AbpAuthorize(PermissionNames.Payroll_PayrollImportData)]
    public class PayrollImportDataController : TopazERPControllerBase
    {
        private readonly IWebHostEnvironment _env;
        private readonly IAllowanceTypeAppService _allowanceTypeAppService;
        private readonly IDeductionTypeAppService _deductionTypeAppService;
        private readonly IBikTypeAppService _bikTypeAppService;
        private readonly IEmployeeCategoryAppService _employeeCategoryAppService;
        private readonly IEmployeeBioDataAppService _employeeBioDataAppService;
        private readonly IEmployeeAllowanceAppService _employeeAllowanceAppService;
        private readonly ILoanTypeAppService _loanTypeAppService;
        private readonly IEmployeeSalaryInfoAppService _employeeSalaryInfoAppService;
        private readonly IEmployeeSnitAppService _employeeSnitAppService;
        private readonly IEmployeeDeductionAppService _employeeDeductionAppService;
        private readonly IEmployeeBenefitInKindAppService _employeeBenefitInKindAppService;
        private readonly IEmployeeLoanAppService _employeeLoanAppService;
        public PayrollImportDataController(IWebHostEnvironment env, IAllowanceTypeAppService allowanceTypeAppService, IDeductionTypeAppService deductionTypeAppService, IBikTypeAppService bikTypeAppService, IEmployeeCategoryAppService employeeCategoryAppService, IEmployeeBioDataAppService employeeBioDataAppService, IEmployeeAllowanceAppService employeeAllowanceAppService, ILoanTypeAppService loanTypeAppService, IEmployeeSalaryInfoAppService employeeSalaryInfoAppService, IEmployeeSnitAppService employeeSnitAppService, IEmployeeDeductionAppService employeeDeductionAppService, IEmployeeBenefitInKindAppService employeeBenefitInKindAppService, IEmployeeLoanAppService employeeLoanAppService)
        {
            _env = env;
            _allowanceTypeAppService = allowanceTypeAppService;
            _deductionTypeAppService = deductionTypeAppService;
            _bikTypeAppService = bikTypeAppService;
            _employeeCategoryAppService = employeeCategoryAppService;
            _employeeBioDataAppService = employeeBioDataAppService;
            _employeeAllowanceAppService = employeeAllowanceAppService;
            _loanTypeAppService = loanTypeAppService;
            _employeeSalaryInfoAppService = employeeSalaryInfoAppService;
            _employeeSnitAppService = employeeSnitAppService;
            _employeeDeductionAppService = employeeDeductionAppService;
            _employeeBenefitInKindAppService = employeeBenefitInKindAppService;
            _employeeLoanAppService = employeeLoanAppService;
        }

        [AbpAuthorize(PermissionNames.Payroll_PayrollImportData_AllowanceTypes)]
        public IActionResult AllowancesTypes()
        {
            return View();
        }

        [AbpAuthorize(PermissionNames.Payroll_PayrollImportData_DeductionTypes)]
        public IActionResult DeductionTypes()
        {
            return View();
        }

        [AbpAuthorize(PermissionNames.Payroll_PayrollImportData_BenefitsInKindTypes)]
        public IActionResult BenefitsInKindTypes()
        {
            return View();
        }

        [AbpAuthorize(PermissionNames.Payroll_PayrollImportData_Employees)]
        public IActionResult Employees()
        {
            return View();
        }

        [AbpAuthorize(PermissionNames.Payroll_PayrollImportData_EmployeeAllowances)]
        public IActionResult EmployeeAllowances()
        {
            return View();
        }
        
        [AbpAuthorize(PermissionNames.Payroll_PayrollImportData_EmployeeDeductions)]
        public IActionResult EmployeeDeductions()
        {
            return View();
        }

        [AbpAuthorize(PermissionNames.Payroll_PayrollImportData_EmployeeCategories)]
        public IActionResult EmployeeCategories()
        {
            return View();
        }

        [AbpAuthorize(PermissionNames.Payroll_PayrollImportData_LoanTypes)]
        public IActionResult LoanTypes()
        {
            return View();
        }

        [AbpAuthorize(PermissionNames.Payroll_PayrollImportData_EmployeeSalaryInfo)]
        public IActionResult SalaryInfo()
        {
            return View();
        }

        [AbpAuthorize(PermissionNames.Payroll_PayrollImportData_EmployeeBenefitsInKind)]
        public IActionResult EmployeeBenefitsInKind()
        {
            return View();
        }

        [AbpAuthorize(PermissionNames.Payroll_PayrollImportData_EmployeeLoans)]
        public IActionResult EmployeeLoans()
        {
            return View();
        }

        [AbpAuthorize(PermissionNames.Payroll_PayrollImportData_EmployeeSnit)]
        public IActionResult Ssnit()
        {
            return View();
        }

        //api
        [HttpPost]
        public async Task<IActionResult> UploadAllowanceTypes(IFormFile customFile)
        {

            //read data from excel file
            ExcelEngine excelEngine = new ExcelEngine();
            //Loads or open an existing workbook through Open method of IWorkbooks
            IWorkbook workbook = excelEngine.Excel.Workbooks.Open(customFile.OpenReadStream());
            IWorksheet worksheet = workbook.Worksheets[0];

            // Read data from the worksheet and Export to the DataTable.

            DataTable excelTable = worksheet.ExportDataTable(worksheet.UsedRange, ExcelExportDataTableOptions.ColumnNames);

            for (int i = 0; i < excelTable.Rows.Count; i++)
            {
                var row = excelTable.Rows[i];

                await _allowanceTypeAppService.Create(new Services.Payroll.AllowanceTypes.Dto.CreateAllowanceTypeInput
                {
                    Name= row.Table.Columns.Contains("Name") ? row["Name"].ToString().Trim() : string.Empty,
                    ExpenseAccountId = Guid.Empty,
                    AllowanceDays = 0, 
                    Taxable = row.Table.Columns.Contains("Is Taxable") && row["Is Taxable"].ToString().Trim() == "Yes", 
                    ExpenseAccountName = string.Empty
                });

            }

            return View("AllowancesTypes", excelTable);
        }

        public async Task<IActionResult> DownloadAllowanceTypesUploadSample()
        {
            var wwwRoot = _env.WebRootPath;

            byte[] fileBytes = await System.IO.File.ReadAllBytesAsync(Path.Combine(wwwRoot + "/DataSample/", "AllowanceTypes_Sample.xlsx"));
            return File(fileBytes, "application/ms-excel", "AllowanceTypes_Sample.xlsx");

        }


        [HttpPost]
        public async Task<IActionResult> UploadDeductionTypes(IFormFile customFile)
        {

            //read data from excel file
            ExcelEngine excelEngine = new ExcelEngine();
            //Loads or open an existing workbook through Open method of IWorkbooks
            IWorkbook workbook = excelEngine.Excel.Workbooks.Open(customFile.OpenReadStream());
            IWorksheet worksheet = workbook.Worksheets[0];

            // Read data from the worksheet and Export to the DataTable.

            DataTable excelTable = worksheet.ExportDataTable(worksheet.UsedRange, ExcelExportDataTableOptions.ColumnNames);

            for (int i = 0; i < excelTable.Rows.Count; i++)
            {

                var row = excelTable.Rows[i];

                await _deductionTypeAppService.Create(new Services.Payroll.DeductionTypes.Dto.CreateDeductionTypeInput
                {
                    Name = row.Table.Columns.Contains("Name") ? row["Name"].ToString().Trim() : string.Empty,
                    AccountId = Guid.Empty
                });

            }

            return View("DeductionTypes", excelTable);
        }


        public async Task<IActionResult> DownloadDeductionTypesUploadSample()
        {
            var wwwRoot = _env.WebRootPath;

            byte[] fileBytes = await System.IO.File.ReadAllBytesAsync(Path.Combine(wwwRoot + "/DataSample/", "DeductionTypes_Sample.xlsx"));
            return File(fileBytes, "application/ms-excel", "DeductionTypes_Sample.xlsx");

        }

        [HttpPost]
        public async Task<IActionResult> UploadBenefitsInKindTypes(IFormFile customFile)
        {

            //read data from excel file
            ExcelEngine excelEngine = new ExcelEngine();
            //Loads or open an existing workbook through Open method of IWorkbooks
            IWorkbook workbook = excelEngine.Excel.Workbooks.Open(customFile.OpenReadStream());
            IWorksheet worksheet = workbook.Worksheets[0];

            // Read data from the worksheet and Export to the DataTable.

            DataTable excelTable = worksheet.ExportDataTable(worksheet.UsedRange, ExcelExportDataTableOptions.ColumnNames);

            for (int i = 0; i < excelTable.Rows.Count; i++)
            {
                var row = excelTable.Rows[i];

                await _bikTypeAppService.Create(new Services.Payroll.BikTypes.Dto.CreateBikTypeInput
                {
                    Name = row.Table.Columns.Contains("Name") ? row["Name"].ToString().Trim() : string.Empty,
                    ExpenseAccountId = Guid.Empty, 
                    Taxable = row.Table.Columns.Contains("Is Taxable") && row["Is Taxable"].ToString().Trim() == "Yes", 

                });

            }

            return View("BenefitsInKindTypes", excelTable);
        }


        public async Task<IActionResult> DownloadBenefitsInKindTypesUploadSample()
        {
            var wwwRoot = _env.WebRootPath;

            byte[] fileBytes = await System.IO.File.ReadAllBytesAsync(Path.Combine(wwwRoot + "/DataSample/", "BenefitInKindTypes_Sample.xlsx"));
            return File(fileBytes, "application/ms-excel", "BenefitInKindTypes_Sample.xlsx");

        }


        [HttpPost]
        public async Task<IActionResult> UploadEmployeeBenefitsInKind(IFormFile customFile)
        {

            //read data from excel file
            ExcelEngine excelEngine = new ExcelEngine();
            //Loads or open an existing workbook through Open method of IWorkbooks
            IWorkbook workbook = excelEngine.Excel.Workbooks.Open(customFile.OpenReadStream());
            IWorksheet worksheet = workbook.Worksheets[0];

            // Read data from the worksheet and Export to the DataTable.

            DataTable excelTable = worksheet.ExportDataTable(worksheet.UsedRange, ExcelExportDataTableOptions.ColumnNames);

            List<ImportEmployeeBenefitInKindInput> employeeBenefitInKindList = new List<ImportEmployeeBenefitInKindInput>();

            for (int i = 0; i < excelTable.Rows.Count; i++)
            {
                var row = excelTable.Rows[i];

                var employeeBenefitInKind = new ImportEmployeeBenefitInKindInput
                {
                    EmployeeIdentifier = row.Table.Columns.Contains("Staff No.") ? row["Staff No."].ToString().Trim() : string.Empty,
                    EmployeeName = row.Table.Columns.Contains("Name") ? row["Name"].ToString().Trim() : string.Empty,
                    BenefitInKindTypeName = row.Table.Columns.Contains("Benefit In Kind Type") ? row["Benefit In Kind Type"].ToString().Trim() : string.Empty,
                    Amount = row.Table.Columns.Contains("Amount") ? Convert.ToDecimal(row["Amount"].ToString().Trim()) : 0,
                };

                employeeBenefitInKindList.Add(employeeBenefitInKind);

            }

            await _employeeBenefitInKindAppService.Import(employeeBenefitInKindList);

            return View("EmployeeBenefitsInKind", excelTable);
        }

        public async Task<IActionResult> DownloadEmployeeBenefitsInKindTypesUploadSample()
        {
            var wwwRoot = _env.WebRootPath;

            string fullPath = Path.Combine(wwwRoot + "/DataSample/", $"EmployeeBenefitInKindTypes_Sample{DateTime.UtcNow:dd-MMM-yyyy-hh-mm-ss}.xlsx");

            using (ExcelEngine excelEngine = new ExcelEngine())
            {
                IApplication application = excelEngine.Excel;
                application.DefaultVersion = ExcelVersion.Excel2016;
                IWorkbook workbook = application.Workbooks.Create(1);
                IWorksheet worksheet = workbook.Worksheets[0];

                //Import the data to worksheet
                var results = await _employeeBioDataAppService.ExportBenefitsInKind();
                worksheet.ImportData(results, 1, 1, true);

                //Saving the workbook as stream
                FileStream stream = new FileStream(fullPath, FileMode.Create, FileAccess.ReadWrite);
                workbook.SaveAs(stream);
                await stream.DisposeAsync();
            }


            byte[] fileBytes = await System.IO.File.ReadAllBytesAsync(fullPath);
            return File(fileBytes, "application/ms-excel", "EmployeeBenefitInKindTypes_Sample.xlsx");

        }



        [HttpPost]
        public async Task<IActionResult> UploadEmployeeCategories(IFormFile customFile)
        {

            //read data from excel file
            ExcelEngine excelEngine = new ExcelEngine();
            //Loads or open an existing workbook through Open method of IWorkbooks
            IWorkbook workbook = excelEngine.Excel.Workbooks.Open(customFile.OpenReadStream());
            IWorksheet worksheet = workbook.Worksheets[0];

            // Read data from the worksheet and Export to the DataTable.

            DataTable excelTable = worksheet.ExportDataTable(worksheet.UsedRange, ExcelExportDataTableOptions.ColumnNames);

            for (int i = 0; i < excelTable.Rows.Count; i++)
            {
                var row = excelTable.Rows[i];

                await _employeeCategoryAppService.Create(new Services.Payroll.EmployeeCategories.Dto.CreateEmployeeCategoryInput
                {
                    Name = row.Table.Columns.Contains("Name") ? row["Name"].ToString().Trim() : string.Empty,

                });

            }

            return View("EmployeeCategories", excelTable);
        }

        public async Task<IActionResult> DownloadEmployeeCategoriesUploadSample()
        {
            var wwwRoot = _env.WebRootPath;

            byte[] fileBytes = await System.IO.File.ReadAllBytesAsync(Path.Combine(wwwRoot + "/DataSample/", "EmployeeCategories_Sample.xlsx"));
            return File(fileBytes, "application/ms-excel", "EmployeeCategories_Sample.xlsx");

        }

        [HttpPost]
        public async Task<IActionResult> UploadEmployees(IFormFile customFile)
        {

            try
            {
                //read data from excel file
                ExcelEngine excelEngine = new ExcelEngine();
                //Loads or open an existing workbook through Open method of IWorkbooks
                IWorkbook workbook = excelEngine.Excel.Workbooks.Open(customFile.OpenReadStream());
                IWorksheet worksheet = workbook.Worksheets[0];

                List<ImportEmployeeBioDataInput> employeeBioDataInputList = new List<ImportEmployeeBioDataInput>();

                // Read data from the worksheet and Export to the DataTable.

                DataTable excelTable = worksheet.ExportDataTable(worksheet.UsedRange, ExcelExportDataTableOptions.ColumnNames);

                for (int i = 0; i < excelTable.Rows.Count; i++)
                {
                    var row = excelTable.Rows[i];

                    var bioData = new ImportEmployeeBioDataInput
                    {
                        FirstName = row.Table.Columns.Contains("First Name") ? row["First Name"].ToString().Trim() : string.Empty,
                        LastName = row.Table.Columns.Contains("Last name") ? row["Last name"].ToString().Trim() : string.Empty,
                        OtherName = row.Table.Columns.Contains("Other Name") ? row["Other Name"].ToString().Trim() : string.Empty,
                        EmployeeIdentifier = row.Table.Columns.Contains("STAFF No.") ? row["STAFF No."].ToString().Trim() : string.Empty,
                        PrimaryPhoneNumber = row.Table.Columns.Contains("Phone No") ? row["Phone No"].ToString().Trim() : string.Empty,
                        PersonalEmail = row.Table.Columns.Contains("Email") ? row["Email"].ToString().Trim() : string.Empty,
                        Gender = row.Table.Columns.Contains("Sex") ? row["Sex"].ToString().Trim() : string.Empty,

                        CategoryName = row.Table.Columns.Contains("Category") ? row["Category"].ToString().Trim() : string.Empty,
                        CityOrLocation = row.Table.Columns.Contains("Location") ? row["Location"].ToString().Trim() : string.Empty,
                        CompanyEmail = row.Table.Columns.Contains("Company Email") ? row["Company Email"].ToString().Trim() : string.Empty,
                        DateAppointed = row.Table.Columns.Contains("Appointment Date") && DateTime.TryParse(row["Appointment Date"].ToString().Trim(), out DateTime dateAppointed) ? dateAppointed : DateTime.UtcNow,
                        DateOfBirth = row.Table.Columns.Contains("Date of birth") && DateTime.TryParse(row["Date of birth"].ToString().Trim(), out DateTime dateOfBirth) ? dateOfBirth : DateTime.UtcNow,
                        
                        DepartmentName = row.Table.Columns.Contains("Department") ? row["Department"].ToString().Trim() : string.Empty,
                        DriverLicenseNo = row.Table.Columns.Contains("Driver's License Number") ? row["Driver's License Number"].ToString().Trim() : string.Empty,
                        EmployeePhoto = row.Table.Columns.Contains("Employee Photo") ? row["Employee Photo"].ToString().Trim() : string.Empty,
                        Hometown = row.Table.Columns.Contains("Hometown") ? row["Hometown"].ToString().Trim() : string.Empty,
                        NationalityName = row.Table.Columns.Contains("Nationality") ? row["Nationality"].ToString().Trim() : string.Empty,
                        MaritalStatus = row.Table.Columns.Contains("Marital Status") ? row["Marital Status"].ToString().Trim() : string.Empty,
                        NationalID = row.Table.Columns.Contains("National ID") ? row["National ID"].ToString().Trim() : string.Empty,
                        ReligionName = row.Table.Columns.Contains("Religion") ? row["Religion"].ToString().Trim() : string.Empty,
                        ResidenceAddress = row.Table.Columns.Contains("Residence Address") ? row["Residence Address"].ToString().Trim() : string.Empty,
                        SalaryGradeName = row.Table.Columns.Contains("Salary Grade") ? row["Salary Grade"].ToString().Trim() : string.Empty,
                        SalaryNotchName = row.Table.Columns.Contains("Salary Notch") ? row["Salary Notch"].ToString().Trim() : string.Empty,
                        SecondaryPhoneNumber = row.Table.Columns.Contains("Secondary Phone Number") ? row["Secondary Phone Number"].ToString().Trim() : string.Empty,
                        StatusName = row.Table.Columns.Contains("Employment status") ? row["Employment status"].ToString().Trim() : string.Empty,
                        TaxIdentificationNo = row.Table.Columns.Contains("Tax Identification Number") ? row["Tax Identification Number"].ToString().Trim() : string.Empty,
                        //extra fields
                        Title = row.Table.Columns.Contains("Title") ? row["Title"].ToString().Trim() : string.Empty,
                        ContractStatus = row.Table.Columns.Contains("Contract status") ? row["Contract status"].ToString().Trim() : string.Empty,
                        ContractStartDate = row.Table.Columns.Contains("Contract Start Date") ? row["Contract Start Date"].ToString().Trim() : string.Empty,
                        ContractEndDate = row.Table.Columns.Contains("Contract End Date") ? row["Contract End Date"].ToString().Trim() : string.Empty,
                        JobTitle = row.Table.Columns.Contains("JobTitle") ? row["JobTitle"].ToString().Trim() : string.Empty,
                        Designation = row.Table.Columns.Contains("Designation") ? row["Designation"].ToString().Trim() : string.Empty,

                    };

                    employeeBioDataInputList.Add(bioData);
                }

                await _employeeBioDataAppService.Import(employeeBioDataInputList);

                return View("Employees", excelTable);

            }
            catch (Exception ex)
            {

                Logger.Info($"{ex.StackTrace}\n{ex.Message}");
                return View("Employees", null);

            }


        }

        public async Task<IActionResult> DownloadEmployeesUploadSample()
        {
            var wwwRoot = _env.WebRootPath;

            byte[] fileBytes = await System.IO.File.ReadAllBytesAsync(Path.Combine(wwwRoot + "/DataSample/", "Employees_Sample.xlsx"));
            return File(fileBytes, "application/ms-excel", "Employees_Sample.xlsx");

        }


        [HttpPost]
        public async Task<IActionResult> UploadEmployeeAllowances(IFormFile customFile)
        {

            //read data from excel file
            ExcelEngine excelEngine = new ExcelEngine();
            //Loads or open an existing workbook through Open method of IWorkbooks
            IWorkbook workbook = excelEngine.Excel.Workbooks.Open(customFile.OpenReadStream());
            IWorksheet worksheet = workbook.Worksheets[0];

            // Read data from the worksheet and Export to the DataTable.

            DataTable excelTable = worksheet.ExportDataTable(worksheet.UsedRange, ExcelExportDataTableOptions.ColumnNames);

            List<ImportEmployeeAllowanceInput> employeeAllowanceList = new List<ImportEmployeeAllowanceInput>();

            for (int i = 0; i < excelTable.Rows.Count; i++)
            {
                var row = excelTable.Rows[i];

                var employeeAllowance = new ImportEmployeeAllowanceInput
                {
                    EmployeeIdentifier = row.Table.Columns.Contains("Employee ID") ? row["Employee ID"].ToString().Trim() : string.Empty, 
                    AllowanceDays = row.Table.Columns.Contains("Allowance Days") ? Convert.ToInt32(row["Allowance Days"].ToString().Trim()) : 0,
                    AllowanceTypeName = row.Table.Columns.Contains("Allowance Type") ? row["Allowance Type"].ToString().Trim() : string.Empty,
                    Amount = row.Table.Columns.Contains("Amount") ? Convert.ToDecimal(row["Amount"].ToString().Trim()) : 0, 
                    Taxable = row.Table.Columns.Contains("Is Taxable") && row["Is Taxable"].ToString().Trim() == "Yes",
                };

                employeeAllowanceList.Add(employeeAllowance);
               
            }

            await _employeeAllowanceAppService.Import(employeeAllowanceList);

            return View("EmployeeAllowances", excelTable);
        }


        public async Task<IActionResult> DownloadEmployeeAllowancesUploadSample()
        {
            var wwwRoot = _env.WebRootPath;

            string fullPath = Path.Combine(wwwRoot + "/DataSample/", $"EmployeeAllowances_Sample_{DateTime.UtcNow:dd-MMM-yyyy-hh-mm-ss}.xlsx");

            using (ExcelEngine excelEngine = new ExcelEngine())
            {
                IApplication application = excelEngine.Excel;
                application.DefaultVersion = ExcelVersion.Excel2016;
                IWorkbook workbook = application.Workbooks.Create(1);
                IWorksheet worksheet = workbook.Worksheets[0];

                //Import the data to worksheet
                var results = await _employeeBioDataAppService.ExportAllowances();
                worksheet.ImportData(results, 1, 1, true);

                //Saving the workbook as stream
                FileStream stream = new FileStream(fullPath, FileMode.Create, FileAccess.ReadWrite);
                workbook.SaveAs(stream);
                await stream.DisposeAsync();
            }


            byte[] fileBytes = await System.IO.File.ReadAllBytesAsync(fullPath);
            return File(fileBytes, "application/ms-excel", "EmployeeAllowances_Sample.xlsx");

        }

        
        

        [HttpPost]
        public async Task<IActionResult> UploadEmployeeDeductions(IFormFile customFile)
        {

            //read data from excel file
            ExcelEngine excelEngine = new ExcelEngine();
            //Loads or open an existing workbook through Open method of IWorkbooks
            IWorkbook workbook = excelEngine.Excel.Workbooks.Open(customFile.OpenReadStream());
            IWorksheet worksheet = workbook.Worksheets[0];

            // Read data from the worksheet and Export to the DataTable.

            DataTable excelTable = worksheet.ExportDataTable(worksheet.UsedRange, ExcelExportDataTableOptions.ColumnNames);

            List<ImportEmployeeDeductionInput> employeeDeductionList = new List<ImportEmployeeDeductionInput>();

            for (int i = 0; i < excelTable.Rows.Count; i++)
            {
                var row = excelTable.Rows[i];

                var employeeDeduction = new ImportEmployeeDeductionInput
                {
                    EmployeeIdentifier = row.Table.Columns.Contains("Employee ID") ? row["Employee ID"].ToString().Trim() : string.Empty,
                    EmployerAmount = row.Table.Columns.Contains("Employer Amount") ? Convert.ToDecimal(row["Employer Amount"].ToString().Trim()) : 0,
                    Amount = row.Table.Columns.Contains("Amount") ? Convert.ToDecimal(row["Amount"].ToString().Trim()) : 0,
                    DeductionTypeName = row.Table.Columns.Contains("Deduction Type") ? row["Deduction Type"].ToString().Trim() : string.Empty,
                };

                employeeDeductionList.Add(employeeDeduction);

            }

            await _employeeDeductionAppService.Import(employeeDeductionList);

            return View("EmployeeDeductions", excelTable);
        }

        public async Task<IActionResult> DownloadEmployeeDeductionsUploadSample()
        {
            var wwwRoot = _env.WebRootPath;

            string fullPath = Path.Combine(wwwRoot + "/DataSample/", $"EmployeeDeductions_Sample_{DateTime.UtcNow:dd-MMM-yyyy-hh-mm-ss}.xlsx");

            using (ExcelEngine excelEngine = new ExcelEngine())
            {
                IApplication application = excelEngine.Excel;
                application.DefaultVersion = ExcelVersion.Excel2016;
                IWorkbook workbook = application.Workbooks.Create(1);
                IWorksheet worksheet = workbook.Worksheets[0];

                //Import the data to worksheet
                var results = await _employeeBioDataAppService.ExportDeductions();
                worksheet.ImportData(results, 1, 1, true);

                //Saving the workbook as stream
                FileStream stream = new FileStream(fullPath, FileMode.Create, FileAccess.ReadWrite);
                workbook.SaveAs(stream);
                await stream.DisposeAsync();
            }

            byte[] fileBytes = await System.IO.File.ReadAllBytesAsync(fullPath);
            return File(fileBytes, "application/ms-excel", "EmployeeDeductions_Sample.xlsx");

        }

        [HttpPost]
        public async Task<IActionResult> UploadLoanTypes(IFormFile customFile)
        {

            //read data from excel file
            ExcelEngine excelEngine = new ExcelEngine();
            //Loads or open an existing workbook through Open method of IWorkbooks
            IWorkbook workbook = excelEngine.Excel.Workbooks.Open(customFile.OpenReadStream());
            IWorksheet worksheet = workbook.Worksheets[0];

            // Read data from the worksheet and Export to the DataTable.

            DataTable excelTable = worksheet.ExportDataTable(worksheet.UsedRange, ExcelExportDataTableOptions.ColumnNames);

            for (int i = 0; i < excelTable.Rows.Count; i++)
            {
                var row = excelTable.Rows[i];

                await _loanTypeAppService.Create(new Services.Payroll.LoanTypes.Dto.CreateLoanTypeInput
                {
                    Name = row.Table.Columns.Contains("Name") ? row["Name"].ToString().Trim() : string.Empty,

                });

            }

            return View("LoanTypes", excelTable);
        }

        public async Task<IActionResult> DownloadLoanTypesUploadSample()
        {
            var wwwRoot = _env.WebRootPath;

            byte[] fileBytes = await System.IO.File.ReadAllBytesAsync(Path.Combine(wwwRoot + "/DataSample/", "LoanTypes_Sample.xlsx"));
            return File(fileBytes, "application/ms-excel", "LoanTypes_Sample.xlsx");

        }


        [HttpPost]
        public async Task<IActionResult> UploadEmployeeLoans(IFormFile customFile)
        {

            //read data from excel file...
            ExcelEngine excelEngine = new ExcelEngine();
            //Loads or open an existing workbook through Open method of IWorkbooks
            IWorkbook workbook = excelEngine.Excel.Workbooks.Open(customFile.OpenReadStream());
            IWorksheet worksheet = workbook.Worksheets[0];

            // Read data from the worksheet and Export to the DataTable.

            DataTable excelTable = worksheet.ExportDataTable(worksheet.UsedRange, ExcelExportDataTableOptions.ColumnNames);

            List<ImportEmployeeLoanInput> employeeLoanList = new List<ImportEmployeeLoanInput>();

            for (int i = 0; i < excelTable.Rows.Count; i++)
            {
                var row = excelTable.Rows[i];

               var employeeLoan = new ImportEmployeeLoanInput
               {
                    EmployeeIdentifier = row.Table.Columns.Contains("Staff No.") ? row["Staff No."].ToString().Trim() : string.Empty,
                    LoanDate = row.Table.Columns.Contains("Loan date") ? Convert.ToDateTime(row["Loan date"].ToString().Trim()) : DateTime.UtcNow,
                    Amount = row.Table.Columns.Contains("Amount") ? Convert.ToDecimal(row["Amount"].ToString().Trim()) : 0,
                    LoanTypeName = row.Table.Columns.Contains("Loan type") ? row["Loan type"].ToString().Trim() : string.Empty,
                    Duration = row.Table.Columns.Contains("Loan duration") ? Convert.ToInt32(row["Loan duration"].ToString().Trim()) : 1,
                    NextDeduction = row.Table.Columns.Contains("Next duration") ? Convert.ToInt32(row["Next duration"].ToString().Trim()) : 1,
                    AnnualInterestRate = row.Table.Columns.Contains("Interest rate") ? Convert.ToDecimal(row["Interest rate"].ToString().Trim()) : 0,
                    InterestType = row.Table.Columns.Contains("Interest type") ? row["Interest rate"].ToString().Trim() : string.Empty,
               };

               employeeLoanList.Add(employeeLoan);

            }

            await _employeeLoanAppService.Import(employeeLoanList);

            return View("EmployeeLoans", excelTable);
        }

        public async Task<IActionResult> DownloadEmployeeLoansSample()
        {

            var wwwRoot = _env.WebRootPath;

            string fullPath = Path.Combine(wwwRoot + "/DataSample/", $"EmployeeLoans_Sample{DateTime.UtcNow:dd-MMM-yyyy-hh-mm-ss}.xlsx");

            using (ExcelEngine excelEngine = new ExcelEngine())
            {
                IApplication application = excelEngine.Excel;
                application.DefaultVersion = ExcelVersion.Excel2016;
                IWorkbook workbook = application.Workbooks.Create(1);
                IWorksheet worksheet = workbook.Worksheets[0];

                //Import the data to worksheet...
                var results = await _employeeBioDataAppService.ExportEmployeeLoans();
                worksheet.ImportData(results, 1, 1, true);

                //Saving the workbook as stream
                FileStream stream = new FileStream(fullPath, FileMode.Create, FileAccess.ReadWrite);
                workbook.SaveAs(stream);
                await stream.DisposeAsync();
            }


            byte[] fileBytes = await System.IO.File.ReadAllBytesAsync(fullPath);
            return File(fileBytes, "application/ms-excel", "EmployeeLoans_Sample.xlsx");
        }

        [HttpPost]
        public async Task<IActionResult> UploadSalaryInfo(IFormFile customFile)
        {

            //read data from excel file
            ExcelEngine excelEngine = new ExcelEngine();
            //Loads or open an existing workbook through Open method of IWorkbooks
            IWorkbook workbook = excelEngine.Excel.Workbooks.Open(customFile.OpenReadStream());
            IWorksheet worksheet = workbook.Worksheets[0];

            // Read data from the worksheet and Export to the DataTable ...

            DataTable excelTable = worksheet.ExportDataTable(worksheet.UsedRange, ExcelExportDataTableOptions.ColumnNames);

            List<ImportEmployeeSalaryInfoInput> employeeSalaryInfoList = new List<ImportEmployeeSalaryInfoInput>();

            for (int i = 0; i < excelTable.Rows.Count; i++)
            {

                var row = excelTable.Rows[i];

                var employeeSalaryInfo = new ImportEmployeeSalaryInfoInput
                {
                    EmployeeIdentifier = row.Table.Columns.Contains("Employee ID") ? row["Employee ID"].ToString().Trim() : string.Empty,
                    SalaryType = row.Table.Columns.Contains("Salary Type") ? row["Salary Type"].ToString().Trim() : string.Empty,
                    PayType = row.Table.Columns.Contains("Pay Type") ? row["Pay Type"].ToString().Trim() : string.Empty,
                    BankName = row.Table.Columns.Contains("Bank Name") ? row["Bank Name"].ToString().Trim() : string.Empty, 
                    AccountNumber = row.Table.Columns.Contains("Account Number") ? row["Account Number"].ToString().Trim() : string.Empty,
                    CurrencyName = row.Table.Columns.Contains("Currency") ? row["Currency"].ToString().Trim() : string.Empty,
                    MonthlySalary = row.Table.Columns.Contains("Monthly Salary") ? Convert.ToDecimal(row["Monthly Salary"].ToString().Trim()) : 0,
                    BankBranch = row.Table.Columns.Contains("Bank Branch") ? row["Bank Branch"].ToString().Trim() : string.Empty,
                    CurrentHourlyRate = row.Table.Columns.Contains("Current Hourly Rate") ? Convert.ToDecimal(row["Current Hourly Rate"].ToString().Trim()) : 0,
                    DailyHours = row.Table.Columns.Contains("Daily Hours") ? Convert.ToInt32(row["Daily Hours"].ToString().Trim()) : 0,
                    PreviousSalary = row.Table.Columns.Contains("Previous Salary") ? Convert.ToDecimal(row["Previous Salary"].ToString().Trim()) : 0,
                    SalaryGrade = row.Table.Columns.Contains("Salary Grade") ? row["Salary Grade"].ToString().Trim() : string.Empty,
                    SalaryNotch = row.Table.Columns.Contains("Salary Notch") ? row["Salary Notch"].ToString().Trim() : string.Empty,
                    VacationDaysPaid = row.Table.Columns.Contains("Vacation Days Paid") ? Convert.ToInt32(row["Vacation Days Paid"].ToString().Trim()) : 0,
                    
                };

                employeeSalaryInfoList.Add(employeeSalaryInfo);

            }

            await _employeeSalaryInfoAppService.Import(employeeSalaryInfoList);

            return View("SalaryInfo", excelTable);
        }

        public async Task<IActionResult> DownloadSalaryInfoUploadSample()
        {
            var wwwRoot = _env.WebRootPath;


            string fullPath = Path.Combine(wwwRoot + "/DataSample/", $"SalaryInfo_Sample_{DateTime.UtcNow:dd-MMM-yyyy-hh-mm-ss}.xlsx");

            using (ExcelEngine excelEngine = new ExcelEngine())
            {
                IApplication application = excelEngine.Excel;
                application.DefaultVersion = ExcelVersion.Excel2016;
                IWorkbook workbook = application.Workbooks.Create(1);
                IWorksheet worksheet = workbook.Worksheets[0];

                //Import the data to worksheet
                var results = await _employeeBioDataAppService.ExportSalaryInfo();
                worksheet.ImportData(results, 1, 1, true);

                //Saving the workbook as stream
                FileStream stream = new FileStream(fullPath, FileMode.Create, FileAccess.ReadWrite);
                workbook.SaveAs(stream);
                await stream.DisposeAsync();
            }


            byte[] fileBytes = await System.IO.File.ReadAllBytesAsync(fullPath);
            return File(fileBytes, "application/ms-excel", "SalaryInfo_Sample.xlsx");

        }

        [HttpPost]
        public async Task<IActionResult> UploadSsnit(IFormFile customFile)
        {

            //read data from excel file
            ExcelEngine excelEngine = new ExcelEngine();
            //Loads or open an existing workbook through Open method of IWorkbooks
            IWorkbook workbook = excelEngine.Excel.Workbooks.Open(customFile.OpenReadStream());
            IWorksheet worksheet = workbook.Worksheets[0];

            // Read data from the worksheet and Export to the DataTable.

            DataTable excelTable = worksheet.ExportDataTable(worksheet.UsedRange, ExcelExportDataTableOptions.ColumnNames);

            List<ImportEmployeeSnitInput> employeeSsnitList =  new List<ImportEmployeeSnitInput>();

            for (int i = 0; i < excelTable.Rows.Count; i++)
            {
                var row = excelTable.Rows[i];

                var employeeSalaryInfo = new ImportEmployeeSnitInput
                {
                    EmployeeIdentifier = row.Table.Columns.Contains("Employee ID") ? row["Employee ID"].ToString().Trim() : string.Empty,
                    SocialSecurityNo = row.Table.Columns.Contains("Social Security No") ? row["Social Security No"].ToString().Trim() : string.Empty,
                    SocialSecurityFundEmployerContribution = row.Table.Columns.Contains("SSF Employer Contribution (%)") ? Convert.ToDecimal(row["SSF Employer Contribution (%)"].ToString().Trim()) : 0,
                    SocialSecurityFundEmployeeContribution = row.Table.Columns.Contains("SSF Employee Contribution (%)") ? Convert.ToDecimal(row["SSF Employee Contribution (%)"].ToString().Trim()) : 0,
                    ProvidentFundEmployeeContribution = row.Table.Columns.Contains("PF Employee Contribution (%)") ? Convert.ToDecimal(row["PF Employee Contribution (%)"].ToString().Trim()) : 0,
                    ProvidentFundEmployerContribution = row.Table.Columns.Contains("PF Employer Contribution (%)") ? Convert.ToDecimal(row["PF Employer Contribution (%)"].ToString().Trim()) : 0,
                    SecondProvidentFundEmployeeContribution = row.Table.Columns.Contains("2nd PF Employee Contribution (%)") ? Convert.ToDecimal(row["2nd PF Employee Contribution (%)"].ToString().Trim()) : 0,
                    SecondProvidentFundEmployerContribution = row.Table.Columns.Contains("2nd PF Employer Contribution (%)") ? Convert.ToDecimal(row["2nd PF Employer Contribution (%)"].ToString().Trim()) : 0,
                    SuperAnnuationEmployerContribution = row.Table.Columns.Contains("Super Annuation Employer Contribution") ? Convert.ToDecimal(row["2nd PF Employer Contribution (%)"].ToString().Trim()) : 0,
                    SuperAnnuationEmployeeContribution = row.Table.Columns.Contains("Super Annuation Employee Contribution") ? Convert.ToDecimal(row["Super Annuation Employee Contribution"].ToString().Trim()) : 0

                };

                employeeSsnitList.Add(employeeSalaryInfo);
            }

            await _employeeSnitAppService.Import(employeeSsnitList);

            return View("Ssnit", excelTable);
        }

        public async Task<IActionResult> DownloadSsnitUploadSample()
        {
            var wwwRoot = _env.WebRootPath;

            string fullPath = Path.Combine(wwwRoot + "/DataSample/", $"EmployeeSsnit_Sample_{DateTime.UtcNow:dd-MMM-yyyy-hh-mm-ss}.xlsx");

            using (ExcelEngine excelEngine = new ExcelEngine())
            {
                IApplication application = excelEngine.Excel;
                application.DefaultVersion = ExcelVersion.Excel2016;
                IWorkbook workbook = application.Workbooks.Create(1);
                IWorksheet worksheet = workbook.Worksheets[0];

                //Import the data to worksheet
                var results = await _employeeBioDataAppService.ExportSsnit();
                worksheet.ImportData(results, 1, 1, true);

                //Saving the workbook as stream
                FileStream stream = new FileStream(fullPath, FileMode.Create, FileAccess.ReadWrite);
                workbook.SaveAs(stream);
                await stream.DisposeAsync();
            }


            byte[] fileBytes = await System.IO.File.ReadAllBytesAsync(fullPath);
            return File(fileBytes, "application/ms-excel", "EmployeeSsnit_Sample.xlsx");

        }
    
    }
}
