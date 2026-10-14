using Microsoft.EntityFrameworkCore;
using Abp.Zero.EntityFrameworkCore;
using TopazERP.Authorization.Roles;
using TopazERP.Authorization.Users;
using TopazERP.MultiTenancy;
using System;
using TopazERP.Models.Ledger;
using TopazERP.Models.Stock;
using TopazERP.Models.Shared;
using TopazERP.Models.Payroll;
using TopazERP.Models.Ar;
using TopazERP.Models.Ap;
using TopazERP.Models.Sch;

namespace TopazERP.EntityFrameworkCore
{
    public class TopazERPDbContext : AbpZeroDbContext<Tenant, Role, User, TopazERPDbContext>
    {
        /* Define a DbSet for each entity of the application */
        
        public TopazERPDbContext(DbContextOptions<TopazERPDbContext> options)
            : base(options)
        {
            AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);
            MigrateDatabase();
        }

        //payroll
         
        public DbSet<SalaryAdvanceApplication> SalaryAdvanceApplications { get; set; }
        public DbSet<AllowanceType> AllowanceTypes { get; set; }
        public DbSet<DeductionType> DeductionTypes { get; set; }
        public DbSet<EmployeeCategory> EmployeeCategories { get; set; }
        public DbSet<LoanType> LoanTypes { get; set; }
        public DbSet<TaxRelief> TaxReliefs { get; set; }
        public DbSet<TaxTable> TaxTables { get; set; }
        public DbSet<TaxTableHistory> TaxTableHistory { get; set; }
        public DbSet<EmployeeRank> EmployeeRanks { get; set; }
        public DbSet<Gratuity> Gratuities { get; set; }
        public DbSet<BikType> BikTypes { get; set; }
        public DbSet<PayCalendar> PayCalendars { get; set; }
        public DbSet<SalaryGrade> SalaryGrades { get; set; }
        public DbSet<OvertimeType> OvertimeTypes { get; set; }
        public DbSet<EmployeeDaysWorked> EmployeeDaysWorkeds { get; set; }
        public DbSet<BonusAndOnetimeAllowance> BonusAndOnetimeAllowances { get; set; }
        public DbSet<EmployeeBioData> EmployeeBioDatas { get; set; }
        public DbSet<EmployeeSalaryInfo> EmployeeSalaryInfos { get; set; }
        public DbSet<EmployeeSnit> EmployeeSnits { get; set; }
        public DbSet<EmployeeSalaryAdvance> EmployeeSalaryAdvances { get; set; }
        public DbSet<EmployeeOnetimeDeduction> EmployeeOnetimeDeductions { get; set; }
        public DbSet<LoanApplication> LoanApplications { get; set; }
        public DbSet<EmployeeAllowance> EmployeeAllowances { get; set; }
        public DbSet<EmployeeDeduction> EmployeeDeductions { get; set; }
        public DbSet<EmployeeBenefitInKind> EmployeeBenefitInKinds { get; set; }
        public DbSet<EmployeeRelief> EmployeeReliefs { get; set; }
        public DbSet<OvertimeTimeSheet> OvertimeTimeSheets { get; set; }
        public DbSet<EmployeeLoan> EmployeeLoans { get; set; }
        public DbSet<LoanAmortizationHistory> LoanAmortizationHistory { get; set; }
        public DbSet<InitializePayMonth> InitializePayMonths { get; set; }
        public DbSet<EmployeeLoanRepaymentSchedule> EmployeeLoanRepaymentSchedules { get; set; }
        public DbSet<MonthlyAllowance> MonthlyAllowances { get; set; }
        public DbSet<MonthlyDeduction> MonthlyDeductions { get; set; }
        public DbSet<MonthlyBenefitsInKind> MonthlyBenefitsInKinds { get; set; }
        public DbSet<MonthlyRelief> MonthlyReliefs { get; set; }
        public DbSet<Paymaster> Paymasters { get; set; }
        public DbSet<MonthlyAllowanceHist> MonthlyAllowanceHistory { get; set; }
        public DbSet<MonthlyDeductionHist> MonthlyDeductionHistory { get; set; }
        public DbSet<MonthlyBenefitsInKindHist> MonthlyBenefitsInKindHistory { get; set; }
        public DbSet<MonthlyReliefHist> MonthlyReliefHistory { get; set; }
        public DbSet<PaymasterHist> PaymasterHistory { get; set; }
        public DbSet<MonthlyCumulativeDeductionHist> MonthlyCumulativeDeductionHistory { get; set; }
        public DbSet<MonthlyCumulativeDeduction> MonthlyCumulativeDeductions { get; set; }
        public DbSet<MonthlySsnitDeductionHist> MonthlySsnitDeductionHistory { get; set; }
        public DbSet<MonthlySsnitDeduction> MonthlySsnitDeductions { get; set; }
        public DbSet<MonthlyOnetimeDeduction> MonthlyOnetimeDeductions { get; set; }
        public DbSet<MonthlyOnetimeDeductionHist> MonthlyOnetimeDeductionHistory { get; set; }
        public DbSet<SalaryIncrementHistory> SalaryIncrementHistory { get; set; }
        public DbSet<MonthlyPfDeduction> MonthlyPfDeductions { get; set; }
        public DbSet<MonthlyPfDeductionHist> MonthlyPfDeductionHistory { get; set; }
        public DbSet<MonthlyLoanDeductionHist> MonthlyLoanDeductionHistory { get; set; }
        public DbSet<MonthlyLoanDeduction> MonthlyLoanDeductions { get; set; }
        public DbSet<MonthlyIrsTaxHist> MonthlyIrsTaxHistory { get; set; }
        public DbSet<MonthlyIrsTax> MonthlyIrsTaxes { get; set; }
        public DbSet<MonthlySalaryAdvance> MonthlySalaryAdvances { get; set; }
        public DbSet<MonthlySecPfDeduction> MonthlySecPfDeductions { get; set; }
        public DbSet<MonthlySalaryAdvanceHist> MonthlySalaryAdvanceHistory { get; set; }
        public DbSet<MonthlySecPfDeductionHist> MonthlySecPfDeductionHistory { get; set; }
        public DbSet<MonthlyOvertimeHistory> MonthlyOvertimeHistory { get; set; }
        public DbSet<MonthlyOvertime> MonthlyOvertimes { get; set; }
        public DbSet<MonthlyBonus> MonthlyBonuses { get; set; }
        public DbSet<MonthlyBonusHistory> MonthlyBonusHistory { get; set; }
        public DbSet<IrsSignature> IrsSignatures { get; set; }

        //shared   
        public DbSet<CompanyProfile> CompanyProfiles { get; set; }
        public DbSet<Religion> Religions { get; set; }
        public DbSet<Bank> Banks { get; set; }
        public DbSet<CostCenter> CostCenters { get; set; }
        public DbSet<Currency> Currencies { get; set; }
        public DbSet<Relationship> Relationships { get; set; }
        public DbSet<SystemNumber> SystemNumbers { get; set; }
        public DbSet<SupplierGroup> SupplierGroups { get; set; }
        public DbSet<CustomerGroup> CustomerGroups { get; set; }
        public DbSet<Country> Countries { get; set; }
        public DbSet<CountryState> CountryStates { get; set; }
        public DbSet<City> Cities { get; set; }
        public DbSet<Customer> Customers { get; set; }
        public DbSet<Supplier> Suppliers { get; set; }
        public DbSet<Department> Departments { get; set; }
        public DbSet<Biometric> Biometrics { get; set; }
        public DbSet<ReportDownload> ReportDownloads { get; set; }
        public DbSet<PersonnelStatus> PersonnelStatuses { get; set; }
        public DbSet<Status> Statuses { get; set; }
        public DbSet<TaxLevy> TaxLevies { get; set; }

        //AR Services...
        public DbSet<ArInvoice> ArInvoices { get; set; }
        public DbSet<ArPayment> ArPayments { get; set; }
        public DbSet<ArOpeningBalance> ArOpeningBalances { get; set; }
        public DbSet<ArInvoicePaymentRecords> ArInvoicePaymentRecords { get; set; }
        public DbSet<ArWithholdingPayment> ArWithholdingPayments { get; set; }
        public DbSet<Quotation> Quotations { get; set; }
        public DbSet<ArCreditMemo> CreditMemos { get; set; }
        
        //AP Services...
        public DbSet<ApOpeningBalance> ApOpeningBalances { get; set; }
        public DbSet<ApInvoice> ApInvoices { get; set; }
        public DbSet<ApVoucher> ApVouchers { get; set; }
        public DbSet<ApPayment> ApPayments { get; set; }
        public DbSet<ApWithHoldingPayment> ApWithHoldingPayments { get; set; }
        public DbSet<ApDebitMemo> ApDebitMemos { get; set; }
        public DbSet<ApInvoicePaymentRecords> ApInvoicePaymentRecords { get; set; }
        
        //GL
        public DbSet<CoaHierachy> CoaHierachies { get; set; }
        public DbSet<PettyCashRecipient> PettyCashRecipients { get; set; }
        public DbSet<Budget> Budgets { get; set; }
        public DbSet<Journal> Journals { get; set; }
        public DbSet<JournalDetail> JournalDetails { get; set; }
        public DbSet<DeletedJournal> DeletedJournals { get; set; }
        public DbSet<CoaControl> CoaControls { get; set; }
        public DbSet<CoaDetail> CoaDetails { get; set; }
        public DbSet<PvRetension> PvRetensions { get; set; }
        public DbSet<ImprestCategory> ImprestCategories { get; set; }
        public DbSet<Imprest> Imprests { get; set; }
        public DbSet<ImprestRetirement> ImprestRetirements { get; set; }
        public DbSet<ImprestRetirementDetail> ImprestRetirementDetails { get; set; }
        public DbSet<ImprestRefund> ImprestRefunds { get; set; }
        public DbSet<ImprestWriteoff> ImprestWriteoffs { get; set; }
        public DbSet<AccountingPeriod> AccountingPeriods { get; set; }
        public DbSet<BankAccount> BankAccounts { get; set; }
        public DbSet<AccountBalance> AccountBalances { get; set; }
        public DbSet<JournalHistory> JournalHistories { get; set; }
        public DbSet<DefaultGlNumber> DefaultGlNumbers { get; set; }
        public DbSet<JournalBatchSequence> JournalBatchSequences { get; set; }
        public DbSet<GlPaymentVoucher> GlPaymentVouchers { get; set; }
        public DbSet<PettyCashTransaction> PettyCashTransactions { get; set; }

        //Stock and Inventory Services...
        public DbSet<ItemCategory> ItemCategories { get; set; }
        public DbSet<WareHouse> WareHouses { get; set; }
        public DbSet<ModeOfShipment> ModeOfShipments { get; set; }
        public DbSet<UnitOfMeasurement> UnitOfMeasurements { get; set; }
        public DbSet<InventoryItem> InventoryItems { get; set; }
        public DbSet<StockReceipt> StockReceipts { get; set; }
        public DbSet<PurchaseOrderStatus> PurchaseOrderStatuses { get; set; }
        public DbSet<PurchaseOrder> PurchaseOrders { get; set; }
        public DbSet<StockIssue> StockIssues { get; set; }
        public DbSet<ReturnIssuedStock> ReturnIssuedStocks { get; set; }
        public DbSet<ReturnIssuedStockDetail> ReturnIssuedStockDetails { get; set; }
        public DbSet<StockTransfer> StockTransfers { get; set; }
        
        //sch 
        public DbSet<AcademicYear> AcademicYears { get; set; }
        public DbSet<AcademicYearTerm> AcademicYearTerms { get; set; }
        public DbSet<AcademicYearTermDetail> AcademicYearTermDetails { get; set; }
        public DbSet<Term> Terms { get; set; }
        public DbSet<Level> Levels { get; set; }
        public DbSet<ActualLevel> ActualLevels { get; set; }
        public DbSet<Class> Classes { get; set; }
        public DbSet<LevelClass> LevelClasses { get; set; }
        public DbSet<Stream> Streams { get; set; }
        public DbSet<SchoolProfile> SchoolProfiles { get; set; }
        public DbSet<ConductCutOf> ConductCutOfs { get; set; }
        public DbSet<DisciplinaryAction> DisciplinaryActions { get; set; }
        public DbSet<DistanceUnit> DistanceUnits { get; set; }
        public DbSet<Health> Healths { get; set; }
        public DbSet<DistanceGroup> DistanceGroups { get; set; }
        public DbSet<FeesDescription> FeesDescriptions { get; set; }
        public DbSet<SmLanguage> SmLanguages { get; set; }
        public DbSet<Offence> Offences { get; set; }
        public DbSet<PaymentMethod> PaymentMethods { get; set; }
        public DbSet<NurseryGrading> NurseryGradings { get; set; }
        public DbSet<PerformanceArea> PerformanceAreas { get; set; }
        public DbSet<PerformanceSkill> PerformanceSkills { get; set; }
        public DbSet<PtaPosition> PtaPositions { get; set; }
        public DbSet<ParentProfession> ParentProfessions { get; set; }
        public DbSet<TransportationUnit> TransportationUnits { get; set; }
        public DbSet<Location> Locations { get; set; }
        public DbSet<TransportationLocation> TransportationLocations { get; set; }
        public DbSet<TerminalSubject> TerminalSubjects { get; set; }
        public DbSet<TerminalSubSubject> TerminalSubSubjects { get; set; }
        public DbSet<Title> Titles { get; set; }
        public DbSet<SchoolGroup> SchoolGroups { get; set; }
        public DbSet<SchoolGroupPosition> SchoolGroupPositions { get; set; }
        public DbSet<SupplementaryItem> SupplementaryItems { get; set; }
        public DbSet<Subject> Subjects { get; set; }
        public DbSet<StudentPosition> StudentPositions { get; set; }
        public DbSet<Position> Positions { get; set; }
        public DbSet<StudentAllergy> StudentAllergies { get; set; }
        public DbSet<AllergyType> AllergyTypes { get; set; }
        public DbSet<StudentImmunization> StudentImmunizations { get; set; }
        public DbSet<ImmunizationType> ImmunizationTypes { get; set; }
        public DbSet<StudentDisability> StudentDisabilities { get; set; }
        public DbSet<Disability> Disabilities { get; set; }
        public DbSet<StContactRelationship> StContactRelationships { get; set; }
        public DbSet<StaffDesignation> StaffDesignations { get; set; }
        public DbSet<StaffBio> StaffBios { get; set; }
        public DbSet<Certificate> Certificates { get; set; }
        public DbSet<StaffGrade> StaffGrades { get; set; }
        public DbSet<StaffPastEmployment> StaffPastEmployments { get; set; }
        public DbSet<StaffPastPosition> StaffPastPositions { get; set; }
        public DbSet<StaffQualification> StaffQualifications { get; set; }
        public DbSet<StaffRelationship> StaffRelationships { get; set; }
        public DbSet<TeacherClass> TeacherClasses { get; set; }
        public DbSet<TeacherSubject> TeacherSubjects { get; set; }
        public DbSet<StudentBillInfo> StudentBillInfos { get; set; }
        public DbSet<StudentStatus> StudentStatuses { get; set; }
        public DbSet<StudentMedical> StudentMedicals { get; set; }
        public DbSet<StudentInfo> StudentInfos { get; set; }
        public DbSet<StatusChange> StatusChanges { get; set; }
        public DbSet<Hostel> Hostels { get; set; }
        public DbSet<House> Houses { get; set; }
        public DbSet<ClassRoom> ClassRooms { get; set; }
        public DbSet<RegisteredClass> RegisteredClasses { get; set; }
        public DbSet<AssignedSubject> AssignedSubjects { get; set; }
        public DbSet<TimeTable> TimeTables { get; set; }
        public DbSet<SubjectRemark> SubjectRemarks { get; set; }
        public DbSet<ClassLevelPercentage> ClassLevelPercentages { get; set; }
        public DbSet<CategoryPercentage> CategoryPercentages { get; set; }
        public DbSet<AwardType> AwardTypes { get; set; }
        public DbSet<PrizeAwarded> PrizeAwarded { get; set; }
        public DbSet<PrizeType> PrizeTypes { get; set; }
        public DbSet<PtaExecutive> PtaExecutives { get; set; }
        public DbSet<StudentDisciplinaryAction> StudentDisciplinaryActions { get; set; }
        public DbSet<Excursion> Excursions { get; set; }
        public DbSet<Attendance> Attendances { get; set; }
        public DbSet<ClassPromotion> ClassPromotions { get; set; }
        public DbSet<MidTermAssessment> MidTermAssessments { get; set; }
        public DbSet<AssessmentRemarkHeader> AssessmentRemarkHeaders { get; set; }
        public DbSet<RemarksByTeacher> RemarksByTeachers { get; set; }
        //imports
        public DbSet<StudentOpeningBalance> StudentOpeningBalances { get; set; }
        public DbSet<ClassAssignment> ClassAssignments { get; set; }
        public DbSet<BehavioralAssessment> BehavioralAssessments { get; set; }
        //promotions&Results
        public DbSet<StudentPerformanceSkill> StudentPerformanceSkills { get; set; }
        public DbSet<StudentPromotion> StudentPromotions { get; set; }
        public DbSet<PreClassStudentPromotion> PreClassStudentPromotions { get; set; }
        public DbSet<CumulativeAttendance> CumulativeAttendances { get; set; }
        public DbSet<ResultPeriod> ResultPeriods { get; set; }
        //billing and payments
        public DbSet<Bill> Bills { get; set; }
        public DbSet<BoardingFee> BoardingFees { get; set; }
        public DbSet<BoardingItem> BoardingItems { get; set; }
        public DbSet<FeeSetUp> FeeSetUps { get; set; }
        public DbSet<SchBillAccount> SchBillAccounts { get; set; }
        public DbSet<SchPaymentAccount> SchPaymentAccounts { get; set; }
        public DbSet<SchCreditMemoAccount> SchCreditMemoAccounts { get; set; }
        public DbSet<TransportationBill> TransportationBills { get; set; }
        public DbSet<SchPayment> SchPayments { get; set; }
        public DbSet<SchCreditMemo> SchCreditMemos { get; set; }
        public DbSet<BillFooter> BillFooters { get; set; }

        public void MigrateDatabase()
        {
            // Apply any pending migrations
            Database.Migrate();
        }
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            foreach (var entityType in modelBuilder.Model.GetEntityTypes())
            {
                foreach (var property in entityType.GetProperties())
                {
                    // max char length value in sqlserver
                    if (property.GetMaxLength() == 67108864)
                        // max char length value in postgresql
                        property.SetMaxLength(10485760);
                }
            }
        }
    }
}
