using Akka.Dispatch.SysMsg;
using AutoMapper;
using TopazERP.DomainServices.Ap.ApVouchers.Dto;
using TopazERP.Models.Ledger;
using TopazERP.Models.Payroll;
using TopazERP.Models.Shared;
using TopazERP.Models.Ap;
using TopazERP.Models.Ar;
using TopazERP.Models.Sch;
using TopazERP.Services.Ledger.BankAccounts.Dto;
using TopazERP.Services.Ledger.CoaControls.Dto;
using TopazERP.Services.Ledger.CoaDetails.Dto;
using TopazERP.Services.Ledger.CoaHierachies.Dto;
using TopazERP.Services.Ledger.ImprestCategories.Dto;
using TopazERP.Services.Ledger.PettyCashRecipients.Dto;
using TopazERP.Services.Payroll.AllowanceTypes.Dto;
using TopazERP.Services.Payroll.BikTypes.Dto;
using TopazERP.Services.Payroll.BonusAndOnetimeAllowances.Dto;
using TopazERP.Services.Payroll.DeductionTypes.Dto;
using TopazERP.Services.Payroll.EmployeeAllowances.Dto;
using TopazERP.Services.Payroll.EmployeeBenefitInKinds.Dto;
using TopazERP.Services.Payroll.EmployeeBioDatas.Dto;
using TopazERP.Services.Payroll.EmployeeCategories.Dto;
using TopazERP.Services.Payroll.EmployeeDaysWorkeds.Dto;
using TopazERP.Services.Payroll.EmployeeDeductions.Dto;
using TopazERP.Services.Payroll.EmployeeLoans.Dto;
using TopazERP.Services.Payroll.EmployeeOnetimeDeductions.Dto;
using TopazERP.Services.Payroll.EmployeeRanks.Dto;
using TopazERP.Services.Payroll.EmployeeReliefs.Dto;
using TopazERP.Services.Payroll.EmployeeSalaryAdvances.Dto;
using TopazERP.Services.Payroll.EmployeeSalaryInfos.Dto;
using TopazERP.Services.Payroll.EmployeeSnits.Dto;
using TopazERP.Services.Payroll.Gratuities.Dto;
using TopazERP.Services.Payroll.InitializePayMonths.Dto;
using TopazERP.Services.Payroll.IrsSignatures.Dto;
using TopazERP.Services.Payroll.LoanTypes.Dto;
using TopazERP.Services.Payroll.OvertimeTimeSheets.Dto;
using TopazERP.Services.Payroll.OvertimeTypes.Dto;
using TopazERP.Services.Payroll.PayCalendars.Dto;
using TopazERP.Services.Payroll.SalaryGrades.Dto;
using TopazERP.Services.Payroll.TaxReliefs.Dto;
using TopazERP.Services.Payroll.TaxTables.Dto;
using TopazERP.Services.Shared.Banks.Dto;
using TopazERP.Services.Shared.CompanyProfiles.Dto;
using TopazERP.Services.Shared.CostCenters.Dto;
using TopazERP.Services.Shared.Countries.Dto;
using TopazERP.Services.Shared.CountryStates.Dto;
using TopazERP.Services.Shared.Cties.Dto;
using TopazERP.Services.Shared.Currencies.Dto;
using TopazERP.Services.Shared.CustomerGroups.Dto;
using TopazERP.Services.Shared.Customers.Dto;
using TopazERP.Services.Shared.Departments.Dto;
using TopazERP.Services.Shared.PersonnelStatus.Dto;
using TopazERP.Services.Shared.Relationships.Dto;
using TopazERP.Services.Shared.Religions.Dto;
using TopazERP.Services.Shared.ReportDownloads.Dto;
using TopazERP.Services.Shared.SmsHistories.Dto;
using TopazERP.Services.Shared.SupplierGroups.Dto;
using TopazERP.Services.Shared.Suppliers.Dto;
using TopazERP.Services.Shared.SystemNumbers.Dto;
using TopazERP.Services.Shared.Statuses.Dto;
using TopazERP.Services.Shared.TaxLevies.Dto;
using TopazERP.Services.Ap.OpeningBalances.Dto;
using TopazERP.Services.Ap.ApInvoices.Dto;
using TopazERP.Services.Ap.ApPayment.Dto;
using TopazERP.Services.Ap.ApVouchers.Dto;
using TopazERP.Services.Ap.ApWithHoldingPayments.Dto;
using TopazERP.Services.Ap.DebitMemo.Dto;
using TopazERP.Services.Ar.ArCreditMemos.Dto;
using TopazERP.Services.Ar.ArInvoices.Dto;
using TopazERP.Services.Ar.ArPayments.Dto;
using TopazERP.Services.Ar.ArWithHoldingPayments.Dto;
using TopazERP.Services.Ar.OpeningBalances.Dto;
using TopazERP.Services.Ar.Quotations.Dto;
using TopazERP.Services.Ledger.Budgets.Dto;
using TopazERP.Services.Ledger.DefaultGlNumbers.Dto;
using TopazERP.Services.Ledger.Imprests.Dto;
using TopazERP.Services.Ledger.Journals.Dto;
using TopazERP.Services.Ledger.Vouchers.Dto;
using TopazERP.Services.SchoolManager.AcademicYears.Dto;
using TopazERP.Services.SchoolManager.ActualLevels.Dto;
using TopazERP.Services.SchoolManager.Assignments.Dto;
using TopazERP.Services.SchoolManager.AssignSubjects.Dto;
using TopazERP.Services.SchoolManager.AwardsAndPrizes.Dto;
using TopazERP.Services.SchoolManager.BehavioralAssessments.Dto;
using TopazERP.Services.SchoolManager.BillFooters.Dto;
using TopazERP.Services.SchoolManager.CategoryPercentages.Dto;
using TopazERP.Services.SchoolManager.Certificates.Dto;
using TopazERP.Services.SchoolManager.ChangeStudentStatuses.Dto;
using TopazERP.Services.SchoolManager.ClassAttendances.Dto;
using TopazERP.Services.SchoolManager.ClassesAndStreams.Dto;
using TopazERP.Services.SchoolManager.ClassLevelPercentages.Dto;
using TopazERP.Services.SchoolManager.ClassPromotions.Dto;
using TopazERP.Services.SchoolManager.ClassRooms.Dto;
using TopazERP.Services.SchoolManager.CreditMemos.Dto;
using TopazERP.Services.SchoolManager.LevelsAndClasses.Dto;
using TopazERP.Services.SchoolManager.SchoolProfiles.Dto;
using TopazERP.Services.SchoolManager.Terms.Dto;
using TopazERP.Services.SchoolManager.CutOffs.Dto;
using TopazERP.Services.SchoolManager.DisciplinaryActions.Dto;
using TopazERP.Services.SchoolManager.DistanceGroups.Dto;
using TopazERP.Services.SchoolManager.DistanceUnits.Dto;
using TopazERP.Services.SchoolManager.Excursions.Dto;
using TopazERP.Services.SchoolManager.FeesDescriptions.Dto;
using TopazERP.Services.SchoolManager.FeeSetUps.Dto;
using TopazERP.Services.SchoolManager.Healths.Dto;
using TopazERP.Services.SchoolManager.Hostels.Dto;
using TopazERP.Services.SchoolManager.Houses.Dto;
using TopazERP.Services.SchoolManager.Languages.Dto;
using TopazERP.Services.SchoolManager.Locations.Dto;
using TopazERP.Services.SchoolManager.MidTermAssessments.Dto;
using TopazERP.Services.SchoolManager.NurseryGradings.Dto;
using TopazERP.Services.SchoolManager.Offences.Dto;
using TopazERP.Services.SchoolManager.OpeningBalances.Dto;
using TopazERP.Services.SchoolManager.ParentProfessions.Dto;
using TopazERP.Services.SchoolManager.PaymentMethods.Dto;
using TopazERP.Services.SchoolManager.Payments.Dto;
using TopazERP.Services.SchoolManager.PerformanceAreas.Dto;
using TopazERP.Services.SchoolManager.ProcessBills.Dto;
using TopazERP.Services.SchoolManager.PtaExecutives.Dto;
using TopazERP.Services.SchoolManager.PtaPositions.Dto;
using TopazERP.Services.SchoolManager.RegisterClasses.Dto;
using TopazERP.Services.SchoolManager.RemarkByTeachers.Dto;
using TopazERP.Services.SchoolManager.SchGlAccounts.Dto;
using TopazERP.Services.SchoolManager.SchoolGroups.Dto;
using TopazERP.Services.SchoolManager.StaffBios.Dto;
using TopazERP.Services.SchoolManager.StaffDesignations.Dto;
using TopazERP.Services.SchoolManager.StaffGrades.Dto;
using TopazERP.Services.SchoolManager.StaffPastEmployments.Dto;
using TopazERP.Services.SchoolManager.StaffPastPositions.Dto;
using TopazERP.Services.SchoolManager.StaffQualifications.Dto;
using TopazERP.Services.SchoolManager.StaffRelationships.Dto;
using TopazERP.Services.SchoolManager.StContactRelationships.Dto;
using TopazERP.Services.SchoolManager.StudentAllergies.Dto;
using TopazERP.Services.SchoolManager.StudentBios.Dto;
using TopazERP.Services.SchoolManager.StudentDisabilities.Dto;
using TopazERP.Services.SchoolManager.StudentImmunizations.Dto;
using TopazERP.Services.SchoolManager.StudentMedicals.Dto;
using TopazERP.Services.SchoolManager.StudentPositions.Dto;
using TopazERP.Services.SchoolManager.StudentPromotions.Dto;
using TopazERP.Services.SchoolManager.StudentStatuses.Dto;
using TopazERP.Services.SchoolManager.SubjectRemarks.Dto;
using TopazERP.Services.SchoolManager.Subjects.Dto;
using TopazERP.Services.SchoolManager.SupplementaryItems.Dto;
using TopazERP.Services.SchoolManager.TeacherClasses.Dto;
using TopazERP.Services.SchoolManager.TeacherSubjects.Dto;
using TopazERP.Services.SchoolManager.TerminalSubjects.Dto;
using TopazERP.Services.SchoolManager.TimeTables.Dto;
using TopazERP.Services.SchoolManager.Titles.Dto;
using TopazERP.Services.SchoolManager.TransportationLocations.Dto;
using TopazERP.Services.SchoolManager.TransportationUnits.Dto;


namespace TopazERP
{
    public class MapProfile: Profile
    {
        public MapProfile()
        {

            CreateMap<CreateReportDownloadInput, ReportDownload>();

            

            CreateMap<CreateSupplierGroupInput, SupplierGroup>();
            CreateMap<UpdateSupplierGroupInput, SupplierGroup>();

            CreateMap<CreateCustomerGroupInput, CustomerGroup>();
            CreateMap<UpdateCustomerGroupInput, CustomerGroup>();

            CreateMap<CreateCustomerInput, Customer>();
            CreateMap<UpdateCustomerInput, Customer>();

            CreateMap<CreateSupplierInput, Supplier>();
            CreateMap<UpdateSupplierInput, Supplier>();


            //shared
            CreateMap<SmsHistoryInput, SmsHistory>();

            CreateMap<CreateCurrencyInput, Currency>();
            CreateMap<UpdateCurrencyInput, Currency>();

            CreateMap<CreateRelationshipInput, Relationship>();
            CreateMap<UpdateRelationshipInput, Relationship>();

            CreateMap<CreateReligionInput, Religion>();
            CreateMap<UpdateReligionInput, Religion>();

            CreateMap<CreateSystemNumberInput, SystemNumber>();
            CreateMap<UpdateSystemNumberInput, SystemNumber>();

            CreateMap<CreateCostCenterInput, CostCenter>();
            CreateMap<UpdateCostCenterInput, CostCenter>();

            CreateMap<CreateDepartmentInput, Department>();
            CreateMap<UpdateDepartmentInput, Department>();

            CreateMap<CreateBankInput, Bank>();
            CreateMap<UpdateBankInput, Bank>();


            CreateMap<CreateCountryInput, Country>();
            CreateMap<UpdateCountryInput, Country>();

            CreateMap<CreateCountryStateInput, CountryState>();
            CreateMap<UpdateCountryStateInput, CountryState>();

            CreateMap<CreateCityInput, City>();
            CreateMap<UpdateCityInput, City>();
            
            
            CreateMap<CreateStatusInput, Status>();
            CreateMap<UpdateStatusInput, Status>();
            
            CreateMap<CreateTaxLevyInput, TaxLevy>();
            CreateMap<UpdateTaxLevyInput, TaxLevy>();
            
            //ledger

            CreateMap<CreateBankAccountInput, BankAccount>();
            CreateMap<UpdateBankAccountInput, BankAccount>();

            CreateMap<CreateCoaControlInput, CoaControl>();
            CreateMap<UpdateCoaControlInput, CoaControl>();

            CreateMap<CreateCoaHierachyInput, CoaHierachy>();
            CreateMap<UpdateCoaHierachyInput, CoaHierachy>();

            CreateMap<CreateCoaDetailInput, CoaDetail>();
            CreateMap<UpdateCoaDetailInput, CoaDetail>();

            CreateMap<CreateImprestCategoryInput, ImprestCategory>();
            CreateMap<UpdateImprestCategoryInput, ImprestCategory>();
            
            CreateMap<ImprestDto, Imprest>();

            CreateMap<CreatePettyCashRecipientInput, PettyCashRecipient>();
            CreateMap<UpdatePettyCashRecipientInput, PettyCashRecipient>();
            
            CreateMap<CreateDefaultGlNumberInput, DefaultGlNumber>();
            CreateMap<UpdateDefaultGlNumberInput, DefaultGlNumber>();
            
            CreateMap<CreateJournalInput, Journal>();
            CreateMap<JournalDetailDto, JournalDetail>();
            
            CreateMap<CreateJournalBatchSequenceInput, JournalBatchSequence>();
            
            CreateMap<CreateGlPaymentVoucherInput, GlPaymentVoucher>();
            CreateMap<UpdateGlPaymentVoucherInput, GlPaymentVoucher>();
            
            CreateMap<TopazERP.Services.Ledger.Vouchers.Dto.CreatePettyCashTransactionInput, PettyCashTransaction>();
            CreateMap<TopazERP.Services.Ledger.Vouchers.Dto.UpdatePettyCashTransactionInput, PettyCashTransaction>();
            
            CreateMap<CreateBudgetInput, Budget>();
            CreateMap<UpdateBudgetInput, Budget>();
            
            //payroll

            CreateMap<CreateAllowanceTypeInput, AllowanceType>();
            CreateMap<UpdateAllowanceTypeInput, AllowanceType>();

            CreateMap<CreateEmployeeCategoryInput, EmployeeCategory>();
            CreateMap<UpdateEmployeeCategoryInput, EmployeeCategory>();

            CreateMap<CreateBikTypeInput, BikType>();
            CreateMap<UpdateBikTypeInput, BikType>();

            CreateMap<CreateDeductionTypeInput, DeductionType>();
            CreateMap<UpdateDeductionTypeInput, DeductionType>();

            CreateMap<CreateOvertimeTypeInput, OvertimeType>();
            CreateMap<UpdateOvertimeTypeInput, OvertimeType>();

            CreateMap<CreateEmployeeRankInput, EmployeeRank>();
            CreateMap<UpdateEmployeeRankInput, EmployeeRank>();

            CreateMap<CreateTaxTableInput, TaxTable>();
            CreateMap<UpdateTaxTableInput, TaxTable>();

            CreateMap<CreateGratuityInput, Gratuity>();
            CreateMap<UpdateGratuityInput, Gratuity>();

            CreateMap<CreateLoanTypeInput, LoanType>();
            CreateMap<UpdateLoanTypeInput, LoanType>();

            CreateMap<CreatePayCalendarInput, PayCalendar>();
            CreateMap<UpdatePayCalendarInput, PayCalendar>();

            CreateMap<CreateSalaryGradeInput, SalaryGrade>();
            CreateMap<UpdateSalaryGradeInput, SalaryGrade>();

            CreateMap<CreateTaxReliefInput, TaxRelief>();
            CreateMap<UpdateTaxReliefInput, TaxRelief>();

            CreateMap<CreateInitializePayMonthInput, InitializePayMonth>();

            CreateMap<CreateEmployeeBioDataInput, EmployeeBioData>();
            CreateMap<UpdateEmployeeBioDataInput, EmployeeBioData>();

            CreateMap<CreateEmployeeSalaryInfoInput, EmployeeSalaryInfo>();
            CreateMap<UpdateEmployeeSalaryInfoInput, EmployeeSalaryInfo>();

            CreateMap<CreateEmployeeDaysWorkedInput, EmployeeDaysWorked>();
            CreateMap<UpdateEmployeeDaysWorkedInput, EmployeeDaysWorked>();

            CreateMap<CreateBonusAndOnetimeAllowanceInput, BonusAndOnetimeAllowance>();
            CreateMap<UpdateBonusAndOnetimeAllowanceInput, BonusAndOnetimeAllowance>();

            CreateMap<CreateEmployeeSnitInput, EmployeeSnit>();
            CreateMap<UpdateEmployeeSnitInput, EmployeeSnit>();

            CreateMap<CreateEmployeeDeductionInput, EmployeeDeduction>();
            CreateMap<UpdateEmployeeDeductionInput, EmployeeDeduction>();

            CreateMap<CreateEmployeeAllowanceInput, EmployeeAllowance>();
            CreateMap<UpdateEmployeeAllowanceInput, EmployeeAllowance>();

            CreateMap<CreateEmployeeBenefitInKindInput, EmployeeBenefitInKind>();
            CreateMap<UpdateEmployeeBenefitInKindInput, EmployeeBenefitInKind>();

            CreateMap<CreateEmployeeLoanInput, EmployeeLoan>();
            CreateMap<UpdateEmployeeLoanInput, EmployeeLoan>();

            CreateMap<CreateEmployeeSalaryAdvanceInput, EmployeeSalaryAdvance>();
            CreateMap<UpdateEmployeeSalaryAdvanceInput, EmployeeSalaryAdvance>();

            CreateMap<CreateEmployeeOnetimeDeductionInput, EmployeeOnetimeDeduction>();
            CreateMap<UpdateEmployeeOnetimeDeductionInput, EmployeeOnetimeDeduction>();

            CreateMap<CreateEmployeeReliefInput, EmployeeRelief>();
            CreateMap<UpdateEmployeeReliefInput, EmployeeRelief>();

            CreateMap<CreateOvertimeTimeSheetInput, OvertimeTimeSheet>();
            CreateMap<UpdateOvertimeTimeSheetInput, OvertimeTimeSheet>();

            CreateMap<CreateIrsSignatureInput, IrsSignature>();

            CreateMap<CreateCompanyProfileInput, CompanyProfile>();
            CreateMap<UpdateCompanyProfileInput, CompanyProfile>();
            
            CreateMap<CreatePersonnelStatusInput, PersonnelStatus>();
            CreateMap<UpdatePersonnelStatusInput, PersonnelStatus>();
            
         
            
            //ap
            CreateMap<CreateOpeningBalanceInput, ApOpeningBalance>();
            CreateMap<UpdateOpeningBalanceInput, ApOpeningBalance>();
            CreateMap<CreateInvoiceInput, ApInvoice>();
            CreateMap<UpdateInvoiceInput, ApInvoice>();
            CreateMap<ApInvoiceDto, ApInvoice>();
            CreateMap<CreateApVoucherInput, ApVoucher>();
            CreateMap<UpdateApVoucherInput, ApVoucher>();
            CreateMap<ApVoucherDetailsInput, ApVoucherDetail>();
            CreateMap<CreateApPaymentInput, ApPayment>();
            CreateMap<UpdateApPaymentInput, ApPayment>();
            
            CreateMap<CreateApWithHoldingInput, ApWithHoldingPayment>();
            CreateMap<UpdateApWithHoldingInput, ApWithHoldingPayment>();
            CreateMap<CreateDebitMemoInput, ApDebitMemo>();
            CreateMap<UpdateDebitMemoInput, ApDebitMemo>();

            //ar
            CreateMap<CreateArInvoiceInput, ArInvoice>();
            CreateMap<UpdateArInvoiceInput, ArInvoice>();
            CreateMap<CreateArPaymentInput, ArPayment>();
            CreateMap<UpdateArPaymentInput, ArPayment>();
            CreateMap<CreateArCreditMemoInput, ArCreditMemo>();
            CreateMap<UpdateArCreditMemoInput, ArCreditMemo>();
            CreateMap<CreateArWithHoldingInput, ArWithholdingPayment>();
            CreateMap<UpdateArWithHoldingInput, ArWithholdingPayment>();
            CreateMap<CreateQuotationsInput, Quotation>();
            CreateMap<UpdateQuotaionsInput, Quotation>();
            CreateMap<CreateArOpeningBalanceInput, ArOpeningBalance>();
            CreateMap<UpdateArOpeningBalanceInput, ArOpeningBalance>();
            
            //school manager
            CreateMap<CreateSchoolProfileInput, SchoolProfile>();
            CreateMap<UpdateSchoolProfileInput, SchoolProfile>();
            CreateMap<CreateAcademicYearInput, AcademicYear>();
            CreateMap<UpdateAcademicYearInput, AcademicYear>();
            CreateMap<CreateTermInput, Term>();
            CreateMap<UpdateTermInput, Term>();
            CreateMap<CreateActualLevelInput, ActualLevel>();
            CreateMap<UpdateActualLevelInput, ActualLevel>();
            CreateMap<CreateLevelInput, Level>();
            CreateMap<UpdateLevelInput, Level>();
            CreateMap<CreateLevelClassInput, LevelClass>();
            CreateMap<UpdateLevelClassInput, LevelClass>();
            CreateMap<CreateClassInput, Class>();
            CreateMap<UpdateClassInput, Class>();
            CreateMap<CreateStreamInput, Stream>();
            CreateMap<UpdateStreamInput, Stream>();
            CreateMap<CreateAcademicYearInput, AcademicYear>();
            CreateMap<UpdateAcademicYearInput, AcademicYear>();
            CreateMap<CreateAcademicYearTermInput, AcademicYearTerm>();
            CreateMap<UpdateAcademicYearTermInput, AcademicYearTerm>();
            CreateMap<CreateAcademicYearTermDetailInput, AcademicYearTermDetail>();
            CreateMap<UpdateAcademicYearTermDetailInput, AcademicYearTermDetail>();
            CreateMap<CreateCutOffInput, ConductCutOf>();
            CreateMap<UpdateCutOffInput, ConductCutOf>();
            CreateMap<CreateDisciplinaryActionInput, DisciplinaryAction>();
            CreateMap<UpdateDisciplinaryActionInput, DisciplinaryAction>();
            CreateMap<CreateDistanceUnitInput, DistanceUnit>();
            CreateMap<UpdateDistanceUnitInput, DistanceUnit>();
            CreateMap<CreateHealthInput, Health>();
            CreateMap<UpdateHealthInput, Health>();
            CreateMap<CreateDistanceGroupInput, DistanceGroup>();
            CreateMap<UpdateDistanceGroupInput, DistanceGroup>();
            CreateMap<CreateFeesDescriptionInput, FeesDescription>();
            CreateMap<UpdateFeesDescriptionInput, FeesDescription>();
            CreateMap<CreateLanguageInput, SmLanguage>();
            CreateMap<UpdateLanguageInput, SmLanguage>();
            CreateMap<CreateLocationInput, Location>();
            CreateMap<UpdateLocationInput, Location>();
            CreateMap<CreateSchoolGroupInput, SchoolGroup>();
            CreateMap<UpdateSchoolGroupInput, SchoolGroup>();
            CreateMap<CreateSchoolGroupPositionInput, SchoolGroupPosition>();
            CreateMap<UpdateSchoolGroupPositionInput, SchoolGroupPosition>();
            CreateMap<CreatePerformanceAreaInput, PerformanceArea>();
            CreateMap<UpdatePerformanceAreaInput, PerformanceArea>();
            CreateMap<CreatePerformanceSkillInput, PerformanceSkill>();
            CreateMap<UpdatePerformanceSkillInput, PerformanceSkill>();
            CreateMap<CreateTerminalSubjectInput, TerminalSubject>();
            CreateMap<UpdateTerminalSubjectInput, TerminalSubject>();
            CreateMap<CreateTerminalSubSubjectInput, TerminalSubSubject>();
            CreateMap<UpdateTerminalSubSubjectInput, TerminalSubSubject>();
            CreateMap<CreateNurseryGradingInput, NurseryGrading>();
            CreateMap<UpdateNurseryGradingInput, NurseryGrading>();
            CreateMap<CreateOffenceInput, Offence>();
            CreateMap<UpdateOffenceInput, Offence>();
            CreateMap<CreateParentProfessionInput, ParentProfession>();
            CreateMap<UpdateParentProfessionInput, ParentProfession>();
            CreateMap<CreatePaymentMethodInput, PaymentMethod>();
            CreateMap<UpdatePaymentMethodInput, PaymentMethod>();
            CreateMap<CreatePtaPositionInput, PtaPosition>();
            CreateMap<UpdatePtaPositionInput, PtaPosition>();
            CreateMap<CreateSubjectInput, Subject>();
            CreateMap<UpdateSubjectInput, Subject>();
            CreateMap<CreateSupplementaryItemInput, SupplementaryItem>();
            CreateMap<UpdateSupplementaryItemInput, SupplementaryItem>();
            CreateMap<CreateTitleInput, Title>();
            CreateMap<UpdateTitleInput, Title>();
            CreateMap<CreateTransportationUnitInput, TransportationUnit>();
            CreateMap<UpdateTransportationUnitInput, TransportationUnit>();
            CreateMap<CreateTransportationLocationInput, TransportationLocation>();
            CreateMap<UpdateTransportationLocationInput, TransportationLocation>();
            CreateMap<CreateStaffDesignationInput, StaffDesignation>();
            CreateMap<UpdateStaffDesignationInput, StaffDesignation>();
            CreateMap<CreateStaffBioInput, StaffBio>();
            CreateMap<UpdateStaffBioInput, StaffBio>();
            CreateMap<CreateStaffGradeInput, StaffGrade>();
            CreateMap<UpdateStaffGradeInput, StaffGrade>();
            CreateMap<CreateCertificateInput, Certificate>();
            CreateMap<UpdateCertificateInput, Certificate>();
            //staff
            CreateMap<CreateStaffQualificationInput, StaffQualification>();
            CreateMap<UpdateStaffQualificationInput, StaffQualification>();
            CreateMap<CreateStaffRelationshipInput, StaffRelationship>();
            CreateMap<UpdateStaffRelationshipInput, StaffRelationship>();
            CreateMap<CreateStaffPastPositionInput, StaffPastPosition>();
            CreateMap<UpdateStaffPastPositionInput, StaffPastPosition>();
            CreateMap<CreateStaffPastEmploymentInput, StaffPastEmployment>();
            CreateMap<UpdateStaffPastEmploymentInput, StaffPastEmployment>();
            CreateMap<CreateTeacherClassInput, TeacherClass>();
            CreateMap<UpdateTeacherClassInput, TeacherClass>();
            CreateMap<CreateTeacherSubjectInput, TeacherSubject>();
            CreateMap<UpdateTeacherSubjectInput, TeacherSubject>();
            //student
            CreateMap<CreateStContactRelationshipInput, StContactRelationship>();
            CreateMap<UpdateStContactRelationshipInput, StContactRelationship>();
            CreateMap<CreateAllergyInput, AllergyType>();
            CreateMap<UpdateAllergyInput, AllergyType>();
            CreateMap<CreateStudentAllergyInput, StudentAllergy>();
            CreateMap<UpdateStudentAllergyInput, StudentAllergy>();
            CreateMap<CreateImmunizationInput, ImmunizationType>();
            CreateMap<UpdateImmunizationInput, ImmunizationType>();
            CreateMap<CreateStudentImmunizationInput, StudentImmunization>();
            CreateMap<UpdateStudentImmunizationInput, StudentImmunization>();
            CreateMap<CreatePositionInput, Position>();
            CreateMap<UpdatePositionInput, Position>();
            CreateMap<CreateStudentPositionInput, StudentPosition>();
            CreateMap<UpdateStudentPositionInput, StudentPosition>();
            CreateMap<CreateDisabilityInput, Disability>();
            CreateMap<UpdateDisabilityInput, Disability>();
            CreateMap<CreateStudentDisabilityInput, StudentDisability>();
            CreateMap<UpdateStudentDisabilityInput, StudentDisability>();
            CreateMap<CreateStudentBioInput, StudentInfo>();
            CreateMap<UpdateStudentBioInput, StudentInfo>();
            CreateMap<CreateStudentStatusInput, StudentStatus>();
            CreateMap<UpdateStudentStatusInput, StudentStatus>();
            CreateMap<CreateStudentMedicalInput, StudentMedical>();
            CreateMap<UpdateStudentMedicalInput, StudentMedical>();
            CreateMap<CreateChangeStudentStatusInput, StatusChange>();
            CreateMap<UpdateChangeStudentStatusInput, StatusChange>();
            CreateMap<CreateHostelInput, Hostel>();
            CreateMap<UpdateHostelInput, Hostel>();
            CreateMap<CreateHouseInput, House>();
            CreateMap<UpdateHouseInput, House>();
            CreateMap<CreateClassRoomInput, ClassRoom>();
            CreateMap<UpdateClassRoomInput, ClassRoom>();
            CreateMap<CreateRegisterClassInput, RegisteredClass>();
            CreateMap<UpdateRegisterClassInput, RegisteredClass>();
            CreateMap<CreateAssignSubjectInput, AssignedSubject>();
            CreateMap<UpdateAssignSubjectInput, AssignedSubject>();
            CreateMap<CreateTimeTableInput, TimeTable>();
            CreateMap<UpdateTimeTableInput, TimeTable>();
            CreateMap<CreateSubjectRemarkInput, SubjectRemark>();
            CreateMap<UpdateSubjectRemarkInput, SubjectRemark>();
            CreateMap<CreateClassLevelPercentageInput, ClassLevelPercentage>();
            CreateMap<UpdateClassLevelPercentageInput, ClassLevelPercentage>();
            CreateMap<CreateCategoryPercentageInput, CategoryPercentage>();
            CreateMap<UpdateCategoryPercentageInput, CategoryPercentage>();
            CreateMap<CreatePrizeTypeInput, PrizeType>();
            CreateMap<UpdatePrizeTypeInput, PrizeType>();
            CreateMap<CreateAwardTypeInput, AwardType>();
            CreateMap<UpdateAwardTypeInput, AwardType>();
            CreateMap<CreatePrizeAwardedInput, PrizeAwarded>();
            CreateMap<UpdatePrizeAwardedInput, PrizeAwarded>();
            CreateMap<CreatePtaExecutiveInput, PtaExecutive>();
            CreateMap<UpdatePtaExecutiveInput, PtaExecutive>();
            CreateMap<CreateStudentDiscActionInput, StudentDisciplinaryAction>();
            CreateMap<UpdateStudentDiscActionInput, StudentDisciplinaryAction>();
            CreateMap<CreateExcursionInput, Excursion>();
            CreateMap<UpdateExcursionInput, Excursion>();
            CreateMap<CreateAttendanceInput, Attendance>();
            CreateMap<UpdateAttendanceInput, Attendance>();
            CreateMap<CreateClassPromotionInput, ClassPromotion>();
            CreateMap<CreateAssessmentHeaderInput, AssessmentRemarkHeader>();
            CreateMap<UpdateAssessmentHeaderInput, AssessmentRemarkHeader>();
            CreateMap<CreateMTAssessmentInput, MidTermAssessment>();
            CreateMap<UpdateMTAssessmentInput, MidTermAssessment>();
            CreateMap<CreateStudentOpeningBalanceInput, StudentOpeningBalance>();
            CreateMap<UpdateStudentOpeningBalanceInput, StudentOpeningBalance>();
            CreateMap<CreateAssignmentInput, ClassAssignment>();
            CreateMap<UpdateAssignmentInput, ClassAssignment>();
            CreateMap<CreateBehavioralAssessmentInput, BehavioralAssessment>();
            CreateMap<UpdateBehavioralAssessmentInput, BehavioralAssessment>();
            CreateMap<ImportRemarksDto, RemarksByTeacher>();
            CreateMap<UpdateRemarksInput, RemarksByTeacher>();
            CreateMap<CreateCumulativeAttendanceInput, CumulativeAttendance>();
            CreateMap<UpdateCumulativeAttendanceInput, CumulativeAttendance>();
            CreateMap<CreateResultPeriodInput, ResultPeriod>();
            CreateMap<UpdateResultPeriodInput, ResultPeriod>();
            CreateMap<CreateStudentPerformanceSkill, StudentPerformanceSkill>();
            CreateMap<UpdateStudentPerfomanceSkill, StudentPerformanceSkill>();
            CreateMap<CreateStudentPromotionInput, StudentPromotion>();
            CreateMap<UpdateStudentPromotionInput, StudentPromotion>();
            CreateMap<CreatePreClassPromotionInput, PreClassStudentPromotion>();
            CreateMap<UpdatePreClassPromotionInput, PreClassStudentPromotion>();
            CreateMap<CreateSchBillAccountInput, SchBillAccount>();
            CreateMap<UpdateSchBillAccountInput, SchBillAccount>();
            CreateMap<CreateSchPaymentAccountInput, SchPaymentAccount>();
            CreateMap<UpdateSchPaymentAccountInput, SchPaymentAccount>();
            CreateMap<CreateSchCreditMemoAccountInput, SchCreditMemoAccount>();
            CreateMap<UpdateSchCreditMemoAccountInput, SchCreditMemoAccount>();
            CreateMap<CreateBoardingFeeInput, BoardingFee>();
            CreateMap<UpdateBoardingFeeInput, BoardingFee>();
            CreateMap<CreateBoardingItemInput, BoardingItem>();
            CreateMap<UpdateBoardingItemInput, BoardingItem>();
            CreateMap<CreateFeeSetUpInput, FeeSetUp>();
            CreateMap<UpdateFeeSetUpInput, FeeSetUp>();
            CreateMap<CreateBillInput, Bill>();
            CreateMap<UpdateBillInput, Bill>();
            CreateMap<CreateBillFooterInput, BillFooter>();
            CreateMap<UpdateBillFooterInput, BillFooter>();
            CreateMap<CreatePaymentInput, SchPayment>();
            CreateMap<UpdatePaymentInput, SchPayment>();
            CreateMap<CreateSchMemoInput, SchCreditMemo>();
            CreateMap<UpdateSchMemoInput, SchCreditMemo>();
        }

    }
}
