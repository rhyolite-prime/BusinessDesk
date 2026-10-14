using Abp.Domain.Repositories;
using Abp.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using TopazERP.Models.Payroll;
using TopazERP.Models.Shared;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Akka.Actor;
using TopazERP.Actors;
using TopazERP.Actors.MessageModels;
using TopazERP.DomainServices.Payroll.Reports.Dto;

namespace TopazERP.DomainServices.Payroll.Reports
{
    public class ReportManager : Abp.Domain.Services.DomainService, IReportManager
    {

        private readonly IRepository<InitializePayMonth, Guid> _repositoryInitializePayMonth;
        private readonly IRepository<CompanyProfile, Guid> _repositoryCompanyProfile;
        private readonly IRepository<EmployeeLoan, Guid> _repositoryEmployeeLoan;
        private readonly IRepository<EmployeeLoanRepaymentSchedule, Guid> _repositoryEmployeeLoanRepaymentSchedule;
        private readonly IRepository<LoanType, Guid> _repositoryLoanType;
        private readonly IRepository<MonthlyLoanDeduction, Guid> _repositoryMonthlyLoanDeduction;
        private readonly IRepository<MonthlyLoanDeductionHist, Guid> _repositoryMonthlyLoanDeductionHist;
        private readonly IRepository<MonthlyAllowance, Guid> _repositoryMonthlyAllowance;
        private readonly IRepository<MonthlySalaryAdvance, Guid> _repositoryMonthlySalaryAdvance;
        private readonly IRepository<MonthlySalaryAdvanceHist, Guid> _repositoryMonthlySalaryAdvanceHist;
        private readonly IRepository<Paymaster, Guid> _repositoryPaymaster;
        private readonly IRepository<PaymasterHist, Guid> _repositoryPaymasterHist;
        private readonly IRepository<MonthlyCumulativeDeduction, Guid> _repositoryMonthlyCumulativeDeduction;
        private readonly IRepository<MonthlyCumulativeDeductionHist, Guid> _repositoryMonthlyCumulativeDeductionHist;
        private readonly IRepository<MonthlyAllowanceHist, Guid> _repositoryMonthlyAllowanceHist;
        private readonly IRepository<MonthlyDeduction, Guid> _repositoryMonthlyDeduction;
        private readonly IRepository<MonthlyDeductionHist, Guid> _repositoryMonthlyDeductionHist;
        private readonly IRepository<EmployeeDaysWorked, Guid> _repositoryEmployeeDaysWorked;
        private readonly IRepository<EmployeeBioData, Guid> _repositoryEmployeeBioData;
        private readonly IRepository<EmployeeSalaryInfo, Guid> _repositoryEmployeeSalaryInfo;
        private readonly IRepository<EmployeeSnit, Guid> _repositoryEmployeeSnitfo;
        private readonly IRepository<IrsSignature, Guid> _repositoryIrsSignature;
        private readonly IRepository<SalaryGrade, Guid> _repositorySalaryGrade;
        private readonly IRepository<MonthlyRelief, Guid> _repositoryMonthlyRelief;
        private readonly IRepository<MonthlyReliefHist, Guid> _repositoryMonthlyReliefHist;
        private readonly IRepository<MonthlyBenefitsInKind, Guid> _repositoryMonthlyBenefitsInKind;
        private readonly IRepository<MonthlyBenefitsInKindHist, Guid> _repositoryMonthlyBenefitsInKindHist;
        private readonly IRepository<MonthlyOvertime, Guid> _repositoryMonthlyOvertime;
        private readonly IRepository<MonthlyOvertimeHistory, Guid> _repositoryMonthlyOvertimeHist;
        private readonly IRepository<MonthlyBonus, Guid> _repositoryMonthlyBonus;
        private readonly IActorRef _payslipDispatchActorProvider;

        public ReportManager(IRepository<InitializePayMonth, Guid> repositoryInitializePayMonth, TopLevelActors.PayslipDispatchActorProvider payslipDispatchActorProvider, IRepository<CompanyProfile, Guid> repositoryCompanyProfile, IRepository<EmployeeLoan, Guid> repositoryEmployeeLoan, IRepository<LoanType, Guid> repositoryLoanType, IRepository<MonthlyLoanDeduction, Guid> repositoryMonthlyLoanDeduction, IRepository<EmployeeLoanRepaymentSchedule, Guid> repositoryEmployeeLoanRepaymentSchedule, IRepository<MonthlyAllowanceHist, Guid> repositoryMonthlyAllowanceHist, IRepository<Paymaster, Guid> repositoryPaymaster, IRepository<MonthlySalaryAdvance, Guid> repositoryMonthlySalaryAdvance, IRepository<MonthlyCumulativeDeduction, Guid> repositoryMonthlyCumulativeDeduction, IRepository<MonthlyDeduction, Guid> repositoryMonthlyDeduction, IRepository<EmployeeDaysWorked, Guid> repositoryEmployeeDaysWorked, IRepository<EmployeeBioData, Guid> repositoryEmployeeBioData, IRepository<EmployeeSalaryInfo, Guid> repositoryEmployeeSalaryInfo, IRepository<EmployeeSnit, Guid> repositoryEmployeeSnitfo, IRepository<MonthlyAllowance, Guid> repositoryMonthlyAllowance, IRepository<PaymasterHist, Guid> repositoryPaymasterHist, IRepository<IrsSignature, Guid> repositoryIrsSignature, IRepository<SalaryGrade, Guid> repositorySalaryGrade, IRepository<MonthlyRelief, Guid> repositoryMonthlyRelief, IRepository<MonthlyBenefitsInKind, Guid> repositoryMonthlyBenefitsInKind, IRepository<MonthlyOvertime, Guid> repositoryMonthlyOvertime, IRepository<MonthlySalaryAdvanceHist, Guid> repositoryMonthlySalaryAdvanceHist, IRepository<MonthlyLoanDeductionHist, Guid> repositoryMonthlyLoanDeductionHist, IRepository<MonthlyDeductionHist, Guid> repositoryMonthlyDeductionHist, IRepository<MonthlyReliefHist, Guid> repositoryMonthlyReliefHist, IRepository<MonthlyBenefitsInKindHist, Guid> repositoryMonthlyBenefitsInKindHist, IRepository<MonthlyOvertimeHistory, Guid> repositoryMonthlyOvertimeHist, IRepository<MonthlyCumulativeDeductionHist, Guid> repositoryMonthlyCumulativeDeductionHist, IRepository<MonthlyBonus, Guid> repositoryMonthlyBonus)
        {
            _repositoryInitializePayMonth = repositoryInitializePayMonth;
            _repositoryCompanyProfile = repositoryCompanyProfile;
            _repositoryEmployeeLoan = repositoryEmployeeLoan;
            _repositoryLoanType = repositoryLoanType;
            _repositoryMonthlyLoanDeduction = repositoryMonthlyLoanDeduction;
            _repositoryEmployeeLoanRepaymentSchedule = repositoryEmployeeLoanRepaymentSchedule;
            _repositoryMonthlyAllowanceHist = repositoryMonthlyAllowanceHist;
            _repositoryPaymaster = repositoryPaymaster;
            _repositoryMonthlySalaryAdvance = repositoryMonthlySalaryAdvance;
            _repositoryMonthlyCumulativeDeduction = repositoryMonthlyCumulativeDeduction;
            _repositoryMonthlyDeduction = repositoryMonthlyDeduction;
            _repositoryEmployeeDaysWorked = repositoryEmployeeDaysWorked;
            _repositoryEmployeeBioData = repositoryEmployeeBioData;
            _repositoryEmployeeSalaryInfo = repositoryEmployeeSalaryInfo;
            _repositoryEmployeeSnitfo = repositoryEmployeeSnitfo;
            _repositoryMonthlyAllowance = repositoryMonthlyAllowance;
            _repositoryPaymasterHist = repositoryPaymasterHist;
            _repositoryIrsSignature = repositoryIrsSignature;
            _repositorySalaryGrade = repositorySalaryGrade;
            _repositoryMonthlyRelief = repositoryMonthlyRelief;
            _repositoryMonthlyBenefitsInKind = repositoryMonthlyBenefitsInKind;
            _repositoryMonthlyOvertime = repositoryMonthlyOvertime;
            _repositoryMonthlySalaryAdvanceHist = repositoryMonthlySalaryAdvanceHist;
            _repositoryMonthlyLoanDeductionHist = repositoryMonthlyLoanDeductionHist;
            _repositoryMonthlyDeductionHist = repositoryMonthlyDeductionHist;
            _repositoryMonthlyReliefHist = repositoryMonthlyReliefHist;
            _repositoryMonthlyBenefitsInKindHist = repositoryMonthlyBenefitsInKindHist;
            _repositoryMonthlyOvertimeHist = repositoryMonthlyOvertimeHist;
            _repositoryMonthlyCumulativeDeductionHist = repositoryMonthlyCumulativeDeductionHist;
            _payslipDispatchActorProvider = payslipDispatchActorProvider();
            _repositoryMonthlyBonus = repositoryMonthlyBonus;
        }

        public async Task<object> GetReportHeader(string title)
        {
            var datta = await _repositoryCompanyProfile.GetAllListAsync();
            return datta.Select(a => new { a.CompanyName, PrimaryPhoneNo = $"Tel: {a.PhoneNo}", a.Address, Email = $"Email: {a.Email}", ReportTitle = title }).ToList();
        }

        public async Task<object> GetLoanDeductions()
        {
            var currentPayMonth = await _repositoryInitializePayMonth.GetAll().FirstOrDefaultAsync();

            var currentDate = new DateTime(currentPayMonth.Year, currentPayMonth.Month, 1).ToString("MMMM, yyyy");

            var employeeLoans = await _repositoryEmployeeLoan.GetAllListAsync(x => x.IsApproved);
            var loanTypes = await _repositoryLoanType.GetAllListAsync();
            var monthlyLoanDeduction = await _repositoryMonthlyLoanDeduction.GetAllListAsync(b => b.Month == currentPayMonth.Month && b.Year == currentPayMonth.Year);

            var query = from u1 in employeeLoans
                        join u2 in monthlyLoanDeduction on u1.Id equals u2.EmployeeLoanId
                        join u3 in loanTypes on u1.LoanTypeId equals u3.Id
                        select new
                        {
                            u2.EmployeeName,
                            u2.EmployeeIdentifier,
                            LoanTypeName = "Loan Type: " + u2.LoanTypeName,
                            LoanDate = u1.LoanDate.ToString("dd-MMM-yyyy"),
                            PrincipalLoanAmount = u1.Amount,
                            u1.InterestCharges,
                            u2.PrincipalPayment,
                            u2.InterestPayment,
                            TotalRepayment = u2.MonthlyPayment,
                            OutstandingBalance = u1.CurrentBalance,
                            u2.EmployeeDepartment
                        };

            return new
            {
                data = query.ToList(),
                currentDate
            };

        }

        public async Task<object> GetLoanDeductions(Guid loanTypeId)
        {
            var currentPayMonth = await _repositoryInitializePayMonth.GetAll().FirstOrDefaultAsync();

            var currentDate = new DateTime(currentPayMonth.Year, currentPayMonth.Month, 1).ToString("MMMM, yyyy");

            var employeeLoans = await _repositoryEmployeeLoan.GetAllListAsync(x => x.LoanTypeId == loanTypeId && x.IsApproved);
            var monthlyLoanDeduction = await _repositoryMonthlyLoanDeduction.GetAllListAsync(b => b.Month == currentPayMonth.Month && b.Year == currentPayMonth.Year);

            var query = from u1 in employeeLoans
                        join u2 in monthlyLoanDeduction on u1.Id equals u2.EmployeeLoanId
                        select new
                        {
                            u2.EmployeeName,
                            u2.EmployeeIdentifier,
                            LoanTypeName = "Loan Type: " + u2.LoanTypeName,
                            LoanDate = u1.LoanDate.ToString("dd-MMM-yyyy"),
                            PrincipalLoanAmount = u1.Amount,
                            u1.InterestCharges,
                            u2.PrincipalPayment,
                            u2.InterestPayment,
                            TotalRepayment = u2.MonthlyPayment,
                            OutstandingBalance = u1.CurrentBalance,
                        };

            return new
            {
                data = query.ToList(),
                currentDate
            };

        }

        public async Task<object> GetEmployeeLoans(DateTime startDate, DateTime endDate)
        {
            var currentPayMonth = await _repositoryInitializePayMonth.GetAll().FirstOrDefaultAsync();

            var currentDate = new DateTime(currentPayMonth.Year, currentPayMonth.Month, 1).ToString("MMMM, yyyy");

            var employeeLoans = await _repositoryEmployeeLoan.GetAllListAsync(a => a.LoanDate >= startDate && a.LoanDate <= endDate && a.IsApproved);

            var query = from u1 in employeeLoans
                        select new
                        {
                            u1.EmployeeName,
                            u1.EmployeeIdentifier,
                            u1.LoanTypeName,
                            LoanDate = u1.LoanDate.ToString("dd-MMM-yyyy"),
                            u1.MonthlyDeduction,
                            u1.Duration,
                            u1.InterestCharges,
                            u1.AnnualInterestRate,
                            u1.Amount

                        };
            return new
            {
                data = query.ToList(),
                currentDate
            };
        }
        
        public async Task<object> GetEmployeeLoans(Guid employeeId, DateTime startDate, DateTime endDate)
        {
            var currentPayMonth = await _repositoryInitializePayMonth.GetAll().FirstOrDefaultAsync();

       
            var currentDate = new DateTime(currentPayMonth.Year, currentPayMonth.Month, 1).ToString("MMMM, yyyy");

        
            var employeeLoans = await _repositoryEmployeeLoan.GetAllListAsync(x =>x.LoanDate >= startDate && x.LoanDate <= endDate && x.EmployeeId == employeeId && x.IsApproved);

         
            var monthlyLoanDeduction = await _repositoryMonthlyLoanDeduction.GetAllListAsync(b => b.EmployeeId == employeeId);

            // Join employee loans with monthly loan deductions
            var query = from u1 in employeeLoans
                join u2 in monthlyLoanDeduction on u1.Id equals u2.EmployeeLoanId
                select new
                {
                    u2.EmployeeName,
                    u2.EmployeeIdentifier,
                    LoanTypeName = "Loan Type: " + u2.LoanTypeName,
                    LoanDate = u1.LoanDate.ToString("dd-MMM-yyyy"),
                    u1.Amount,
                    u1.InterestCharges,
                    u1.AnnualInterestRate,
                    u2.PrincipalPayment,
                    u2.InterestPayment,
                    TotalRepayment = u2.MonthlyPayment,
                    OutstandingBalance = u1.CurrentBalance,
                };

            return new
            {
                data = query.ToList(),
                currentDate
            };
        }
        

        public async Task<object> GetEmployeeLoans(DateTime startDate, DateTime endDate, Guid loanTypeId)
        {
            var currentPayMonth = await _repositoryInitializePayMonth.GetAll().FirstOrDefaultAsync();

       
            var currentDate = new DateTime(currentPayMonth.Year, currentPayMonth.Month, 1).ToString("MMMM, yyyy");

        
            var employeeLoans = await _repositoryEmployeeLoan.GetAllListAsync(x =>x.LoanDate >= startDate && x.LoanDate <= endDate && x.LoanTypeId == loanTypeId && x.IsApproved);

         
            var monthlyLoanDeduction = await _repositoryMonthlyLoanDeduction.GetAllListAsync(b => b.LoanTypeId == loanTypeId);

            // Join employee loans with monthly loan deductions
            var query = from u1 in employeeLoans
                join u2 in monthlyLoanDeduction on u1.Id equals u2.EmployeeLoanId
                select new
                {
                    u2.EmployeeName,
                    u2.EmployeeIdentifier,
                    LoanTypeName = "Loan Type: " + u2.LoanTypeName,
                    LoanDate = u1.LoanDate.ToString("dd-MMM-yyyy"),
                    u1.Amount,
                    u1.InterestCharges,
                    u2.PrincipalPayment,
                    u2.InterestPayment,
                    TotalRepayment = u2.MonthlyPayment,
                    OutstandingBalance = u1.CurrentBalance,
                };

            return new
            {
                data = query.ToList(),
                currentDate
            };
        }

        public async Task<object> GetMonthlyLoanPayout(Guid loanTypeId)
        {
            var currentPayMonth = await _repositoryInitializePayMonth.GetAll().FirstOrDefaultAsync();

            var currentDate = new DateTime(currentPayMonth.Year, currentPayMonth.Month, 1).ToString("MMMM, yyyy");

            var monthlyLoanDeduction = await _repositoryMonthlyLoanDeduction.GetAllListAsync(b => b.Month == currentPayMonth.Month && b.Year == currentPayMonth.Year && b.LoanTypeId == loanTypeId);

            return new
            {
                data = monthlyLoanDeduction,
                currentDate
            };
        }

        public async Task<object> GetOutstandingLoans()
        {
            var currentPayMonth = await _repositoryInitializePayMonth.GetAll().FirstOrDefaultAsync();

            var currentDate = new DateTime(currentPayMonth.Year, currentPayMonth.Month, 1).ToString("MMMM, yyyy");

            var employeeLoans = await _repositoryEmployeeLoan.GetAllListAsync(a => a.CurrentBalance > 0 && a.IsApproved && a.LoanDate.Month == currentPayMonth.Month && a.LoanDate.Year == currentPayMonth.Year);


            var query = from u1 in employeeLoans
                        select new
                        {
                            u1.Id,
                            u1.EmployeeId,
                            u1.EmployeeIdentifier,
                            u1.EmployeeName,
                            u1.EmployeeCategory,
                            u1.EmployeeDepartment,
                            LoanDate = u1.LoanDate.ToString("dd-MMM-yyyy"),
                            LoanAmount = u1.Amount,
                            u1.InterestCharges,
                            u1.AnnualInterestRate,
                            u1.MonthlyDeduction,
                            u1.CurrentBalance,
                            u1.LoanTypeName,
                            Period = u1.NextDeduction,
                        };


            return new
            {
                data = query.ToList(),
                currentDate
            };
        }

        public async Task<object> GetOutstandingLoans(Guid employeeId, Guid loanTypeId)
        {
            var currentPayMonth = await _repositoryInitializePayMonth.GetAll().FirstOrDefaultAsync();

            var currentDate = new DateTime(currentPayMonth.Year, currentPayMonth.Month, 1).ToString("MMMM, yyyy");

            var predicateBuilder = PredicateBuilder.New<EmployeeLoan>();

            predicateBuilder.And(a => !a.IsDeleted && a.CurrentBalance > 0 && a.IsApproved && a.LoanDate.Month == currentPayMonth.Month && a.LoanDate.Year == currentPayMonth.Year);

            if (employeeId != Guid.Empty)
            {
                predicateBuilder.And(a => a.EmployeeId == employeeId);

            }

            if (loanTypeId != Guid.Empty)
            {
                predicateBuilder.And(a => a.LoanTypeId == loanTypeId);

            }

            var employeeLoans = await _repositoryEmployeeLoan.GetAllListAsync(predicateBuilder);

            var query = from u1 in employeeLoans

                        select new
                        {
                            u1.Id,
                            u1.EmployeeId,
                            u1.EmployeeIdentifier,
                            u1.EmployeeName,
                            LoanDate = u1.LoanDate.ToString("dd-MMM-yyyy"),
                            LoanAmount = u1.Amount,
                            u1.InterestCharges,
                            u1.AnnualInterestRate,
                            u1.MonthlyDeduction,
                            u1.CurrentBalance,
                            u1.LoanTypeName,
                            Period = u1.NextDeduction,
                        };


            return new
            {
                data = query.ToList(),
                currentDate
            };
        }

        public async Task<object> GetAllowances()
        {
            var currentPayMonth = await _repositoryInitializePayMonth.GetAll().FirstOrDefaultAsync();

            var currentDate = new DateTime(currentPayMonth.Year, currentPayMonth.Month, 1).ToString("MMMM, yyyy");

            var monthlyAllowances = await _repositoryMonthlyAllowance.GetAllListAsync(a => a.Month == currentPayMonth.Month && a.Year == currentPayMonth.Year);

            var query = from u1 in monthlyAllowances
                        select new
                        {
                            u1.Id,
                            u1.EmployeeId,
                            u1.EmployeeIdentifier,
                            u1.EmployeeName,
                            u1.EmployeeCategory,
                            u1.EmployeeDepartment,
                            u1.Amount,
                            u1.AllowanceTypeName,
                            IsTaxable = u1.Taxable ? "Yes" : "No",

                        };

            return new
            {
                data = query.ToList(),
                currentDate
            };


        }

        public async Task<object> GetAllowances(Guid allowanceTypeId)
        {
            var currentPayMonth = await _repositoryInitializePayMonth.GetAll().FirstOrDefaultAsync();

            var currentDate = new DateTime(currentPayMonth.Year, currentPayMonth.Month, 1).ToString("MMMM, yyyy");

            var monthlyAllowances = await _repositoryMonthlyAllowance.GetAllListAsync(a => a.AllowanceTypeId == allowanceTypeId && a.Month == currentPayMonth.Month && a.Year == currentPayMonth.Year && a.Month == currentPayMonth.Month && a.Year == currentPayMonth.Year);

            var query = from u1 in monthlyAllowances
                        select new
                        {
                            u1.Id,
                            u1.EmployeeId,
                            u1.EmployeeIdentifier,
                            u1.EmployeeName,
                            u1.EmployeeCategory,
                            u1.EmployeeDepartment,
                            u1.Amount,
                            u1.AllowanceTypeName,
                            IsTaxable = u1.Taxable ? "Yes" : "No",

                        };

            return new
            {
                data = query.ToList(),
                currentDate
            };


        }

        public async Task<object> GetPayRegister()
        {

            var currentPayMonth = await _repositoryInitializePayMonth.GetAll().FirstOrDefaultAsync();

            var currentDate = new DateTime(currentPayMonth.Year, currentPayMonth.Month, 1).ToString("MMMM, yyyy");

            var paymaster = await _repositoryPaymaster.GetAllListAsync(x => x.Month == currentPayMonth.Month && x.Year == currentPayMonth.Year);

            var query = from u1 in paymaster
                orderby u1.EmployeeName
                        select new
                        {

                            u1.EmployeeIdentifier,
                            u1.EmployeeName,
                            u1.EmployeeDepartment,
                            u1.BasicSalary,
                            IncomeTax = u1.IRSTax,
                            u1.EmployeeSSFDeduction,
                            u1.EmployeeProvidentFundContribution,
                            u1.OneTimeDeduction,
                            u1.NetSalary,
                            Allowances = u1.NonTaxableAllowance + u1.TaxableAllowance,
                            GrossSalary = u1.BasicSalary + u1.NonTaxableAllowance + u1.TaxableAllowance,
                            OtherDeductions = u1.OneTimeDeduction + u1.LoanDeduction + u1.EmployeeSecProvidentFundContribution,
                            TotalDeduction = u1.IRSTax + u1.OneTimeDeduction + u1.LoanDeduction + u1.EmployeeProvidentFundContribution + u1.EmployeeSSFDeduction + u1.EmployeeProvidentFundContribution,
                            u1.EmployeeCategory

                        };

            return new
            {
                data = query.ToList(),
                currentDate
            };
        }

        public async Task<object> GetSalaryAdvance()
        {
            var currentPayMonth = await _repositoryInitializePayMonth.GetAll().FirstOrDefaultAsync();

            var currentDate = new DateTime(currentPayMonth.Year, currentPayMonth.Month, 1).ToString("MMMM, yyyy");

            var salaryAdvance = await _repositoryMonthlySalaryAdvance.GetAllListAsync(x => x.Month == currentPayMonth.Month && x.Year == currentPayMonth.Year);

            var query = from u1 in salaryAdvance
                        orderby u1.EmployeeName
                        select new
                        {
                            u1.Id,
                            u1.EmployeeId,
                            u1.EmployeeIdentifier,
                            u1.EmployeeName,
                            u1.EmployeeCategory,
                            u1.EmployeeDepartment,
                            u1.Amount,
                            LoanDate = u1.LoanDate.ToString("dd-MMM-yyyy"),

                        };

            return new
            {
                data = query.ToList(),
                currentDate
            };
        }

        public async Task<object> GetPaySlip(Guid employeeId, string payslipType)
        {
            var employeeReliefs = new object();

            var grossPay = 0M;

            var employeeAllowances = new object();

            var currentPayMonth = await _repositoryInitializePayMonth.GetAll().FirstOrDefaultAsync();

            var currentDate = new DateTime(currentPayMonth.Year, currentPayMonth.Month, 1).ToString("MMMM, yyyy");

            var paymaster = await _repositoryPaymaster.GetAllListAsync(x => x.Month == currentPayMonth.Month && x.Year == currentPayMonth.Year && x.EmployeeId == employeeId);

            var employeeBioData = await _repositoryEmployeeBioData.GetAllListAsync(x => x.Id == employeeId);

            var employeeSalaryInfo = await _repositoryEmployeeSalaryInfo.GetAllListAsync(x => x.EmployeeId == employeeId);
            
            var bonusAndOnetimeAllowance = await _repositoryMonthlyBonus.GetAllListAsync(x => x.EmployeeId == employeeId && x.Month == currentPayMonth.Month && x.Year == currentPayMonth.Year);

            var salaryGrades = await _repositorySalaryGrade.GetAllListAsync();

            var employeeSnitInfo = await _repositoryEmployeeSnitfo.GetAllListAsync( x=> x.EmployeeId == employeeId);

            var monthlyAllowances = await _repositoryMonthlyAllowance.GetAllListAsync(x=> x.EmployeeId == employeeId && x.Month == currentPayMonth.Month && x.Year == currentPayMonth.Year);

            //:basic payslip
            var payslipBaicInfo = (from u1 in employeeSalaryInfo
                                   join u2 in employeeBioData on u1.EmployeeId equals u2.Id
                                   join u3 in employeeSnitInfo on u1.EmployeeId equals u3.EmployeeId into aa
                                   from h in aa.DefaultIfEmpty()

                                   select new
                                   {
                                       AnnualSalary = u1.MonthlySalary * 12,
                                       u2.DepartmentName,
                                       SalaryGradeName = string.IsNullOrEmpty(u2.SalaryGradeName) ? string.Empty : u2.SalaryGradeName,
                                       u1.EmployeeIdentifier,
                                       u1.EmployeeName,
                                       u1.AccountNumber,
                                       SocialSecurityNo = h == null ? "--" : h.SocialSecurityNo,
                                       Currency = string.IsNullOrEmpty(u1.CurrencyName) ? string.Empty : u1.CurrencyName,
                                       u1.BankName,
                                       u1.BankBranchName,
                                       u2.SalaryNotchName,
                                       
                                   }).ToList();

            //all deductions, :basic payslip
            var employeeDeductions = await _repositoryMonthlyCumulativeDeduction.GetAllListAsync(a => a.EmployeeId == employeeId && a.Month == currentPayMonth.Month && a.Year == currentPayMonth.Year && a.Amount > 0);

            paymaster.ForEach(v => {

                grossPay += v.BasicSalary + v.NonTaxableAllowance + v.TaxableAllowance + v.NonTaxableOverTime + v.TaxableOverTime + v.BenefitsInKind;

            });

            switch (payslipType)
            {
                case "basic":

                    return new
                    {
                        payslipBaicInfo,
                        employeeDeductions,
                        paymaster,
                        bonusAndOnetimeAllowance,
                        currentDate,
                        grossPay
                    };

                case "type-i":

                    employeeAllowances = (from u1 in monthlyAllowances
                                          select new
                                          {
                                              u1.Amount,
                                              u1.AllowanceTypeName,
                                              Taxable = u1.Taxable ? "Y" : "N",
                                          }).ToList();

                    return new
                    {
                        payslipBaicInfo,
                        employeeDeductions,
                        employeeAllowances,
                        bonusAndOnetimeAllowance,
                        paymaster,
                        currentDate,
                        grossPay

                    };


                case "type-ii":

                    employeeAllowances = (from u1 in monthlyAllowances
                                          select new
                                          {
                                              u1.Amount,
                                              u1.AllowanceTypeName,
                                              Taxable = u1.Taxable ? "Y" : "N",
                                          }).ToList();

                    employeeReliefs = await _repositoryMonthlyRelief.GetAllListAsync(a => a.EmployeeId == employeeId && a.Month == currentPayMonth.Month && a.Year == currentPayMonth.Year && a.Amount > 0);

                    return new
                    {
                        payslipBaicInfo,
                        employeeDeductions,
                        employeeAllowances,
                        employeeReliefs,
                        bonusAndOnetimeAllowance,
                        paymaster,
                        currentDate,
                        grossPay
                    };

                case "type-iii":

                    employeeAllowances = (from u1 in monthlyAllowances
                                          select new
                                          {
                                              u1.Amount,
                                              u1.AllowanceTypeName,
                                              Taxable = u1.Taxable ? "Y" : "N",
                                          }).ToList();

                    employeeReliefs = await _repositoryMonthlyRelief.GetAllListAsync(a => a.EmployeeId == employeeId && a.Month == currentPayMonth.Month && a.Year == currentPayMonth.Year && a.Amount > 0);

                    var employeeBenefitsInKind = await _repositoryMonthlyBenefitsInKind.GetAllListAsync(a => a.EmployeeId == employeeId && a.Month == currentPayMonth.Month && currentPayMonth.Year == a.Year && a.Amount > 0);

                    var employeeLoans = await _repositoryMonthlyLoanDeduction.GetAllListAsync(a => a.EmployeeId == employeeId && a.Month == currentPayMonth.Month && currentPayMonth.Year == a.Year && a.LoanAmount > 0);

                    var employeeSalaryAdvance = await _repositoryMonthlySalaryAdvance.GetAllListAsync(a => a.EmployeeId == employeeId && a.Month == currentPayMonth.Month && a.Year == currentPayMonth.Year && a.Amount > 0);

                    var employeeOvertime = await _repositoryMonthlyOvertime.GetAllListAsync(a => a.EmployeeId == employeeId && a.Month == currentPayMonth.Month && a.Year == currentPayMonth.Year && a.Amount > 0);

                    return new
                    {
                        payslipBaicInfo,
                        employeeDeductions,
                        employeeAllowances,
                        employeeReliefs,
                        employeeBenefitsInKind,
                        employeeLoans,
                        bonusAndOnetimeAllowance,
                        employeeSalaryAdvance,
                        employeeOvertime,
                        paymaster,
                        currentDate,
                        grossPay
                    };

                default:
                    return new
                    {
                        payslipBaicInfo,
                        employeeDeductions,
                        paymaster,
                        currentDate,
                        grossPay
                    };
            };


        }

        public async Task PreProcessPayslips(PayslipDispatchDto dto)
        {
           
            var grossPay = 0M;

            var currentPayMonth = await _repositoryInitializePayMonth.GetAll().FirstOrDefaultAsync();

            var currentDate = new DateTime(currentPayMonth.Year, currentPayMonth.Month, 1).ToString("MMMM, yyyy");
           
            var companyProfile = await _repositoryCompanyProfile.GetAll().FirstOrDefaultAsync();
            
              var reportHeader = new ReportHeader
              {
                  CompanyName = companyProfile.CompanyName,
                  PrimaryPhoneNo = $"Tel: {companyProfile.PhoneNo}",
                  Address = companyProfile.Address,
                  Email = $"Email: {companyProfile.Email}",
                  ReportTitle = $"Payslip : {currentDate}"
              };

              var smtpCredentials = new SmtpCredentials
              {
                  PrimaryEmailAddress = companyProfile.PrimaryEmailAddress,
                  EmailPassword = companyProfile.EmailPassword,
                  MailHostName =  companyProfile.MailHostName,
                  PortNumber =  companyProfile.PortNumber,
                  IsSSLEnabled =  companyProfile.IsSSLEnabled,
                  DefaultFromDisplayName = companyProfile.CompanyName
              };
            
            List<EmployeePayslip> payslipList = new List<EmployeePayslip>();
            
            foreach (var employeeId in dto.EmployeeIds)
            {
                
                var paymaster = await _repositoryPaymaster.GetAllListAsync(x => x.Month == currentPayMonth.Month && x.Year == currentPayMonth.Year && x.EmployeeId == employeeId);

                var employeeBioData = await _repositoryEmployeeBioData.GetAllListAsync(x => x.Id == employeeId);

                var employeeSalaryInfo = await _repositoryEmployeeSalaryInfo.GetAllListAsync(x => x.EmployeeId == employeeId);

                var salaryGrades = await _repositorySalaryGrade.GetAllListAsync();

                var employeeSnitInfo = await _repositoryEmployeeSnitfo.GetAllListAsync( x=> x.EmployeeId == employeeId);

                var monthlyAllowances = await _repositoryMonthlyAllowance.GetAllListAsync(x=> x.EmployeeId == employeeId && x.Month == currentPayMonth.Month && x.Year == currentPayMonth.Year);

                var payslipBasicInfo = (from u1 in employeeSalaryInfo
                    join u2 in employeeBioData on u1.EmployeeId equals u2.Id
                    join u3 in employeeSnitInfo on u1.EmployeeId equals u3.EmployeeId into aa
                    from h in aa.DefaultIfEmpty()

                    select new PayslipBasicInfo
                    {
                        AnnualSalary = u1.MonthlySalary * 12,
                        DepartmentName = u2.DepartmentName,
                        SalaryGradeName = string.IsNullOrEmpty(u2.SalaryGradeName) ? string.Empty : u2.SalaryGradeName,
                        EmployeeIdentifier = u1.EmployeeIdentifier,
                        EmployeeName = u1.EmployeeName,
                        AccountNumber = u1.AccountNumber,
                        SocialSecurityNo = h == null ? "--" : h.SocialSecurityNo,
                        Currency = string.IsNullOrEmpty(u1.CurrencyName) ? string.Empty : u1.CurrencyName,
                        BankName = u1.BankName,
                        BankBranchName = u1.BankBranchName,
                        EmailAddress = u2.PersonalEmail
                        
                    }).FirstOrDefault();

                //all deductions, :basic payslip
                var employeeDeductions = await _repositoryMonthlyCumulativeDeduction.GetAllListAsync(a => a.EmployeeId == employeeId && a.Month == currentPayMonth.Month && a.Year == currentPayMonth.Year && a.Amount > 0);

                paymaster.ForEach(v => {

                    grossPay += v.BasicSalary + v.NonTaxableAllowance + v.TaxableAllowance + v.NonTaxableOverTime + v.TaxableOverTime + v.BenefitsInKind;

                });
                
                
                var employeeAllowances = (from u1 in monthlyAllowances
                    select new EmployeePayslipAllowance
                    {
                        Amount = u1.Amount,
                        AllowanceTypeName = u1.AllowanceTypeName,
                        Taxable = u1.Taxable ? "Y" : "N",
                         
                    }).ToList();
                
                 
                var employeeReliefs = await _repositoryMonthlyRelief.GetAllListAsync(a => a.EmployeeId == employeeId && a.Month == currentPayMonth.Month && a.Year == currentPayMonth.Year && a.Amount > 0);

                var employeeBenefitsInKind = await _repositoryMonthlyBenefitsInKind.GetAllListAsync(a => a.EmployeeId == employeeId && a.Month == currentPayMonth.Month && currentPayMonth.Year == a.Year && a.Amount > 0);

                var employeeLoans = await _repositoryMonthlyLoanDeduction.GetAllListAsync(a => a.EmployeeId == employeeId && a.Month == currentPayMonth.Month && currentPayMonth.Year == a.Year && a.LoanAmount > 0);

                var employeeSalaryAdvance = await _repositoryMonthlySalaryAdvance.GetAllListAsync(a => a.EmployeeId == employeeId && a.Month == currentPayMonth.Month && a.Year == currentPayMonth.Year && a.Amount > 0);

                var employeeOvertime = await _repositoryMonthlyOvertime.GetAllListAsync(a => a.EmployeeId == employeeId && a.Month == currentPayMonth.Month && a.Year == currentPayMonth.Year && a.Amount > 0);
                
                var payslip = new EmployeePayslip
                {
                   PayslipBasicInfo = payslipBasicInfo,
                   EmployeeDeductions = employeeDeductions,
                   EmployeeAllowances = employeeAllowances,
                   EmployeeReliefs = employeeReliefs,
                   EmployeeBenefitsInKind = employeeBenefitsInKind,
                   EmployeeLoans = employeeLoans,
                   EmployeeSalaryAdvance = employeeSalaryAdvance,
                   EmployeeOvertime = employeeOvertime,
                   ReportHeader = reportHeader,
                   SmtpCredentials = smtpCredentials,
                   Paymaster = paymaster,
                   CurrentDate = currentDate,
                   GrossPay = grossPay
                };
                
                
                payslipList.Add(payslip);
                
            }

            var payslipDispatchDto = new PayslipDispatchDto
            {
                EmployeePayslip = payslipList,
                IntervalCount = dto.IntervalCount,
                IntervalType = dto.IntervalType,
                BatchSize = dto.BatchSize,
            };
             
                
            //push to payslip dispatch actor
            _payslipDispatchActorProvider.Tell(payslipDispatchDto);
          
        }
        
        public async Task<object> GetDeductions()
        {
            var currentPayMonth = await _repositoryInitializePayMonth.GetAll().FirstOrDefaultAsync();

            var currentDate = new DateTime(currentPayMonth.Year, currentPayMonth.Month, 1).ToString("MMMM, yyyy");

            var monthlyCumulativeDeduction = await _repositoryMonthlyCumulativeDeduction.GetAllListAsync(x => x.Month == currentPayMonth.Month && x.Year == currentPayMonth.Year && x.Amount > 0);

            var sortedDeductions = monthlyCumulativeDeduction
                .OrderBy(x => x.EmployeeName) 
                .ToList();
            
            return new
            {
                data = sortedDeductions,
                currentDate
            };
        }

        public async Task<object> GetDeductions(Guid deductionTypeId)
        {
            var currentPayMonth = await _repositoryInitializePayMonth.GetAll().FirstOrDefaultAsync();

            var currentDate = new DateTime(currentPayMonth.Year, currentPayMonth.Month, 1).ToString("MMMM, yyyy");

            var monthlyCumulativeDeduction = await _repositoryMonthlyDeduction.GetAllListAsync(x => x.DeductionTypeId == deductionTypeId && x.Month == currentPayMonth.Month && x.Year == currentPayMonth.Year && x.Amount > 0);

            return new
            {
                data = monthlyCumulativeDeduction,
                currentDate
            };
        }

        public async Task<object> GetDaysWorked()
        {
            var currentPayMonth = await _repositoryInitializePayMonth.GetAll().FirstOrDefaultAsync();

            var currentDate = new DateTime(currentPayMonth.Year, currentPayMonth.Month, 1).ToString("MMMM, yyyy");

            var actualDaysWorked = await _repositoryEmployeeDaysWorked.GetAllListAsync(x => x.Month == currentPayMonth.Month && x.Year == currentPayMonth.Year);

            return new
            {
                data = actualDaysWorked,
                currentDate
            };
        }

        public async Task<object> GetEmployeeList()
        {

            var currentPayMonth = await _repositoryInitializePayMonth.GetAll().FirstOrDefaultAsync();

            var currentDate = new DateTime(currentPayMonth.Year, currentPayMonth.Month, 1).ToString("MMMM, yyyy");

            var employeeList = await _repositoryEmployeeBioData.GetAllListAsync();
            

            return new
            {
                data = employeeList,
                currentDate
            };
        }

        public async Task<object> GetEmployeeSalaryInfo()
        {
            var currentPayMonth = await _repositoryInitializePayMonth.GetAll().FirstOrDefaultAsync();

            var currentDate = new DateTime(currentPayMonth.Year, currentPayMonth.Month, 1).ToString("MMMM, yyyy");

            var employeeSalaryInfo = await _repositoryEmployeeSalaryInfo.GetAllListAsync();

            return new
            {
                data = employeeSalaryInfo,
                currentDate
            };
        }

        //tier-i, tier-ii
        public async Task<object> GetPensionScheme(string schemeType)
        {
            var currentPayMonth = await _repositoryInitializePayMonth.GetAll().FirstOrDefaultAsync();

            var companyProfile = await _repositoryCompanyProfile.GetAll().FirstOrDefaultAsync();

            var currentDate = new DateTime(currentPayMonth.Year, currentPayMonth.Month, 1).ToString("MMMM, yyyy");

            var startDate = new DateTime(currentPayMonth.Year, currentPayMonth.Month, 1);

            var endDate = startDate.AddMonths(1).AddDays(-1);

            var ssnitInfo = await _repositoryEmployeeSnitfo.GetAllListAsync();

            var paymaster = await _repositoryPaymaster.GetAllListAsync(x => x.Month == currentPayMonth.Month && x.Year == currentPayMonth.Year);

            var query = from u1 in ssnitInfo
                        join u2 in paymaster on u1.EmployeeId equals u2.EmployeeId
                        orderby u1.EmployeeName
                        select new
                        {
                            EmployerSocialSecurityNo = companyProfile != null ? companyProfile.EmployerSocialSecurityNo : string.Empty,
                            u2.BasicSalary,
                            Contribution = schemeType == "tier-i" ? (13.5M / 100) * u2.BasicSalary : (5.0M / 100) * u2.BasicSalary,
                            DeductionDate = endDate.ToString("dd-MMM-yyyy"),
                            u1.SocialSecurityNo,
                            u1.EmployeeIdentifier,
                            u2.EmployeeName,
                            u2.EmployeeId,
                            u2.EmployeeDepartment,
                        };

            return new
            {
                data = query.ToList(),
                currentDate
            };

        }

        public async Task<object> GetBankPayments()
        {
            var currentPayMonth = await _repositoryInitializePayMonth.GetAll().FirstOrDefaultAsync();

            var companyProfile = await _repositoryCompanyProfile.GetAll().FirstOrDefaultAsync();

            var currentDate = new DateTime(currentPayMonth.Year, currentPayMonth.Month, 1).ToString("MMMM, yyyy");

            var salaryInfo = await _repositoryEmployeeSalaryInfo.GetAllListAsync(x => x.PayType != "Cash");

            var paymaster = await _repositoryPaymaster.GetAllListAsync(x => x.Month == currentPayMonth.Month && x.Year == currentPayMonth.Year);

            var query = from u1 in salaryInfo
                        join u2 in paymaster on u1.EmployeeId equals u2.EmployeeId
                        orderby u1.EmployeeName
                        select new
                        {
                            u1.AccountNumber,
                            u1.BankName,
                            u1.BankBranchName,
                            Amount = u2.BasicSalary,
                            u2.EmployeeCategory,
                            u2.EmployeeDepartment,
                            u2.EmployeeName,
                            u1.EmployeeIdentifier
                        };

            return new
            {
                data = query.ToList(),
                currentDate
            };


        }

        public async Task<object> GetBankPayments(Guid bankId)
        {
            var currentPayMonth = await _repositoryInitializePayMonth.GetAll().FirstOrDefaultAsync();

            var companyProfile = await _repositoryCompanyProfile.GetAll().FirstOrDefaultAsync();

            var currentDate = new DateTime(currentPayMonth.Year, currentPayMonth.Month, 1).ToString("MMMM, yyyy");

            var salaryInfo = await _repositoryEmployeeSalaryInfo.GetAllListAsync(x => x.PayType != "Cash" && x.BankId == bankId);

            var paymaster = await _repositoryPaymaster.GetAllListAsync(x => x.Month == currentPayMonth.Month && x.Year == currentPayMonth.Year);

            var query = from u1 in salaryInfo
                        join u2 in paymaster on u1.EmployeeId equals u2.EmployeeId
                        orderby u1.EmployeeName
                        select new
                        {
                            u1.AccountNumber,
                            u1.BankName,
                            u1.BankBranchName,
                            Amount = u2.BasicSalary,
                            u2.EmployeeCategory,
                            u2.EmployeeDepartment,
                            u2.EmployeeName,
                            u1.EmployeeIdentifier
                        };

            return new
            {
                data = query.ToList(),
                currentDate
            };


        }
        public async Task<object> GetCashPayments()
        {
            var currentPayMonth = await _repositoryInitializePayMonth.GetAll().FirstOrDefaultAsync();

            var companyProfile = await _repositoryCompanyProfile.GetAll().FirstOrDefaultAsync();

            var currentDate = new DateTime(currentPayMonth.Year, currentPayMonth.Month, 1).ToString("MMMM, yyyy");

            var salaryInfo = await _repositoryEmployeeSalaryInfo.GetAllListAsync(x => x.PayType == "Cash");

            var paymaster = await _repositoryPaymaster.GetAllListAsync(x => x.Month == currentPayMonth.Month && x.Year == currentPayMonth.Year);

            var query = from u1 in salaryInfo
                        join u2 in paymaster on u1.EmployeeId equals u2.EmployeeId
                        orderby u1.EmployeeName
                        select new
                        {
                            u2.BasicSalary,
                            u1.EmployeeIdentifier,
                            u2.EmployeeName,
                            u2.EmployeeDepartment,
                            u2.EmployeeCategory,
                        };

            return new
            {
                data = query.ToList(),
                currentDate
            };


        }

        public async Task<object> GetTaxReliefs()
        {

            var currentPayMonth = await _repositoryInitializePayMonth.GetAll().FirstOrDefaultAsync();

            var currentDate = new DateTime(currentPayMonth.Year, currentPayMonth.Month, 1).ToString("MMMM, yyyy");

            var paymaster = await _repositoryPaymaster.GetAllListAsync(x => x.Month == currentPayMonth.Month && x.Year == currentPayMonth.Year && x.TaxRelief > 0);

            var query = from u1 in paymaster
                        orderby u1.EmployeeName
                        select new
                        {

                            u1.EmployeeIdentifier,
                            u1.EmployeeName,
                            TaxPaid = u1.IRSTax,
                            SocialSecurity = u1.EmployeeSSFDeduction,
                            Relief = u1.TaxRelief,
                            u1.TaxableIncome,
                            GrossTaxablePay = u1.BasicSalary + u1.NonTaxableAllowance + u1.TaxableAllowance,
                        };

            return new
            {
                data = query.ToList(),
                currentDate
            };
        }

        public async Task<object> GetPayeeReturns()
        {
            var currentPayMonth = await _repositoryInitializePayMonth.GetAll().FirstOrDefaultAsync();

            var companyProfile = await _repositoryCompanyProfile.GetAll().FirstOrDefaultAsync();

            var currentDate = new DateTime(currentPayMonth.Year, currentPayMonth.Month, 1).ToString("MMMM, yyyy");

            var startDate = new DateTime(currentPayMonth.Year, currentPayMonth.Month, 1);

            var endDate = startDate.AddMonths(1).AddDays(-1);

            var employeeBioDataInfo = await _repositoryEmployeeBioData.GetAllListAsync();
            var irsSignature = await _repositoryIrsSignature.GetAll().FirstOrDefaultAsync();

            var paymaster = await _repositoryPaymaster.GetAllListAsync(x => x.Month == currentPayMonth.Month && x.Year == currentPayMonth.Year);

            var query = from u1 in employeeBioDataInfo
                        join u2 in paymaster on u1.Id equals u2.EmployeeId
                        orderby u2.EmployeeName
                        select new
                        {
                            EmployerSocialSecurityNo = companyProfile != null ? companyProfile.EmployerSocialSecurityNo : string.Empty,
                            u2.BasicSalary,
                            u1.TaxIdentificationNo,
                            u1.EmployeeIdentifier,
                            u2.EmployeeName,
                            u2.EmployeeId,
                            TotalAllowances = u2.NonTaxableAllowance + u2.TaxableAllowance,
                            TotalEmoluments = u2.NonTaxableAllowance + u2.TaxableAllowance + u2.BasicSalary + u2.BenefitsInKind + u2.TaxRelief,
                            u2.NetSalary,
                            u2.EmployeeSSFDeduction,
                            u2.EmployeeProvidentFundContribution,
                            u2.TaxRelief,
                            u2.TaxableIncome,
                            TaxDeductible = u2.IRSTax,
                            EmployerTin = companyProfile != null ? companyProfile.CompanyTin : string.Empty,
                            EmployerName = companyProfile != null ? companyProfile.CompanyName : string.Empty,
                            EmployerAddress = companyProfile != null ? companyProfile.Address : string.Empty,
                            Currency = "GHS",
                            PayeeDeductionOfficer = irsSignature != null ? irsSignature.Name : string.Empty,
                            PayeeDeductionOfficerDesignation = irsSignature != null ? irsSignature.Title : string.Empty,
                            Date = DateTime.Today.ToString("dd-MMM-yyyy"),
                            Remarks = string.Empty
                        };

            return new
            {
                data = query.ToList(),
                currentDate
            };

        }

        public async Task<object> GetPensionSchemeDeductions()
        {
            var currentPayMonth = await _repositoryInitializePayMonth.GetAll().FirstOrDefaultAsync();

            var companyProfile = await _repositoryCompanyProfile.GetAll().FirstOrDefaultAsync();

            var currentDate = new DateTime(currentPayMonth.Year, currentPayMonth.Month, 1).ToString("MMMM, yyyy");

            var startDate = new DateTime(currentPayMonth.Year, currentPayMonth.Month, 1);

            var endDate = startDate.AddMonths(1).AddDays(-1);

            var ssnitInfo = await _repositoryEmployeeSnitfo.GetAllListAsync();

            var paymaster = await _repositoryPaymaster.GetAllListAsync(x => x.Month == currentPayMonth.Month && x.Year == currentPayMonth.Year);

            var query = from u1 in ssnitInfo
                        join u2 in paymaster on u1.EmployeeId equals u2.EmployeeId
                        orderby u1.EmployeeName
                        select new
                        {
                            EmployerSocialSecurityNo = companyProfile != null ? companyProfile.EmployerSocialSecurityNo : string.Empty,
                            u2.BasicSalary,
                            u1.SocialSecurityNo,
                            u1.EmployeeIdentifier,
                            u2.EmployeeName,
                            u2.EmployeeId,
                            u2.EmployeeDepartment,
                            EmployerContribution = (13.5M / 100) * u2.BasicSalary,
                            EmployeeContribution = (5.0M / 100) * u2.BasicSalary,

                        };

            return new
            {
                data = query.ToList(),
                currentDate
            };

        }

        public async Task<object> GetProvidentFundContributions()
        {
            var currentPayMonth = await _repositoryInitializePayMonth.GetAll().FirstOrDefaultAsync();

            var companyProfile = await _repositoryCompanyProfile.GetAll().FirstOrDefaultAsync();

            var currentDate = new DateTime(currentPayMonth.Year, currentPayMonth.Month, 1).ToString("MMMM, yyyy");

            var startDate = new DateTime(currentPayMonth.Year, currentPayMonth.Month, 1);

            var endDate = startDate.AddMonths(1).AddDays(-1);

            var paymaster = await _repositoryPaymaster.GetAllListAsync(x => x.Month == currentPayMonth.Month && x.Year == currentPayMonth.Year && x.EmployeeContribution + x.EmployerProvidentFundContribution > 0);

            var query = from u1 in paymaster
                orderby u1.EmployeeName
                        select new
                        {
                            EmployerSocialSecurityNo = companyProfile != null ? companyProfile.EmployerSocialSecurityNo : string.Empty,
                            u1.BasicSalary,
                            EmployeeContribution = u1.EmployeeProvidentFundContribution,
                            u1.EmployeeIdentifier,
                            u1.EmployeeName,
                            u1.EmployeeCategory,
                            u1.EmployeeDepartment,
                            EmployerContribution = u1.EmployerProvidentFundContribution,
                        };

            return new
            {
                data = query.ToList(),
                currentDate
            };

        }

        public async Task<object> GetSecondProvidentFundContributions()
        {
            var currentPayMonth = await _repositoryInitializePayMonth.GetAll().FirstOrDefaultAsync();

            var companyProfile = await _repositoryCompanyProfile.GetAll().FirstOrDefaultAsync();

            var currentDate = new DateTime(currentPayMonth.Year, currentPayMonth.Month, 1).ToString("MMMM, yyyy");

            var startDate = new DateTime(currentPayMonth.Year, currentPayMonth.Month, 1);

            var endDate = startDate.AddMonths(1).AddDays(-1);

            var paymaster = await _repositoryPaymaster.GetAllListAsync(x => x.Month == currentPayMonth.Month && x.Year == currentPayMonth.Year && x.EmployeeSecProvidentFundContribution + x.EmployerSecProvidentFundContribution > 0);

            var query = from u1 in paymaster
                orderby u1.EmployeeName
                        select new
                        {
                            EmployerSocialSecurityNo = companyProfile != null ? companyProfile.EmployerSocialSecurityNo : string.Empty,
                            u1.BasicSalary,
                            EmployeeContribution = u1.EmployeeSecProvidentFundContribution,
                            u1.EmployeeIdentifier,
                            u1.EmployeeName,
                            u1.EmployeeCategory,
                            u1.EmployeeDepartment,
                            EmployerContribution = u1.EmployerSecProvidentFundContribution,
                        };

            return new
            {
                data = query.ToList(),
                currentDate
            };

        }

        //=> historical reports ...
        public async Task<object> GetLoanDeductions(int month, int year)
        {

            var currentDate = new DateTime(year, month, 1).ToString("MMMM, yyyy");

            var employeeLoans = await _repositoryEmployeeLoan.GetAllListAsync(x => x.IsApproved);
            var monthlyLoanDeduction = await _repositoryMonthlyLoanDeductionHist.GetAllListAsync(b => b.Month == month && b.Year == year);

            var query = from u1 in employeeLoans
                        join u2 in monthlyLoanDeduction on u1.Id equals u2.EmployeeLoanId
                        select new
                        {
                            u2.EmployeeName,
                            u2.EmployeeIdentifier,
                            LoanTypeName = "Loan Type: " + u2.LoanTypeName,
                            LoanDate = u1.LoanDate.ToString("dd-MMM-yyyy"),
                            PrincipalLoanAmount = u1.Amount,
                            u1.InterestCharges,
                            u2.PrincipalPayment,
                            u2.InterestPayment,
                            TotalRepayment = u2.MonthlyPayment,
                            OutstandingBalance = u1.CurrentBalance,
                            u2.EmployeeDepartment
                        };

            return new
            {
                data = query.ToList(),
                currentDate
            };

        }

        public async Task<object> GetLoanDeductions(int month, int year, Guid loanTypeId)
        {
            var currentDate = new DateTime(year, month, 1).ToString("MMMM, yyyy");

            var employeeLoans = await _repositoryEmployeeLoan.GetAllListAsync(x => x.LoanTypeId == loanTypeId && x.IsApproved);
            var monthlyLoanDeduction = await _repositoryMonthlyLoanDeductionHist.GetAllListAsync(b => b.Month == month && b.Year == year);

            var query = from u1 in employeeLoans
                        join u2 in monthlyLoanDeduction on u1.Id equals u2.EmployeeLoanId
                        select new
                        {
                            u2.EmployeeName,
                            u2.EmployeeIdentifier,
                            LoanTypeName = "Loan Type: " + u2.LoanTypeName,
                            LoanDate = u1.LoanDate.ToString("dd-MMM-yyyy"),
                            PrincipalLoanAmount = u1.Amount,
                            u1.InterestCharges,
                            u2.PrincipalPayment,
                            u2.InterestPayment,
                            TotalRepayment = u2.MonthlyPayment,
                            OutstandingBalance = u1.CurrentBalance,
                        };

            return new
            {
                data = query.ToList(),
                currentDate
            };

        }

        public async Task<object> GetEmployeeLoans(int month, int year, DateTime startDate, DateTime endDate)
        {
            var currentPayMonth = await _repositoryInitializePayMonth.GetAll().FirstOrDefaultAsync();

            var currentDate = new DateTime(year, month, 1).ToString("MMMM, yyyy");

            var employeeLoans = await _repositoryEmployeeLoan.GetAllListAsync(a => a.LoanDate >= startDate && a.LoanDate <= endDate);

            var query = from u1 in employeeLoans
                        select new
                        {
                            u1.EmployeeName,
                            u1.EmployeeIdentifier,
                            u1.LoanTypeName,
                            LoanDate = u1.LoanDate.ToString("dd-MMM-yyyy"),
                            u1.MonthlyDeduction,
                            u1.Duration,
                            u1.InterestCharges,
                            u1.AnnualInterestRate,
                            u1.Amount

                        };

            return new
            {
                data = query.ToList(),
                currentDate
            };

        }

        public async Task<object> GetEmployeeLoans(int month, int year, DateTime startDate, DateTime endDate, Guid employeeId)
        {

            var currentDate = new DateTime(year, month, 1).ToString("MMMM, yyyy");

            var employeeLoans = await _repositoryEmployeeLoan.GetAllListAsync(a => a.LoanDate >= startDate && a.LoanDate <= endDate && a.EmployeeId == employeeId);
            var monthlyLoanDeduction = await _repositoryMonthlyLoanDeductionHist.GetAllListAsync(b => b.Month == year && b.Year == month && b.EmployeeId == employeeId);

            var query = from u1 in employeeLoans
                        join u2 in monthlyLoanDeduction on u1.Id equals u2.EmployeeLoanId
                        select new
                        {
                            u2.EmployeeName,
                            u2.EmployeeIdentifier,
                            LoanTypeName = "Loan Type: " + u2.LoanTypeName,
                            LoanDate = u1.LoanDate.ToString("dd-MMM-yyyy"),
                            PrincipalLoanAmount = u1.Amount,
                            u1.InterestCharges,
                            u2.PrincipalPayment,
                            u2.InterestPayment,
                            TotalRepayment = u2.MonthlyPayment,
                            OutstandingBalance = u1.CurrentBalance,
                        };

            return new
            {
                data = query.ToList(),
                currentDate
            };

        }

        public async Task<object> GetMonthlyLoanPayout(int month, int year, Guid loanTypeId)
        {

            var currentDate = new DateTime(year, month, 1).ToString("MMMM, yyyy");

            var monthlyLoanDeduction = await _repositoryMonthlyLoanDeductionHist.GetAllListAsync(b => b.Month == month && b.Year == year && b.LoanTypeId == loanTypeId);

            return new
            {
                data = monthlyLoanDeduction,
                currentDate
            };


        }

        public async Task<object> GetOutstandingLoans(int month, int year)
        {

            var currentDate = new DateTime(year, month, 1).ToString("MMMM, yyyy");

            var employeeLoans = await _repositoryEmployeeLoan.GetAllListAsync(a => a.CurrentBalance > 0 && a.LoanDate.Month == month && a.IsApproved && a.LoanDate.Year == year);

            var query = from u1 in employeeLoans
                        select new
                        {
                            u1.Id,
                            u1.EmployeeId,
                            u1.EmployeeIdentifier,
                            u1.EmployeeName,
                            u1.EmployeeCategory,
                            u1.EmployeeDepartment,
                            LoanDate = u1.LoanDate.ToString("dd-MMM-yyyy"),
                            LoanAmount = u1.Amount,
                            u1.InterestCharges,
                            u1.AnnualInterestRate,
                            u1.MonthlyDeduction,
                            u1.CurrentBalance,
                            Period = u1.NextDeduction,
                        };


            return new
            {
                data = query.ToList(),
                currentDate
            };
        }

        public async Task<object> GetOutstandingLoans(int month, int year, Guid employeeId, Guid loanTypeId)
        {

            var currentDate = new DateTime(year, month, 1).ToString("MMMM, yyyy");

            var predicateBuilder = PredicateBuilder.New<EmployeeLoan>();

            predicateBuilder.And(a => !a.IsDeleted && a.CurrentBalance > 0 && a.IsApproved && a.LoanDate.Month == month && a.LoanDate.Year == year);

            if (employeeId != Guid.Empty)
            {
                predicateBuilder.And(a => a.EmployeeId == employeeId);

            }

            if (loanTypeId != Guid.Empty)
            {
                predicateBuilder.And(a => a.LoanTypeId == loanTypeId);

            }

            var employeeLoans = await _repositoryEmployeeLoan.GetAllListAsync(predicateBuilder);

            var query = from u1 in employeeLoans

                        select new
                        {
                            u1.Id,
                            u1.EmployeeId,
                            u1.EmployeeIdentifier,
                            u1.EmployeeName,
                            LoanDate = u1.LoanDate.ToString("dd-MMM-yyyy"),
                            LoanAmount = u1.Amount,
                            u1.InterestCharges,
                            u1.AnnualInterestRate,
                            u1.MonthlyDeduction,
                            u1.CurrentBalance,
                            Period = u1.NextDeduction,
                        };


            return new
            {
                data = query.ToList(),
                currentDate
            };
        }

        public async Task<object> GetAllowances(int month, int year)
        {
            var currentDate = new DateTime(year, month, 1).ToString("MMMM, yyyy");

            var monthlyAllowances = await _repositoryMonthlyAllowanceHist.GetAllListAsync(a => a.Month == month && a.Year == year);

            var query = from u1 in monthlyAllowances
                        select new
                        {
                            u1.Id,
                            u1.EmployeeId,
                            u1.EmployeeIdentifier,
                            u1.EmployeeName,
                            u1.EmployeeCategory,
                            u1.EmployeeDepartment,
                            u1.Amount,
                            u1.AllowanceTypeName,
                            IsTaxable = u1.Taxable ? "Yes" : "No",

                        };

            return new
            {
                data = query.ToList(),
                currentDate
            };


        }

        public async Task<object> GetAllowances(int month, int year, Guid allowanceTypeId)
        {

            var currentDate = new DateTime(year, month, 1).ToString("MMMM, yyyy");

            var monthlyAllowances = await _repositoryMonthlyAllowanceHist.GetAllListAsync(a => a.AllowanceTypeId == allowanceTypeId && a.Month == month && a.Year == year);

            var query = from u1 in monthlyAllowances
                        select new
                        {
                            u1.Id,
                            u1.EmployeeId,
                            u1.EmployeeIdentifier,
                            u1.EmployeeName,
                            u1.EmployeeCategory,
                            u1.EmployeeDepartment,
                            u1.Amount,
                            u1.AllowanceTypeName,
                            IsTaxable = u1.Taxable ? "Yes" : "No",

                        };

            return new
            {
                data = query.ToList(),
                currentDate
            };


        }

        public async Task<object> GetPayRegister(int month, int year)
        {

            var currentDate = new DateTime(year, month, 1).ToString("MMMM, yyyy");

            var paymaster = await _repositoryPaymasterHist.GetAllListAsync(x => x.Month == month && x.Year == year);

            var query = from u1 in paymaster
                orderby u1.EmployeeName
                        select new
                        {

                            u1.EmployeeIdentifier,
                            u1.EmployeeName,
                            u1.EmployeeDepartment,
                            u1.BasicSalary,
                            IncomeTax = u1.IRSTax,
                            u1.EmployeeSSFDeduction,
                            u1.EmployeeProvidentFundContribution,
                            u1.OneTimeDeduction,
                            u1.NetSalary,
                            Allowances = u1.NonTaxableAllowance + u1.TaxableAllowance,
                            GrossSalary = u1.BasicSalary + u1.NonTaxableAllowance + u1.TaxableAllowance,
                            OtherDeductions = u1.OneTimeDeduction + u1.LoanDeduction + u1.EmployeeSecProvidentFundContribution,
                            TotalDeduction = u1.IRSTax + u1.OneTimeDeduction + u1.LoanDeduction + u1.EmployeeProvidentFundContribution + u1.EmployeeSSFDeduction + u1.EmployeeProvidentFundContribution,
                            u1.EmployeeCategory

                        };

            return new
            {
                data = query.ToList(),
                currentDate
            };
        }

        public async Task<object> GetSalaryAdvance(int month, int year)
        {

            var currentDate = new DateTime(year, month, 1).ToString("MMMM, yyyy");

            var salaryAdvance = await _repositoryMonthlySalaryAdvanceHist.GetAllListAsync(x => x.Month == month && x.Year == year);
 
            var sortedSalaryAdvance = salaryAdvance
                .OrderBy(x => x.EmployeeName) 
                .ToList();
            
            return new
            {
                data = sortedSalaryAdvance,
                currentDate
            };
        }


        public async Task<object> GetPaySlip(Guid employeeId, string payslipType, int month, int year)
        {
            var employeeReliefs = new object();

            var grossPay = 0M;

            var employeeAllowances = new object();
            
            var currentDate = new DateTime(year, month, 1).ToString("MMMM, yyyy");

            var paymaster = await _repositoryPaymasterHist.GetAllListAsync(x => x.Month == month && x.Year == year && x.EmployeeId == employeeId);

            var employeeBioData = await _repositoryEmployeeBioData.GetAllListAsync(x => x.Id == employeeId);

            var employeeSalaryInfo = await _repositoryEmployeeSalaryInfo.GetAllListAsync(x => x.EmployeeId == employeeId);

            var salaryGrades = await _repositorySalaryGrade.GetAllListAsync();
            
            var bonusAndOnetimeAllowance = await _repositoryMonthlyBonus.GetAllListAsync(x => x.EmployeeId == employeeId && x.Month == month && x.Year == year && x.Amount > 0);

            var employeeSnitInfo = await _repositoryEmployeeSnitfo.GetAllListAsync();

            var monthlyAllowances = await _repositoryMonthlyAllowanceHist.GetAllListAsync(x => x.EmployeeId == employeeId && x.Month == month && x.Year == year);

            //:basic payslip
            var payslipBaicInfo = (from u1 in employeeSalaryInfo
                                   join u2 in employeeBioData on u1.EmployeeId equals u2.Id
                                   join u3 in employeeSnitInfo on u1.EmployeeId equals u3.EmployeeId into aa
                                   from h in aa.DefaultIfEmpty()

                                   select new
                                   {
                                       AnnualSalary = u1.MonthlySalary * 12,
                                       u2.DepartmentName,
                                       SalaryGradeName = string.IsNullOrEmpty(u2.SalaryGradeName) ? string.Empty : u2.SalaryGradeName,
                                       u1.EmployeeIdentifier,
                                       u1.EmployeeName,
                                       u1.AccountNumber,
                                       SocialSecurityNo = h == null ? "--" : h.SocialSecurityNo,
                                       Currency = string.IsNullOrEmpty(u1.CurrencyName) ? string.Empty : u1.CurrencyName,
                                       u1.BankName,
                                       u1.BankBranchName
                                   }).ToList();

            //all deductions, :basic payslip
            var employeeDeductions = await _repositoryMonthlyCumulativeDeductionHist.GetAllListAsync(a => a.EmployeeId == employeeId && a.Month == month && a.Year == year && a.Amount > 0);

            paymaster.ForEach(v => {

                grossPay += v.BasicSalary + v.NonTaxableAllowance + v.TaxableAllowance + v.NonTaxableOverTime + v.TaxableOverTime + v.BenefitsInKind;

            });

            switch (payslipType)
            {
                case "basic":

                    return new
                    {
                        payslipBaicInfo,
                        employeeDeductions,
                        paymaster,
                        currentDate,
                        grossPay
                    };

                case "type-i":


                    employeeAllowances = (from u1 in monthlyAllowances
                                          select new
                                          {
                                              u1.Amount,
                                              u1.AllowanceTypeName,
                                              Taxable = u1.Taxable ? "Y" : "N",
                                          }).ToList();

                    return new
                    {
                        payslipBaicInfo,
                        employeeDeductions,
                        employeeAllowances,
                        bonusAndOnetimeAllowance,
                        paymaster,
                        currentDate,
                        grossPay

                    };


                case "type-ii":

                    employeeAllowances = (from u1 in monthlyAllowances
                                          select new
                                          {
                                              u1.Amount,
                                              u1.AllowanceTypeName,
                                              Taxable = u1.Taxable ? "Y" : "N",
                                          }).ToList();

                    employeeReliefs = await _repositoryMonthlyReliefHist.GetAllListAsync(a => a.EmployeeId == employeeId && a.Month == month && a.Year == year && a.Amount > 0);

                    return new
                    {
                        payslipBaicInfo,
                        employeeDeductions,
                        employeeAllowances,
                        employeeReliefs,
                        bonusAndOnetimeAllowance,
                        paymaster,
                        currentDate,
                        grossPay
                    };

                case "type-iii":

                    employeeAllowances = (from u1 in monthlyAllowances
                                          select new
                                          {
                                              u1.Amount,
                                              u1.AllowanceTypeName,
                                              Taxable = u1.Taxable ? "Y" : "N",
                                          }).ToList();

                    employeeReliefs = await _repositoryMonthlyReliefHist.GetAllListAsync(a => a.EmployeeId == employeeId && a.Month == month && a.Year == year && a.Amount > 0);

                    var employeeBenefitsInKind = await _repositoryMonthlyBenefitsInKindHist.GetAllListAsync(a => a.EmployeeId == employeeId && a.Month == month && a.Year == year && a.Amount > 0);

                    var employeeLoans = await _repositoryMonthlyLoanDeductionHist.GetAllListAsync(a => a.EmployeeId == employeeId && a.Month == month && a.Year == year && a.LoanAmount > 0);

                    var employeeSalaryAdvance = await _repositoryMonthlySalaryAdvanceHist.GetAllListAsync(a => a.EmployeeId == employeeId && a.Month == month && a.Year == year && a.Amount > 0);

                    var employeeOvertime = await _repositoryMonthlyOvertimeHist.GetAllListAsync(a => a.EmployeeId == employeeId && a.Month == month && a.Year == year && a.Amount > 0);

                    return new
                    {
                        payslipBaicInfo,
                        employeeDeductions,
                        employeeAllowances,
                        employeeReliefs,
                        employeeBenefitsInKind,
                        employeeLoans,
                        bonusAndOnetimeAllowance,
                        employeeSalaryAdvance,
                        employeeOvertime,
                        paymaster,
                        currentDate,
                        grossPay


                    };

                default:
                    return new
                    {
                        payslipBaicInfo,
                        employeeDeductions,
                        paymaster,
                        currentDate,
                        grossPay

                    };
            };


        }

        //deductions ...
        public async Task<object> GetDeductions(int month, int year)
        {

            var currentDate = new DateTime(year, month, 1).ToString("MMMM, yyyy");

            var monthlyCumulativeDeduction = await _repositoryMonthlyCumulativeDeductionHist.GetAllListAsync(x => x.Month == month && x.Year == year && x.Amount > 0);

            
            return new
            {
                data = monthlyCumulativeDeduction,
                currentDate
            };
        }

        public async Task<object> GetDeductions(int month, int year, Guid deductionTypeId)
        {

            var currentDate = new DateTime(year, month, 1).ToString("MMMM, yyyy");

            var monthlyCumulativeDeduction = await _repositoryMonthlyDeductionHist.GetAllListAsync(x => x.DeductionTypeId == deductionTypeId && x.Month == month && x.Year == year && x.Amount > 0);

            var sortedDeductions = monthlyCumulativeDeduction
                .OrderBy(x => x.EmployeeName) 
                .ToList();
            
            return new
            {
                data = sortedDeductions,
                currentDate
            };
        }

        //Other Monthly reports...
        public async Task<object> GetDaysWorked(int month, int year)
        {

            var currentDate = new DateTime(year, month, 1).ToString("MMMM, yyyy");

            var actualDaysWorked = await _repositoryEmployeeDaysWorked.GetAllListAsync(x => x.Month == month && x.Year == year);

            return new
            {
                data = actualDaysWorked,
                currentDate
            };
        }

        public async Task<object> GetEmployeeList(int month, int year)
        {

            var currentDate = new DateTime(year, month, 1).ToString("MMMM, yyyy");

            var employeeList = await _repositoryEmployeeBioData.GetAllListAsync();

            return new
            {
                data = employeeList,
                currentDate
            };
        }

        public async Task<object> GetEmployeeSalaryInfo(int month, int year)
        {

            var currentDate = new DateTime(year, month, 1).ToString("MMMM, yyyy");

            var employeeSalaryInfo = await _repositoryEmployeeSalaryInfo.GetAllListAsync();

            return new
            {
                data = employeeSalaryInfo,
                currentDate
            };
        }

        //pension scheme...
        public async Task<object> GetPensionScheme(string schemeType, int month, int year)
        {

            var companyProfile = await _repositoryCompanyProfile.GetAll().FirstOrDefaultAsync();

            var currentDate = new DateTime(year, month, 1).ToString("MMMM, yyyy");

            var startDate = new DateTime(year, month, 1);

            var endDate = startDate.AddMonths(1).AddDays(-1);

            var ssnitInfo = await _repositoryEmployeeSnitfo.GetAllListAsync();

            var paymaster = await _repositoryPaymasterHist.GetAllListAsync(x => x.Month == month && x.Year == year);

            var query = from u1 in ssnitInfo
                        join u2 in paymaster on u1.EmployeeId equals u2.EmployeeId
                        orderby u1.EmployeeName
                        select new
                        {
                            EmployerSocialSecurityNo = companyProfile != null ? companyProfile.EmployerSocialSecurityNo : string.Empty,
                            u2.BasicSalary,
                            Contribution = schemeType == "tier-i" ? (13.5M / 100) * u2.BasicSalary : (5.0M / 100) * u2.BasicSalary,
                            DeductionDate = endDate.ToString("dd-MMM-yyyy"),
                            u1.SocialSecurityNo,
                            u1.EmployeeIdentifier,
                            u2.EmployeeName,
                            u2.EmployeeId,
                            u2.EmployeeDepartment,
                        };

            return new
            {
                data = query.ToList(),
                currentDate
            };

        }
        public async Task<object> GetSecondPensionSchemeFirstTier(int month, int year)
        {

            var companyProfile = await _repositoryCompanyProfile.GetAll().FirstOrDefaultAsync();

            var currentDate = new DateTime(year, month, 1).ToString("MMMM, yyyy");

            var startDate = new DateTime(year, month, 1);

            var endDate = startDate.AddMonths(1).AddDays(-1);

            var ssnitInfo = await _repositoryEmployeeSnitfo.GetAllListAsync();

            var paymaster = await _repositoryPaymasterHist.GetAllListAsync(x => x.Month == month && x.Year == year);

            var query = from u1 in ssnitInfo
                        join u2 in paymaster on u1.EmployeeId equals u2.EmployeeId
                        orderby u1.EmployeeName
                
                        select new
                        {
                            EmployerSocialSecurityNo = companyProfile != null ? companyProfile.EmployerSocialSecurityNo : string.Empty,
                            u2.BasicSalary,
                            u2.EmployeeProvidentFundContribution,
                            DeductionDate = endDate.ToString("dd-MMM-yyyy"),
                            u1.SocialSecurityNo
                        };

            return new
            {
                data = query.ToList(),
                currentDate
            };

        }



        //bank payments
        public async Task<object> GetBankPayments(int month, int year)
        {

            var companyProfile = await _repositoryCompanyProfile.GetAll().FirstOrDefaultAsync();

            var currentDate = new DateTime(year, month, 1).ToString("MMMM, yyyy");

            var salaryInfo = await _repositoryEmployeeSalaryInfo.GetAllListAsync(x => x.PayType != "Cash");

            var paymaster = await _repositoryPaymasterHist.GetAllListAsync(x => x.Month == month && x.Year == year);

            var query = from u1 in salaryInfo
                        join u2 in paymaster on u1.EmployeeId equals u2.EmployeeId
                        orderby u1.EmployeeName
                        select new
                        {
                            u1.AccountNumber,
                            u1.BankName,
                            u1.BankBranchName,
                            Amount = u2.BasicSalary,
                            u2.EmployeeCategory,
                            u2.EmployeeDepartment,
                            u2.EmployeeName,
                            u1.EmployeeIdentifier
                        };

            return new
            {
                data = query.ToList(),
                currentDate
            };


        }

        public async Task<object> GetBankPayments(int month, int year, Guid bankId)
        {

            var companyProfile = await _repositoryCompanyProfile.GetAll().FirstOrDefaultAsync();

            var currentDate = new DateTime(year, month, 1).ToString("MMMM, yyyy");

            var salaryInfo = await _repositoryEmployeeSalaryInfo.GetAllListAsync(x => x.PayType != "Cash" && x.BankId == bankId);

            var paymaster = await _repositoryPaymasterHist.GetAllListAsync(x => x.Month == month && x.Year == year);

            var query = from u1 in salaryInfo
                        join u2 in paymaster on u1.EmployeeId equals u2.EmployeeId
                        orderby u1.EmployeeName
                        select new
                        {
                            u1.AccountNumber,
                            u1.BankName,
                            u1.BankBranchName,
                            Amount = u2.BasicSalary,
                            u2.EmployeeCategory,
                            u2.EmployeeDepartment,
                            u2.EmployeeName,
                            u1.EmployeeIdentifier
                        };

            return new
            {
                data = query.ToList(),
                currentDate
            };


        }

        public async Task<object> GetCashPayments(int month, int year)
        {

            var companyProfile = await _repositoryCompanyProfile.GetAll().FirstOrDefaultAsync();

            var currentDate = new DateTime(year, month, 1).ToString("MMMM, yyyy");

            var salaryInfo = await _repositoryEmployeeSalaryInfo.GetAllListAsync(x => x.PayType == "Cash");

            var paymaster = await _repositoryPaymasterHist.GetAllListAsync(x => x.Month == month && x.Year == year);

            var query = from u1 in salaryInfo
                        join u2 in paymaster on u1.EmployeeId equals u2.EmployeeId
                        orderby u1.EmployeeName
                        select new
                        {
                            u2.BasicSalary,
                            u1.EmployeeIdentifier,
                            u2.EmployeeName,
                            u2.EmployeeDepartment,
                            u2.EmployeeCategory,
                        };

            return new
            {
                data = query.ToList(),
                currentDate
            };


        }

        //tax reliefs
        public async Task<object> GetTaxReliefs(int month, int year)
        {

            var currentDate = new DateTime(year, month, 1).ToString("MMMM, yyyy");

            var paymaster = await _repositoryPaymasterHist.GetAllListAsync(x => x.Month == month && x.Year == year && x.TaxRelief > 0);

            var query = from u1 in paymaster
                        orderby u1.EmployeeName
                        select new
                        {
                            u1.EmployeeIdentifier,
                            u1.EmployeeName,
                            TaxPaid = u1.IRSTax,
                            SocialSecurity = u1.EmployeeSSFDeduction,
                            Relief = u1.TaxRelief,
                            u1.TaxableIncome,
                            GrossTaxablePay = u1.BasicSalary + u1.NonTaxableAllowance + u1.TaxableAllowance,
                        };

            return new
            {
                data = query.ToList(),
                currentDate
            };
        }

        public async Task<object> GetPayeeReturns(int month, int year)
        {
            var currentPayMonth = await _repositoryInitializePayMonth.GetAll().FirstOrDefaultAsync();

            var companyProfile = await _repositoryCompanyProfile.GetAll().FirstOrDefaultAsync();

            var currentDate = new DateTime(year, month, 1).ToString("MMMM, yyyy");

            var startDate = new DateTime(year, month, 1);

            var endDate = startDate.AddMonths(1).AddDays(-1);

            var employeeBioDataInfo = await _repositoryEmployeeBioData.GetAllListAsync();
            var irsSignature = await _repositoryIrsSignature.GetAll().FirstOrDefaultAsync();

            var paymaster = await _repositoryPaymasterHist.GetAllListAsync(x => x.Month == month && x.Year == year);

            var query = from u1 in employeeBioDataInfo
                        join u2 in paymaster on u1.Id equals u2.EmployeeId
                        orderby u2.EmployeeName
                        select new
                        {
                            EmployerSocialSecurityNo = companyProfile != null ? companyProfile.EmployerSocialSecurityNo : string.Empty,
                            u2.BasicSalary,
                            u1.TaxIdentificationNo,
                            u1.EmployeeIdentifier,
                            u2.EmployeeName,
                            u2.EmployeeId,
                            TotalAllowances = u2.NonTaxableAllowance + u2.TaxableAllowance,
                            TotalEmoluments = u2.NonTaxableAllowance + u2.TaxableAllowance + u2.BasicSalary + u2.BenefitsInKind + u2.TaxRelief,
                            u2.NetSalary,
                            u2.EmployeeSSFDeduction,
                            u2.EmployeeProvidentFundContribution,
                            u2.TaxRelief,
                            u2.TaxableIncome,
                            TaxDeductible = u2.IRSTax,
                            EmployerTin = companyProfile != null ? companyProfile.CompanyTin : string.Empty,
                            EmployerName = companyProfile != null ? companyProfile.CompanyName : string.Empty,
                            EmployerAddress = companyProfile != null ? companyProfile.Address : string.Empty,
                            Currency = "GHS",
                            PayeeDeductionOfficer = irsSignature != null ? irsSignature.Name : string.Empty,
                            PayeeDeductionOfficerDesignation = irsSignature != null ? irsSignature.Title : string.Empty,
                            Date = DateTime.Today.ToString("dd-MMM-yyyy"),
                            Remarks = string.Empty
                        };

            return new
            {
                data = query.ToList(),
                currentDate
            };

        }
        public async Task<object> GetPensionSchemeDeductions(int month, int year)
        {
            var companyProfile = await _repositoryCompanyProfile.GetAll().FirstOrDefaultAsync();

            var currentDate = new DateTime(year, month, 1).ToString("MMMM, yyyy");

            var startDate = new DateTime(year, month, 1);

            var endDate = startDate.AddMonths(1).AddDays(-1);

            var ssnitInfo = await _repositoryEmployeeSnitfo.GetAllListAsync();

            var paymaster = await _repositoryPaymasterHist.GetAllListAsync(x => x.Month == month && x.Year == year);

            var query = from u1 in ssnitInfo
                        join u2 in paymaster on u1.EmployeeId equals u2.EmployeeId
                        orderby u1.EmployeeName
                        select new
                        {
                            EmployerSocialSecurityNo = companyProfile != null ? companyProfile.EmployerSocialSecurityNo : string.Empty,
                            u2.BasicSalary,
                            u1.SocialSecurityNo,
                            u1.EmployeeIdentifier,
                            u2.EmployeeName,
                            u2.EmployeeId,
                            u2.EmployeeDepartment,
                            u2.EmployeeCategory,
                            EmployerContribution = (13.5M / 100) * u2.BasicSalary,
                            EmployeeContribution = (5.0M / 100) * u2.BasicSalary,

                        };

            return new
            {
                data = query.ToList(),
                currentDate
            };

        }

        public async Task<object> GetProvidentFundContributions(int month, int year)
        {

            var companyProfile = await _repositoryCompanyProfile.GetAll().FirstOrDefaultAsync();

            var currentDate = new DateTime(year, month, 1).ToString("MMMM, yyyy");

            var startDate = new DateTime(year, month, 1);

            var endDate = startDate.AddMonths(1).AddDays(-1);

            var paymaster = await _repositoryPaymasterHist.GetAllListAsync(x => x.Month == month && x.Year == year && x.EmployeeProvidentFundContribution + x.EmployerProvidentFundContribution > 0);

            var query = from u1 in paymaster
                        orderby u1.EmployeeName
                        select new
                        {
                            EmployerSocialSecurityNo = companyProfile != null ? companyProfile.EmployerSocialSecurityNo : string.Empty,
                            u1.BasicSalary,
                            EmployeeContribution = u1.EmployeeProvidentFundContribution,
                            u1.EmployeeIdentifier,
                            u1.EmployeeName,
                            u1.EmployeeDepartment,
                            u1.EmployeeCategory,
                            EmployerContribution = u1.EmployerProvidentFundContribution,


                        };

            return new
            {
                data = query.ToList(),
                currentDate
            };

        }

        public async Task<object> GetSecondProvidentFundContributions(int month, int year)
        {

            var companyProfile = await _repositoryCompanyProfile.GetAll().FirstOrDefaultAsync();

            var currentDate = new DateTime(year, month, 1).ToString("MMMM, yyyy");

            var startDate = new DateTime(year, month, 1);

            var endDate = startDate.AddMonths(1).AddDays(-1);

            var paymaster = await _repositoryPaymasterHist.GetAllListAsync(x => x.Month == month && x.Year == year &&  x.EmployeeProvidentFundContribution + x.EmployerProvidentFundContribution  > 0);

            var query = from u1 in paymaster
                        orderby u1.EmployeeName
                        select new
                        {
                            EmployerSocialSecurityNo = companyProfile != null ? companyProfile.EmployerSocialSecurityNo : string.Empty,
                            u1.BasicSalary,
                            EmployeeContribution = u1.EmployeeProvidentFundContribution,
                            u1.EmployeeIdentifier,
                            u1.EmployeeName,
                            u1.EmployeeDepartment,
                            u1.EmployeeCategory,
                            EmployerContribution = u1.EmployerProvidentFundContribution,
                        };

            return new
            {
                data = query.ToList(),
                currentDate
            };

        }

    }
}
