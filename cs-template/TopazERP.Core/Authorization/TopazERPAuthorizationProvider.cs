using Abp.Authorization;
using Abp.Localization;
using Abp.MultiTenancy;

namespace TopazERP.Authorization
{
    public class TopazERPAuthorizationProvider : AuthorizationProvider
    {
        public override void SetPermissions(IPermissionDefinitionContext context)
        {
            context.CreatePermission(PermissionNames.Pages_Users, L("Users"));
            context.CreatePermission(PermissionNames.Pages_Users_Activation, L("UsersActivation"));
            context.CreatePermission(PermissionNames.Pages_Roles, L("Roles"));

            context.CreatePermission(PermissionNames.Payroll_Dashboard, L("PayrollDashboard"));
            context.CreatePermission(PermissionNames.Payroll_Setups, L("PayrollSetups"));
            context.CreatePermission(PermissionNames.Payroll_Setups_AllowanceTypesAndRates, L("AllowanceTypesAndRates"));
            context.CreatePermission(PermissionNames.Payroll_Setups_BenefitsInKindTypesAndRates, L("BenefitsInKindTypesAndRates"));
            context.CreatePermission(PermissionNames.Payroll_Setups_DeductionTypesAndRates, L("DeductionTypesAndRates"));
            context.CreatePermission(PermissionNames.Payroll_Setups_OvertimeTypesAndRates, L("OvertimeTypesAndRates"));
            context.CreatePermission(PermissionNames.Payroll_Setups_EmployeeCategories, L("EmployeeCategories"));
            context.CreatePermission(PermissionNames.Payroll_Setups_EmployeeStatus, L("EmployeeStatus"));
            context.CreatePermission(PermissionNames.Payroll_Setups_EmployeeRanks, L("EmployeeRanks"));
            context.CreatePermission(PermissionNames.Payroll_Setups_Gratuity, L("Gratuity"));
            context.CreatePermission(PermissionNames.Payroll_Setups_LoanTypes, L("LoanTypes"));
            context.CreatePermission(PermissionNames.Payroll_Setups_SalaryGradesAndNotches, L("SalaryGradesAndNotches"));
            context.CreatePermission(PermissionNames.Payroll_Setups_TaxTable, L("TaxTable"));
            context.CreatePermission(PermissionNames.Payroll_Setups_HistoricalTaxTable, L("HistoricalTaxTable"));
            context.CreatePermission(PermissionNames.Payroll_Setups_TaxReliefs, L("TaxReliefs"));
            context.CreatePermission(PermissionNames.Payroll_Setups_InitializePayMonth, L("InitializePayMonth"));
            context.CreatePermission(PermissionNames.Payroll_Setups_IrsSignature, L("IrsSignature"));
            context.CreatePermission(PermissionNames.Payroll_Setups_PayCalendar, L("PayCalendar"));
            context.CreatePermission(PermissionNames.Payroll_Setups_Initialize, L("Initialize"));
            

            context.CreatePermission(PermissionNames.Payroll_DataEntry, L("PayrollDataEntry"));
            context.CreatePermission(PermissionNames.Payroll_DataEntry_EmployeeBioData, L("PayrollDataEntryEmployeeBioData"));
            context.CreatePermission(PermissionNames.Payroll_DataEntry_EmployeeSalaryInfo, L("PayrollDataEntryEmployeeSalaryInfo"));
            context.CreatePermission(PermissionNames.Payroll_DataEntry_EmployeeDaysWorked, L("PayrollDataEntryEmployeeDaysWorked"));
            context.CreatePermission(PermissionNames.Payroll_DataEntry_EmployeeBonusAndOneTimeAllowance, L("PayrollDataEntryBonusAndOneTimeAllowance"));
            context.CreatePermission(PermissionNames.Payroll_DataEntry_EmployeeSnit, L("PayrollDataEntrySnit"));
            context.CreatePermission(PermissionNames.Payroll_DataEntry_EmployeeAllowances, L("PayrollDataEntryAllowances"));
            context.CreatePermission(PermissionNames.Payroll_DataEntry_EmployeeDeductions, L("PayrollDataEntryDeductions"));
            context.CreatePermission(PermissionNames.Payroll_DataEntry_EmployeeBenefitsInKind, L("PayrollDataEntryEmployeeBenefitsInKind"));
            context.CreatePermission(PermissionNames.Payroll_DataEntry_EmployeeLoans, L("PayrollDataEntryEmployeeLoans"));
            context.CreatePermission(PermissionNames.Payroll_DataEntry_EmployeeLoanApprovals, L("PayrollDataEntryLoanApprovals"));
            context.CreatePermission(PermissionNames.Payroll_DataEntry_EmployeeSalaryAdvance, L("PayrollDataEntrySalaryAdvance"));
            context.CreatePermission(PermissionNames.Payroll_DataEntry_EmployeeOnetimeDeduction, L("PayrollDataEntryOnetimeDeduction"));
            context.CreatePermission(PermissionNames.Payroll_DataEntry_EmployeeReliefs, L("PayrollDataEntryEmployeeReliefs"));
            context.CreatePermission(PermissionNames.Payroll_DataEntry_EmployeeOvertime, L("PayrollDataEntryEmployeeOvertime"));
            context.CreatePermission(PermissionNames.Payroll_DataEntry_UpdateEmployeeStatus, L("PayrollDataEntryUpdateEmployeeStatus"));
            context.CreatePermission(PermissionNames.Payroll_DataEntry_LoanAmortization, L("PayrollDataEntryLoanAmortization"));

            context.CreatePermission(PermissionNames.Payroll_ProcessPay, L("ProcessPayroll"));
            context.CreatePermission(PermissionNames.Payroll_ProcessSpecialEarnings, L("ProcessSpecialEarnings"));
            
            context.CreatePermission(PermissionNames.Payroll_PostPay, L("PostPayroll"));

            context.CreatePermission(PermissionNames.Payroll_SalaryIncrease, L("PayrollSalaryIncrease"));
            context.CreatePermission(PermissionNames.Payroll_SalaryIncrease_AccrossBoard, L("PayrollSalaryIncreaseAcrossBoard"));
            context.CreatePermission(PermissionNames.Payroll_SalaryIncrease_ByCategory, L("PayrollSalaryIncreaseByCategory"));
            context.CreatePermission(PermissionNames.Payroll_SalaryIncrease_ByGradeAndNotch, L("PayrollSalaryIncreaseByGradeAndNotch"));

            context.CreatePermission(PermissionNames.Payroll_PayrollImportData, L("PayrollImportData"));
            context.CreatePermission(PermissionNames.Payroll_PayrollImportData_AllowanceTypes, L("PayrollImportDataAllowanceTypes"));
            context.CreatePermission(PermissionNames.Payroll_PayrollImportData_DeductionTypes, L("PayrollImportDataDeductionTypes"));
            context.CreatePermission(PermissionNames.Payroll_PayrollImportData_BenefitsInKindTypes, L("PayrollImportDataBenefitsInKindTypes"));
            context.CreatePermission(PermissionNames.Payroll_PayrollImportData_EmployeeCategories, L("PayrollImportDataEmployeeCategories"));
            context.CreatePermission(PermissionNames.Payroll_PayrollImportData_Employees, L("PayrollImportDataEmployees"));
            context.CreatePermission(PermissionNames.Payroll_PayrollImportData_EmployeeAllowances, L("PayrollImportDataEmployeeAllowances"));
            context.CreatePermission(PermissionNames.Payroll_PayrollImportData_EmployeeDeductions, L("PayrollImportDataEmployeeDeductions"));
            context.CreatePermission(PermissionNames.Payroll_PayrollImportData_EmployeeBenefitsInKind, L("PayrollImportDataEmployeeBenefitsInKind"));
            context.CreatePermission(PermissionNames.Payroll_PayrollImportData_LoanTypes, L("PayrollImportDataLoanTypes"));
            context.CreatePermission(PermissionNames.Payroll_PayrollImportData_EmployeeLoans, L("PayrollImportDataEmployeeLoans"));
            context.CreatePermission(PermissionNames.Payroll_PayrollImportData_EmployeeSalaryInfo, L("PayrollImportDataEmployeeSalaryInfo"));
            context.CreatePermission(PermissionNames.Payroll_PayrollImportData_EmployeeSnit, L("PayrollImportDatamEmployeeSnit"));

            context.CreatePermission(PermissionNames.Payroll_PayrollEnquiries, L("PayrollEnquiries"));
            context.CreatePermission(PermissionNames.Payroll_PayrollEnquiries_EmployeeDirectory, L("PayrollEnquiriesEmployeeDirectory"));
            context.CreatePermission(PermissionNames.Payroll_PayrollEnquiries_EmployeeAllowances, L("PayrollEnquiriesEmployeeAllowances"));
            context.CreatePermission(PermissionNames.Payroll_PayrollEnquiries_EmployeeDeductions, L("PayrollEnquiriesEmployeeDeductions"));
            context.CreatePermission(PermissionNames.Payroll_PayrollEnquiries_EmployeeOnetimeDeductions, L("PayrollEnquiriesEmployeeOnetimeDeductions"));
            context.CreatePermission(PermissionNames.Payroll_PayrollEnquiries_EmployeeSalaryInfo, L("PayrollEnquiriesEmployeeSalaryInfo"));
            context.CreatePermission(PermissionNames.Payroll_PayrollEnquiries_SalaryIncrementHistory, L("PayrollEnquiriesSalaryIncrementHistory"));
            context.CreatePermission(PermissionNames.Payroll_PayrollEnquiries_EmployeeBenefitsInKind, L("PayrollEnquiriesEmployeeDirectory"));
            context.CreatePermission(PermissionNames.Payroll_PayrollEnquiries_EmployeeTaxReliefs, L("PayrollEnquiriesEmployeeTaxReliefs"));
            context.CreatePermission(PermissionNames.Payroll_PayrollEnquiries_EmployeeOutstandingLoans, L("PayrollEnquiriesEmployeeOutstandingLoans"));
            context.CreatePermission(PermissionNames.Payroll_PayrollEnquiries_EmployeeSalaryAdvance, L("PayrollEnquiriesEmployeeSalaryAdvance"));
            context.CreatePermission(PermissionNames.Payroll_PayrollEnquiries_PastLoans, L("PayrollEnquiriesPastLoans"));
            context.CreatePermission(PermissionNames.Payroll_PayrollEnquiries_EmployeeProvidentFund, L("PayrollEnquiriesEmployeeProvidentFund"));
            context.CreatePermission(PermissionNames.Payroll_PayrollEnquiries_SsfContributions, L("PayrollEnquiriesSsfContributions"));
            context.CreatePermission(PermissionNames.Payroll_PayrollEnquiries_PastSsfContributions, L("PayrollEnquiriesPastSsfContributions"));
            context.CreatePermission(PermissionNames.Payroll_PayrollEnquiries_PayrollTransactions, L("PayrollEnquiriesPayrollTransactions"));


            context.CreatePermission(PermissionNames.Payroll_PayrollReports, L("PayrollReports"));
            context.CreatePermission(PermissionNames.Payroll_MrPayrollReports_LoanDeductions, L("MonthlyPayrollReportsLoanDeductions"));
            context.CreatePermission(PermissionNames.Payroll_MrPayrollReports_EmployeeLoans, L("MonthlyPayrollReportsEmployeeLoans"));
            context.CreatePermission(PermissionNames.Payroll_MrPayrollReports_MonthlyLoanPayout, L("MonthlyPayrollReportsMonthlyLoanPayout"));
            context.CreatePermission(PermissionNames.Payroll_MrPayrollReports_OutstandingLoans, L("MonthlyPayrollReportsOutstandingLoans"));
            context.CreatePermission(PermissionNames.Payroll_MrPayrollReports_Allowances, L("MonthlyPayrollReportsAllowances"));
            context.CreatePermission(PermissionNames.Payroll_MrPayrollReports_PayRegister, L("MonthlyPayrollReportsPayRegister"));
            context.CreatePermission(PermissionNames.Payroll_MrPayrollReports_UnpaidSalaries, L("MonthlyPayrollReportsUnpaidSalaries"));
            context.CreatePermission(PermissionNames.Payroll_MrPayrollReports_Payslip, L("MonthlyPayrollReportsPayslip"));
            context.CreatePermission(PermissionNames.Payroll_MrPayrollReports_SalaryList, L("MonthlyPayrollReportsSalaryList"));
            context.CreatePermission(PermissionNames.Payroll_MrPayrollReports_PensionScheme, L("MonthlyPayrollReportsPensionScheme"));
            context.CreatePermission(PermissionNames.Payroll_MrPayrollReports_PayeeReturns, L("MonthlyPayrollReportsPayeeReturns"));
            context.CreatePermission(PermissionNames.Payroll_MrPayrollReports_Deductions, L("MonthlyPayrollReportsDeductions"));
            context.CreatePermission(PermissionNames.Payroll_MrPayrollReports_SalaryAdvance, L("MonthlyPayrollReportsSalaryAdvance"));
            context.CreatePermission(PermissionNames.Payroll_MrPayrollReports_PensionDeduction, L("MonthlyPayrollReportsPensionDeduction"));
            context.CreatePermission(PermissionNames.Payroll_MrPayrollReports_SuperAnnuation, L("MonthlyPayrollReportsSalaryAdvance"));
            context.CreatePermission(PermissionNames.Payroll_MrPayrollReports_ProvidentFund, L("MonthlyPayrollReportsSuperAnnuation"));
            context.CreatePermission(PermissionNames.Payroll_MrPayrollReports_SecondProvidentFund, L("MonthlyPayrollReportsSecondProvidentFund"));
            context.CreatePermission(PermissionNames.Payroll_MrPayrollReports_BankPayment, L("MonthlyPayrollReportsBankPayment"));
            context.CreatePermission(PermissionNames.Payroll_MrPayrollReports_CashPayment, L("MonthlyPayrollReportsCashPayment"));
            context.CreatePermission(PermissionNames.Payroll_MrPayrollReports_TaxRelief, L("MonthlyPayrollReportsTaxRelief"));
            context.CreatePermission(PermissionNames.Payroll_MrPayrollReports_DaysWorked, L("MonthlyPayrollReportsDaysWorked"));


            context.CreatePermission(PermissionNames.Payroll_HrPayrollReports_LoanDeductions, L("HistoricalPayrollReportsLoanDeductions"));
            context.CreatePermission(PermissionNames.Payroll_HrPayrollReports_EmployeeLoans, L("HistoricalPayrollReportsEmployeeLoans"));
            context.CreatePermission(PermissionNames.Payroll_HrPayrollReports_MonthlyLoanPayout, L("HistoricalPayrollReportsMonthlyLoanPayout"));
            context.CreatePermission(PermissionNames.Payroll_HrPayrollReports_OutstandingLoans, L("HistoricalPayrollReportsOutstandingLoans"));
            context.CreatePermission(PermissionNames.Payroll_HrPayrollReports_Allowances, L("HistoricalPayrollReportsAllowances"));
            context.CreatePermission(PermissionNames.Payroll_HrPayrollReports_PayRegister, L("HistoricalPayrollReportsPayRegister"));
            context.CreatePermission(PermissionNames.Payroll_HrPayrollReports_UnpaidSalaries, L("HistoricalPayrollReportsUnpaidSalaries"));
            context.CreatePermission(PermissionNames.Payroll_HrPayrollReports_Payslip, L("HistoricalPayrollReportsPayslip"));
            context.CreatePermission(PermissionNames.Payroll_HrPayrollReports_SalaryList, L("HistoricalPayrollReportsSalaryList"));
            context.CreatePermission(PermissionNames.Payroll_HrPayrollReports_PensionScheme, L("HistoricalPayrollReportsPensionScheme"));
            context.CreatePermission(PermissionNames.Payroll_HrPayrollReports_PayeeReturns, L("HistoricalPayrollReportsPayeeReturns"));
            context.CreatePermission(PermissionNames.Payroll_HrPayrollReports_Deductions, L("HistoricalPayrollReportsDeductions"));
            context.CreatePermission(PermissionNames.Payroll_HrPayrollReports_SalaryAdvance, L("HistoricalPayrollReportsSalaryAdvance"));
            context.CreatePermission(PermissionNames.Payroll_HrPayrollReports_ProvidentFund, L("HistoricalPayrollReportsProvidentFund"));
            context.CreatePermission(PermissionNames.Payroll_HrPayrollReports_SecondProvidentFund, L("HistoricalPayrollReportsSecondProvidentFund"));
            context.CreatePermission(PermissionNames.Payroll_HrPayrollReports_BankPayment, L("HistoricalPayrollReportsBankPayment"));
            context.CreatePermission(PermissionNames.Payroll_HrPayrollReports_CashPayment, L("HistoricalPayrollReportsCashPayment"));
            context.CreatePermission(PermissionNames.Payroll_HrPayrollReports_TaxRelief, L("HistoricalPayrollReportsTaxRelief"));
            context.CreatePermission(PermissionNames.Payroll_HrPayrollReports_DaysWorked, L("HistoricalPayrollReportsDaysWorked"));
            context.CreatePermission(PermissionNames.Payroll_DataEntry_EditEmployeeSalaryAdvance, L("EditEmployeeSalaryAdvance"));
            context.CreatePermission(PermissionNames.Payroll_DataEntry_SalaryAdvanceApprovals, L("SalaryAdvanceApprovals"));
            context.CreatePermission(PermissionNames.Payroll_DataEntry_EditEmployeeLoan, L("EditEmployeeLoan"));
            
            
            //Ap
            context.CreatePermission(PermissionNames.Ap_DataEntry, L("ApDataEntry"));
            context.CreatePermission(PermissionNames.Ap_DataEntry_OpeningBalances, L("ApDataEntryOpeningBalances"));
            context.CreatePermission(PermissionNames.Ap_DataEntry_Invoices, L("ApDataEntryInvoices"));
            context.CreatePermission(PermissionNames.Ap_DataEntry_CreateInvoice, L("ApDataEntryCreateInvoice"));
            context.CreatePermission(PermissionNames.Ap_DataEntry_EditInvoice, L("ApDataEntryEditInvoice"));
            context.CreatePermission(PermissionNames.Ap_DataEntry_PostInvoices, L("ApDataEntryPostInvoices"));
            context.CreatePermission(PermissionNames.Ap_DataEntry_EditPostedInvoice, L("ApDataEntryEditPostedInvoice"));
            context.CreatePermission(PermissionNames.Ap_DataEntry_ChangeInvoiceStatus, L("ApDataEntryChangeInvoiceStatus"));
            context.CreatePermission(PermissionNames.Ap_DataEntry_CancelInvoices, L("ApDataEntryCancelInvoices"));
            context.CreatePermission(PermissionNames.Ap_DataEntry_EditPayments, L("ApDataEntryEditPayments"));
            context.CreatePermission(PermissionNames.Ap_DataEntry_CancelPayments, L("ApDataEntryCancelPayments"));
            context.CreatePermission(PermissionNames.Ap_DataEntry_Vouchers, L("ApDataEntryVouchers"));
            context.CreatePermission(PermissionNames.Ap_DataEntry_PostVouchers, L("ApDataEntryPostVouchers"));
            context.CreatePermission(PermissionNames.Ap_DataEntry_Payments, L("ApDataEntryPayments"));
            context.CreatePermission(PermissionNames.Ap_DataEntry_PostPayments, L("ApDataEntryPostPayments"));
            context.CreatePermission(PermissionNames.Ap_DataEntry_WithHoldingPayments, L("ApDataEntryWithHoldingPayments"));
            context.CreatePermission(PermissionNames.Ap_DataEntry_DebitMemo, L("DebitMemo"));
            context.CreatePermission(PermissionNames.Ap_DataEntry_ApproveInvoices, L("ApproveInvoices"));
            context.CreatePermission(PermissionNames.Ap_Enquiries, L("ApEnquiries"));
            context.CreatePermission(PermissionNames.Ap_Enquiries_InvoiceList, L("ApEnquiriesInvoiceList"));
            context.CreatePermission(PermissionNames.Ap_Enquiries_Payments, L("ApEnquiriesPayments"));
            context.CreatePermission(PermissionNames.Ap_Enquiries_DebitMemo,L("ApEnquiriesDebitMemo"));
            context.CreatePermission(PermissionNames.Ap_Enquiries_WithHolding, L("ApEnquiriesWithHolding"));
            context.CreatePermission(PermissionNames.Ap_Enquiries_OpeningBalance, L("ApEnquiriesOpeningBalance"));
            
            context.CreatePermission(PermissionNames.Ap_ImportData, L("ApImportData"));
            context.CreatePermission(PermissionNames.Ap_ImportData_SupplierList, L("ApImportDataSupplierList"));
            context.CreatePermission(PermissionNames.Ap_ImportData_OpeningBalance, L("ApImportDataOpeningBalance"));
            
            context.CreatePermission(PermissionNames.Ap_EnterpriseDataEntry, L("ApEnterpriseDataEntry"));
            context.CreatePermission(PermissionNames.Ap_EnterpriseDataEntry_Vouchers, L("ApEnterpriseRaiseVoucherVouchers"));
            context.CreatePermission(PermissionNames.Ap_EnterpriseDataEntry_PostVouchers, L("ApEnterprisePostVouchers"));
            
            context.CreatePermission(PermissionNames.Ap_Reports, L("ApReports"));
            context.CreatePermission(PermissionNames.Ap_Reports_Suppliers, L("ApReportsSuppliers"));
            context.CreatePermission(PermissionNames.Ap_Reports_Statement, L("ApReportsStatement"));
            context.CreatePermission(PermissionNames.Ap_Reports_Aging, L("ApReportsAging"));
            context.CreatePermission(PermissionNames.Ap_Reports_Invoices, L("ApReportsInvoices"));
            context.CreatePermission(PermissionNames.Ap_Reports_Payments, L("ApReportsPayments"));
            context.CreatePermission(PermissionNames.Ap_Reports_Vouchers, L("ApReportsVouchers"));
            context.CreatePermission(PermissionNames.Ap_Reports_InvoiceDetails, L("ApReportsInvoiceDetails"));
            context.CreatePermission(PermissionNames.Ap_Reports_OpeningBalances, L("ApReportsOpeningBalances"));
            context.CreatePermission(PermissionNames.Ap_Reports_DebitMemo, L("ApReportsDebitMemo"));
            context.CreatePermission(PermissionNames.Ap_Enquiries_CanceledInvoices, L("ApEnquiriesCanceledInvoices"));
            context.CreatePermission(PermissionNames.Ap_Enquiries_CanceledPayments, L("ApEnquiriesCanceledPayments"));
            
            //Ar
            context.CreatePermission(PermissionNames.Ar_DataEntry, L("ArDataEntry"));
            context.CreatePermission(PermissionNames.Ar_DataEntry_OpeningBalances, L("ArDataEntryOpeningBalances"));
            context.CreatePermission(PermissionNames.Ar_DataEntry_Invoices, L("ArDataEntryInvoices"));
            context.CreatePermission(PermissionNames.Ar_DataEntry_ChangeInvoiceStatus, L("ArDataEntryChangeInvoiceStatus"));
            context.CreatePermission(PermissionNames.Ar_DataEntry_CancelInvoices, L("ArDataEntryCancelInvoices"));
            context.CreatePermission(PermissionNames.Ar_DataEntry_PostInvoices, L("ArDataEntryPostInvoices"));
            context.CreatePermission(PermissionNames.Ar_DataEntry_Vouchers, L("ArDataEntryVouchers"));
            context.CreatePermission(PermissionNames.Ar_DataEntry_PostVouchers, L("ArDataEntryPostVouchers"));
            context.CreatePermission(PermissionNames.Ar_DataEntry_Payments, L("ArDataEntryPayments"));
            context.CreatePermission(PermissionNames.Ar_DataEntry_PostPayments, L("ArDataEntryPostPayments"));
            context.CreatePermission(PermissionNames.Ar_DataEntry_CancelPayments, L("ArDataEntryCancelPayments"));
            context.CreatePermission(PermissionNames.Ar_DataEntry_WithHoldingPayments, L("ArDataEntryWithHoldingPayments"));
            context.CreatePermission(PermissionNames.Ar_DataEntry_CreditMemo, L("ArDataEntryCreditMemo"));
            context.CreatePermission(PermissionNames.Ar_DataEntry_Quotations, L("ArDataEntryQuotations"));
            context.CreatePermission(PermissionNames.Ar_DataEntry_ApproveInvoices, L("ApproveInvoices"));
            context.CreatePermission(PermissionNames.Ar_Enquiries_InvoiceList, L("ArEnquiriesInvoiceList") );
            context.CreatePermission(PermissionNames.Ar_Enquiries, L("ArEnquiries"));
            context.CreatePermission(PermissionNames.Ar_Enquiries_Payments, L("ArEnquiriesPayments"));
            context.CreatePermission(PermissionNames.Ar_Enquiries_CreditMemo, L("ArEnquiriesCreditMemo"));
            context.CreatePermission(PermissionNames.Ar_Enquiries_OpeningBalance, L("ArEnquiriesOpeningBalance"));
            context.CreatePermission(PermissionNames.Ar_Enquiries_WithHolding, L("ArEnquiriesWithHolding"));
            context.CreatePermission(PermissionNames.Ar_ImportData, L("ArImportData"));
            context.CreatePermission(PermissionNames.Ar_ImportData_CustomerList, L("ArImportData_CustomerList"));
            context.CreatePermission(PermissionNames.Ar_ImportData_OpeningBalance, L("ArImportData_OpeningBalance"));
            context.CreatePermission(PermissionNames.Ar_Reports, L("ArReports"));
            context.CreatePermission(PermissionNames.Ar_DataEntry_EditPostedInvoice , L("ArDataEntryEditPostedInvoice"));
            context.CreatePermission(PermissionNames.Ar_DataEntry_EditInvoice , L("ArDataEntryEditInvoice"));
            context.CreatePermission(PermissionNames.Ar_DataEntry_CreatePayments , L("ArDataEntryCreatePayments"));
            context.CreatePermission(PermissionNames.Ar_DataEntry_EditPayments , L("ArDataEntryEditPayments"));
            context.CreatePermission(PermissionNames.Ar_Enquiries_CanceledInvoices, L("ArEnquiriesCanceledInvoices"));
            context.CreatePermission(PermissionNames.Ar_Enquiries_CanceledPayments, L("ArEnquiriesCanceledPayments"));
            
            //school manger
            context.CreatePermission(PermissionNames.Sm_DataEntry, L("SmDataEntry"));
            context.CreatePermission(PermissionNames.Sm_PromotionsAndResults_CancelResults, L("SmPromotionsAndResultsCancelResults"));
            context.CreatePermission(PermissionNames.Sm_DataEntry_RegisterClass, L("SmDataEntryRegisterClass"));
            context.CreatePermission(PermissionNames.Sm_DataEntry_AssignSubject, L("SmDataEntryAssignSubject"));
            context.CreatePermission(PermissionNames.Sm_DataEntry_TimeTable, L("SmDataEntryTimeTable"));
            context.CreatePermission(PermissionNames.Sm_DataEntry_SubjectRemark, L("SmDataEntrySubjectRemark"));
            context.CreatePermission(PermissionNames.Sm_DataEntry_ClassLevelPercentage, L("SmDataEntryClassLevelPercentage"));
            context.CreatePermission(PermissionNames.Sm_DataEntry_CategoryPercentage, L("SmDataEntryCategoryPercentage"));
            context.CreatePermission(PermissionNames.Sm_DataEntry_PrizeType, L("SmDataEntryPrizeType"));
            context.CreatePermission(PermissionNames.Sm_DataEntry_AwardType, L("SmDataEntryAwardType"));
            context.CreatePermission(PermissionNames.Sm_DataEntry_PrizeAward, L("SmDataEntryPrizeAward"));
            context.CreatePermission(PermissionNames.Sm_DataEntry_LegalGuardian, L("SmDataEntryLegalGuardian"));
            context.CreatePermission(PermissionNames.Sm_DataEntry_DisciplinaryAction, L("SmDataEntryDisciplinaryAction"));
            context.CreatePermission(PermissionNames.Sm_DataEntry_PtaExecutive, L("SmDataEntryPtaExecutive"));
            context.CreatePermission(PermissionNames.Sm_DataEntry_ClassTrip, L("SmDataEntryClassTrip"));
            context.CreatePermission(PermissionNames.Sm_DataEntry_EndOfYearProcedure, L("SmDataEntryEndOfYearProcedure"));
            context.CreatePermission(PermissionNames.Sm_DataEntry_ClassAttendance, L("SmDataEntryClassAttendance"));
            context.CreatePermission(PermissionNames.Sm_DataEntry_MidTermAssessment, L("SmDataEntryMidTermAssessment"));
            context.CreatePermission(PermissionNames.Sm_PromotionsAndResults_EditResults, L("SmPromotionsAndResultsEditResults"));
            context.CreatePermission(PermissionNames.Sm_PromotionsAndResults_AddResults, L("SmPromotionsAndResultsAddResults"));
            context.CreatePermission(PermissionNames.Sm_PromotionsAndResults, L("SmPromotionsAndResults"));
            context.CreatePermission(PermissionNames.Sm_PromotionsAndResults_PromoteStudents, L("SmPromotionsAndResultsPromoteStudents"));
            context.CreatePermission(PermissionNames.Sm_PromotionsAndResults_BehaviorialRemarks, L("SmPromotionsAndResultsBehaviorialRemarks"));
            context.CreatePermission(PermissionNames.Sm_PromotionsAndResults_TeacherRemarks, L("SmPromotionsAndResultsTeacherRemarks"));
            context.CreatePermission(PermissionNames.Sm_PromotionsAndResults_Attendance, L("SmPromotionsAndResultsAttendance"));
            context.CreatePermission(PermissionNames.Sm_PromotionsAndResults_PerformanceSkills, L("SmPromotionsAndResultsPerformanceSkills"));
            context.CreatePermission(PermissionNames.Sm_ImportData, L("SmImportData"));
            context.CreatePermission(PermissionNames.Sm_ImportData_ImportOpeningBalances, L("SmImportOpeningBalances"));
            context.CreatePermission(PermissionNames.Sm_ImportData_ImportResults, L("SmImportResults"));
            context.CreatePermission(PermissionNames.Sm_ImportData_ImportConductAndAttitude, L("SmImportConductAndAttitude"));
            context.CreatePermission(PermissionNames.Sm_ImportData_ImportTeacherRemarks, L("SmImportTeacherRemarks"));
            context.CreatePermission(PermissionNames.Sm_ImportData_ImportAttendance, L("SmImportAttendance"));
            context.CreatePermission(PermissionNames.Sm_ImportData_ImportStudents, L("SmImportStudents"));
            context.CreatePermission(PermissionNames.Sm_StaffSetUps, L("SmStaffSetUps"));
            context.CreatePermission(PermissionNames.Sm_StudentSetUps, L("SmStudentSetUps"));
            
            
            context.CreatePermission(PermissionNames.Pages_Tenants, L("Tenants"), multiTenancySides: MultiTenancySides.Host);
        }

        private static ILocalizableString L(string name)
        {
            return new LocalizableString(name, TopazERPConsts.LocalizationSourceName);
        }
    }
}
