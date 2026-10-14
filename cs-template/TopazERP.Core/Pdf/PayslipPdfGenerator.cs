using System;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Abp.Domain.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Syncfusion.HtmlConverter;
using Syncfusion.Pdf;
using TopazERP.DomainServices.Payroll.Reports.Dto;

namespace TopazERP.Pdf;

public class PayslipPdfGenerator: DomainService, IPayslipPdfGenerator
{
     
    private readonly IWebHostEnvironment _webHostEnvironment;

    public PayslipPdfGenerator( IWebHostEnvironment webHostEnvironment)
    {
        
        _webHostEnvironment = webHostEnvironment;
    }
    
    public async Task<byte[]> RenderPdf(EmployeePayslip payslip)
    {
        
        try
        {
            var payslipHtml = await File.ReadAllTextAsync(Path.Combine(_webHostEnvironment.WebRootPath, "ReportTemplates", "payslip-type-iii.html"));

            payslipHtml = payslipHtml.Replace("{{CompanyName}}", payslip.ReportHeader.CompanyName)
                .Replace("{{ReportTitle}}", payslip.ReportHeader.ReportTitle)
                .Replace("{{SocialSecurityNo}}", payslip.PayslipBasicInfo.SocialSecurityNo)
                .Replace("{{DepartmentName}}", payslip.PayslipBasicInfo.DepartmentName)
                .Replace("{{EmployeeName}}", payslip.PayslipBasicInfo.EmployeeName)
                .Replace("{{BankBranchName}}", payslip.PayslipBasicInfo.BankBranchName)
                .Replace("{{BankName}}", payslip.PayslipBasicInfo.BankName)
                .Replace("{{SalaryGradeName}}", payslip.PayslipBasicInfo.SalaryGradeName)
                .Replace("{{EmployeeIdentifier}}", payslip.PayslipBasicInfo.EmployeeIdentifier)
                .Replace("{{AccountNumber}}", payslip.PayslipBasicInfo.AccountNumber)
                .Replace("{{AnnualSalary}}", payslip.PayslipBasicInfo.AnnualSalary.ToString("N2"))
                .Replace("{{DaysWorked}}", payslip.Paymaster[0].DaysWorked.ToString(""))
                .Replace("{{SSFContributionEmployer}}", payslip.Paymaster[0].EmployerSSFDeduction.ToString("N2"))
                .Replace("{{Currency}}", payslip.Paymaster[0].CurrencyName)
                .Replace("{{PrintedDate}}", DateTime.UtcNow.ToString("dd-MMM-yyyy"))
                .Replace("{{BasicSalary}}", payslip.Paymaster[0].BasicSalary.ToString("N2"))
                .Replace("{{ProvidentFundContribution}}",payslip.Paymaster[0].EmployerProvidentFundContribution.ToString("N2"));
                                         
            
            // handle allowances ...
            var allowanceRowPattern = @"<tr[^>]*>\s*<td[^>]*>\s*<div[^>]*>\s*\{\{\s*(AllowanceTypeName)\s*\}\}\s*</div>\s*</td>\s*<td[^>]*>\s*<div[^>]*>\s*\{\{\s*(AllowanceAmount)\s*\}\}\s*</div>\s*</td>\s*<td[^>]*>\s*<div[^>]*>\s*\{\{\s*(Taxable)\s*\}\}\s*</div>\s*</td>\s*</tr>";
            
            
            // Find the row template in the HTML
            var allowancePatternMatch = Regex.Match(payslipHtml, allowanceRowPattern, RegexOptions.Singleline);

            if (allowancePatternMatch.Success)
            {
                // Extract the matched row template
                var rowTemplate = allowancePatternMatch.Value;

                // Generate rows by replacing placeholders in the row template for each allowance
                var allownceGeneratedRows = new StringBuilder();
                
                
                foreach (var allowance in payslip.EmployeeAllowances)
                {
                    var row = rowTemplate
                        .Replace("{{AllowanceTypeName}}", allowance.AllowanceTypeName)
                        .Replace("{{AllowanceAmount}}", allowance.Amount.ToString("N2"))
                        .Replace("{{Taxable}}", allowance.Taxable);

                    allownceGeneratedRows.Append(row);
                }

                // Replace the original placeholder row in the template with the generated rows
                var allowanceHtml = payslipHtml.Replace(rowTemplate, allownceGeneratedRows.ToString());
                
                payslipHtml = allowanceHtml;
                 

            }
            
            payslipHtml = payslipHtml.Replace("{{TotalAllowancesAmount}}", payslip.EmployeeAllowances.Sum(a => a.Amount).ToString("N2"));
            
            payslipHtml = payslipHtml.Replace("{{GrossSalary}}", payslip.GrossPay.ToString("N2"));
            
            payslipHtml = payslipHtml.Replace("{{NetSalary}}", payslip.Paymaster[0].NetSalary.ToString("N2"));
            
            var taxReliefRowPattern = @"<tr[^>]*>\s*<td[^>]*>\s*<div[^>]*>\s*\{\{\s*(ReliefTypeName)\s*\}\}\s*</div>\s*</td>\s*<td[^>]*>\s*<div[^>]*>\s*\{\{\s*(ReliefAmount)\s*\}\}\s*</div>\s*</td>\s*</tr>";

            var taxReliefPatternMatch = Regex.Match(payslipHtml, taxReliefRowPattern, RegexOptions.Singleline);
            
            if (taxReliefPatternMatch.Success)
            {
                // Extract the matched row template
                var rowTemplate = taxReliefPatternMatch.Value;

                // Generate rows by replacing placeholders in the row template for each allowance
                var taxReliefGeneratedRows = new StringBuilder();
                
                
                foreach (var allowance in payslip.EmployeeAllowances)
                {
                    var row = rowTemplate
                        .Replace("{{ReliefTypeName}}", allowance.AllowanceTypeName)
                        .Replace("{{ReliefAmount}}", allowance.Amount.ToString("N2"));

                    taxReliefGeneratedRows.Append(row);
                }

                // Replace the original placeholder row in the template with the generated rows
                var taxReliefHtml = payslipHtml.Replace(rowTemplate, taxReliefGeneratedRows.ToString());
                
                payslipHtml = taxReliefHtml;

            }
            
            var benefitsInKindRowPattern = @"<tr[^>]*>\s*<td[^>]*>\s*<div[^>]*>\s*\{\{\s*(BenefitInKindTypeName)\s*\}\}\s*</div>\s*</td>\s*<td[^>]*>\s*<div[^>]*>\s*\{\{\s*(BenefitInKindTypeAmount)\s*\}\}\s*</div>\s*</td>\s*</tr>";

            var benefitsInKindPatternMatch = Regex.Match(payslipHtml, benefitsInKindRowPattern, RegexOptions.Singleline);

            if (benefitsInKindPatternMatch.Success)
            {
                // Extract the matched row template
                var rowTemplate = benefitsInKindPatternMatch.Value;

                // Generate rows by replacing placeholders in the row template for each allowance
                var benefitsInKindGeneratedRows = new StringBuilder();
                
                foreach (var benefitsInKind in payslip.EmployeeBenefitsInKind)
                {
                    var row = rowTemplate
                        .Replace("{{BenefitInKindTypeName}}", benefitsInKind.BenefitInKindTypeName)
                        .Replace("{{BenefitInKindTypeAmount}}", benefitsInKind.Amount.ToString("N2"));

                    benefitsInKindGeneratedRows.Append(row);
                }

                // Replace the original placeholder row in the template with the generated rows
                var benefitsInKindHtml = payslipHtml.Replace(rowTemplate, benefitsInKindGeneratedRows.ToString());
                
                payslipHtml = benefitsInKindHtml;

            }
            
            var loansRowPattern =  @"<tr[^>]*>\s*<td[^>]*>\s*<div[^>]*>\s*\{\{\s*(LoanDescription)\s*\}\}\s*</div>\s*</td>\s*<td[^>]*>\s*<div[^>]*>\s*\{\{\s*(LoanAmount)\s*\}\}\s*</div>\s*</td>\s*<td[^>]*>\s*<div[^>]*>\s*\{\{\s*(OpeningBalance)\s*\}\}\s*</div>\s*</td>\s*<td[^>]*>\s*<div[^>]*>\s*\{\{\s*(RepayAmount)\s*\}\}\s*</div>\s*</td>\s*<td[^>]*>\s*<div[^>]*>\s*\{\{\s*(ClosingBalance)\s*\}\}\s*</div>\s*</td>\s*</tr>";
           
            var loansPatternMatch = Regex.Match(payslipHtml, loansRowPattern, RegexOptions.Singleline);

            if (loansPatternMatch.Success)
            {
                // Extract the matched row template
                var rowTemplate = loansPatternMatch.Value;

                // Generate rows by replacing placeholders in the row template for each allowance
                var loansGeneratedRows = new StringBuilder();
                
                foreach (var loan in payslip.EmployeeLoans)
                {
                    var row = rowTemplate
                        .Replace("{{LoanDescription}}", loan.Description)
                        .Replace("{{LoanAmount}}", loan.LoanAmount.ToString("N2"))
                        .Replace("{{OpeningBalance}}", loan.OpeningBalance.ToString("N2"))
                        .Replace("{{RepayAmount}}", loan.RepayAmount.ToString("N2"))
                        .Replace("{{ClosingBalance}}", loan.ClosingBalance.ToString("N2"));

                    loansGeneratedRows.Append(row);
                }

                // Replace the original placeholder row in the template with the generated rows
                var loansHtml = payslipHtml.Replace(rowTemplate, loansGeneratedRows.ToString());
                
                payslipHtml = loansHtml;

            }
            
            
            var overtimeRowPattern = @"<tr[^>]*>\s*<td[^>]*>\s*<div[^>]*>\s*\{\{\s*(OvertimeType)\s*\}\}\s*</div>\s*</td>\s*<td[^>]*>\s*<div[^>]*>\s*\{\{\s*(OvertimeAmount)\s*\}\}\s*</div>\s*</td>\s*</tr>";

            var overtimePatternMatch = Regex.Match(payslipHtml, overtimeRowPattern, RegexOptions.Singleline);
            
            if (overtimePatternMatch.Success)
            {
                // Extract the matched row template
                var rowTemplate = overtimePatternMatch.Value;

                // Generate rows by replacing placeholders in the row template for each allowance
                var overtimeGeneratedRows = new StringBuilder();
                
                
                foreach (var overtime in payslip.EmployeeOvertime)
                {
                    var row = rowTemplate
                        .Replace("{{OvertimeType}}", overtime.OvertimeTypeName)
                        .Replace("{{OvertimeAmount}}", overtime.Amount.ToString("N2"));

                    overtimeGeneratedRows.Append(row);
                }

                // Replace the original placeholder row in the template with the generated rows
                var overtimeHtml = payslipHtml.Replace(rowTemplate, overtimeGeneratedRows.ToString());
                
                payslipHtml = overtimeHtml;

            }
            
            
            var salaryAdvanceRowPattern = @"<tr[^>]*>\s*<td[^>]*>\s*<div[^>]*>\s*\{\{\s*(SalaryAdvanceDescription)\s*\}\}\s*</div>\s*</td>\s*<td[^>]*>\s*<div[^>]*>\s*\{\{\s*(SalaryAdvanceAmount)\s*\}\}\s*</div>\s*</td>\s*</tr>";

            var salaryAdvancePatternMatch = Regex.Match(payslipHtml, salaryAdvanceRowPattern, RegexOptions.Singleline);
            
            
            if (salaryAdvancePatternMatch.Success)
            {
                // Extract the matched row template
                var rowTemplate = salaryAdvancePatternMatch.Value;

                // Generate rows by replacing placeholders in the row template for each allowance
                var salaryAdvanceGeneratedRows = new StringBuilder();
                
                foreach (var salaryAdvance in payslip.EmployeeSalaryAdvance)
                {
                    var row = rowTemplate
                        .Replace("{{SalaryAdvanceDescription}}", salaryAdvance.LoanTypeName)
                        .Replace("{{SalaryAdvanceAmount}}", salaryAdvance.Amount.ToString("N2"));

                    salaryAdvanceGeneratedRows.Append(row);
                }

                // Replace the original placeholder row in the template with the generated rows
                var salaryAdvanceHtml = payslipHtml.Replace(rowTemplate, salaryAdvanceGeneratedRows.ToString());
                
                payslipHtml = salaryAdvanceHtml;

            }
            
             
            var blinkEnginePath = Path.Combine(_webHostEnvironment.WebRootPath, "PdfEngine", "windows");

            
            var htmlConverter = new HtmlToPdfConverter(HtmlRenderingEngine.Blink);
            var blinkConverterSettings = new BlinkConverterSettings
            {
                // Set the BlinkBinaries folder path
                BlinkPath = blinkEnginePath,
                Orientation = PdfPageOrientation.Portrait,
                EnableJavaScript = true,
                AdditionalDelay = 2000
            };

            
            htmlConverter.ConverterSettings = blinkConverterSettings;

            
            using (var document1 = htmlConverter.Convert(payslipHtml, string.Empty))
            using (var stream1 = new MemoryStream())
            {
                document1.Save(stream1);
                document1.Close(true);

                using (var finalDoc = new PdfDocument())
                {
                    finalDoc.PageSettings.Size = PdfPageSize.A4;
                    Stream[] streams = { stream1 };
                    PdfDocumentBase.Merge(finalDoc, streams);

                    using (var reportStream = new MemoryStream())
                    {
                        finalDoc.Save(reportStream);
                        finalDoc.Close(true);

                        return reportStream.ToArray();
                    }
                }
            }
        }
        catch (Exception e)
        {
            Logger.Error($"PayslipPdfGenerator exception: {e.Message}");
            Logger.Error($"PayslipPdfGenerator exception: {e.StackTrace}");
            return null;
        }
         
        
    }
        
    
}