using Abp.Domain.Repositories;
using TopazERP.Models.Payroll;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using TopazERP.DomainServices.Payroll.EmployeeLoans.Dto;

namespace TopazERP.DomainServices.Payroll.EmployeeLoans
{
   public class EmployeeLoanManager: Abp.Domain.Services.DomainService, IEmployeeLoanManager
    {
        private readonly IRepository<EmployeeLoan, Guid> _repositoryEmployeeLoan;
        private readonly IRepository<LoanAmortizationHistory, Guid> _repositoryLoanAmortizationHistory;
        private readonly IRepository<EmployeeBioData, Guid> _repositoryEmployeeBioData;
        private readonly IRepository<InitializePayMonth, Guid> _repositoryInitializePayMonth;

        private readonly IRepository<EmployeeLoanRepaymentSchedule, Guid> _repositoryEmployeeLoanRepaymentSchedule;
        private decimal _totalBalance = 0;
        private DateTime _currentDate = DateTime.Today;
        public EmployeeLoanManager(IRepository<EmployeeLoan, Guid> repositoryEmployeeLoan, IRepository<EmployeeLoanRepaymentSchedule, Guid> repositoryEmployeeLoanRepaymentSchedule, IRepository<EmployeeBioData, Guid> repositoryEmployeeBioData, IRepository<LoanAmortizationHistory, Guid> repositoryLoanAmortizationHistory, IRepository<InitializePayMonth, Guid> repositoryInitializePayMonth)
        {
            _repositoryEmployeeLoan = repositoryEmployeeLoan;
            _repositoryEmployeeLoanRepaymentSchedule = repositoryEmployeeLoanRepaymentSchedule;
            _repositoryEmployeeBioData = repositoryEmployeeBioData;
            _repositoryLoanAmortizationHistory = repositoryLoanAmortizationHistory;
            _repositoryInitializePayMonth = repositoryInitializePayMonth;
        }

        public async Task Create(EmployeeLoan entity)
        {
            var employeeBioData = await _repositoryEmployeeBioData.FirstOrDefaultAsync(entity.EmployeeId);

            var employeeLoanId = Guid.NewGuid();

            entity.Id = employeeLoanId;
            entity.EmployeeCategory = employeeBioData.CategoryName;
            entity.EmployeeDepartment = employeeBioData.DepartmentName;
            entity.Status = "Pending";

            await _repositoryEmployeeLoan.InsertAsync(entity);

            await CreateRepaySchedule(entity, employeeLoanId);
        }

        public async Task AmortizeLoan(LoanAmortizationDto dto)
        {

            var loanRecord = await _repositoryEmployeeLoan.FirstOrDefaultAsync(dto.EmployeeLoanId);

            if (loanRecord != null)
            {

                await _repositoryLoanAmortizationHistory.InsertAsync(new LoanAmortizationHistory
                {
                     CurrentBalance= loanRecord.CurrentBalance, 
                    AmountPaid = dto.AmountPaid, 
                    AnnualInterestRate = loanRecord.AnnualInterestRate, 
                    ChargeInterest = loanRecord.ChargeInterest, 
                    DeductionStarts = loanRecord.DeductionStarts, 
                    Duration= loanRecord.Duration,
                    EmployeeCategory = loanRecord.EmployeeCategory, 
                    EmployeeDepartment = loanRecord.EmployeeDepartment, 
                    EmployeeId = loanRecord.EmployeeId,
                    EmployeeIdentifier = loanRecord.EmployeeIdentifier, 
                    InterestCharges = loanRecord.InterestCharges,
                    InterestType = loanRecord.InterestType, 
                    IsApproved = loanRecord.IsApproved, 
                    LoanAmount = dto.AmountPaid, 
                    LoanDate = loanRecord.LoanDate, 
                    LoanTypeId = loanRecord.LoanTypeId, 
                    LoanTypeName = loanRecord.LoanTypeName, 
                    MonthlyDeduction = loanRecord.MonthlyDeduction, 
                    Status = loanRecord.Status,
                    TenantId= loanRecord.TenantId,

                });


                // update loan repayment schedule...
                var loanPaymentSchedule = await _repositoryEmployeeLoanRepaymentSchedule.GetAllListAsync(a => a.EmployeeId == loanRecord.EmployeeId && a.EmployeeLoanId == dto.EmployeeLoanId && loanRecord.NextDeduction >= a.Period);

                foreach (var schedule in loanPaymentSchedule)
                {
                    schedule.IsPaid = true;
                    await _repositoryEmployeeLoanRepaymentSchedule.UpdateAsync(schedule);
                }

                loanRecord.CurrentBalance = 0;
                loanRecord.NextDeduction = loanPaymentSchedule.MaxBy(a=> a.Period).Period;
                await _repositoryEmployeeLoan.UpdateAsync(loanRecord);
            }

        }

        public async Task<object> GetLoanRepaymentSummary(Guid loanId)
        {
            
            
            var totalPrincipalBalance = 0m;
            var totalInterestBalance = 0m;

            var loanRecord = await _repositoryEmployeeLoan.FirstOrDefaultAsync(loanId);

            var loanPaymentSchedule = await _repositoryEmployeeLoanRepaymentSchedule.GetAllListAsync(a =>  a.EmployeeLoanId == loanId && a.Period >= loanRecord.NextDeduction);

            if (loanRecord.CurrentBalance > 0) {

                totalPrincipalBalance = loanPaymentSchedule.Sum(a => a.PrincipalPayment);
                totalInterestBalance = loanPaymentSchedule.Sum(a => a.InterestPayment);
            }

            return new { totalPrincipalBalance, totalInterestBalance , lastDeductionDate = loanPaymentSchedule.OrderBy(a=> a.Period).FirstOrDefault()?.ScheduleDate.ToString("dd-MMM-yyyy") };
        }

        public async Task<object> GetApprovedLoans()
        {
            var data = await _repositoryEmployeeLoan.GetAllListAsync(x=>x.IsApproved);

            return data.OrderBy(a => a.EmployeeName).ToList();
        }
        public async Task Update(EmployeeLoan entity)
        {
            
            // delete all current repayment schedule...
            var loanPaymentSchedule = await _repositoryEmployeeLoanRepaymentSchedule.GetAllListAsync(a => a.EmployeeId == entity.EmployeeId && a.EmployeeLoanId == entity.Id);
            foreach (var schedule in loanPaymentSchedule)
            {
                await _repositoryEmployeeLoanRepaymentSchedule.DeleteAsync(schedule.Id);
            }
             
            var existingLoan = await _repositoryEmployeeLoan.FirstOrDefaultAsync(entity.Id);
            existingLoan.Amount = entity.Amount;
            existingLoan.AnnualInterestRate = entity.AnnualInterestRate;
            existingLoan.ChargeInterest = entity.ChargeInterest;
            existingLoan.LoanDate = entity.LoanDate;
            existingLoan.DeductionStarts = entity.DeductionStarts;
            existingLoan.Duration = entity.Duration;
            existingLoan.InterestType = entity.InterestType;
            existingLoan.MonthlyDeduction = entity.MonthlyDeduction;
            existingLoan.LoanTypeName = entity.LoanTypeName;
            existingLoan.LoanTypeId = entity.LoanTypeId;
            existingLoan.NextDeduction = entity.NextDeduction;
            existingLoan.InterestCharges = entity.InterestCharges;
            
            await _repositoryEmployeeLoan.UpdateAsync(existingLoan);
            
            await CreateRepaySchedule(entity, entity.Id);
        }

        public async Task<EmployeeLoan> GetAsync(Guid id)
        {
            return await _repositoryEmployeeLoan.FirstOrDefaultAsync(id);
        }

        public async Task<object> ListAll()
        {
            var data = await _repositoryEmployeeLoan.GetAllListAsync();
            return data.OrderBy(a => a.EmployeeName).ToList();

        }

        public async Task<object> GetOutStandingLoans()
        {
            return await _repositoryEmployeeLoan.GetAllListAsync(x=> x.CurrentBalance > 0 && x.IsApproved);
        }

        public async Task<object> GetPendingLoans()
        {
            return await _repositoryEmployeeLoan.GetAllListAsync(x => !x.IsApproved && (x.Status == "Pending" || x.Status == "Approved"));
        }
        
        public async Task<object> GetPastLoans()
        {
            return await _repositoryEmployeeLoan.GetAllListAsync(x =>  x.IsApproved);
        }
        public async Task<object> ListAll(Guid employeeId)
        {
            return await _repositoryEmployeeLoan.GetAllListAsync(x=> x.EmployeeId == employeeId);
        }

        public async Task Delete(Guid id)
        {
            await _repositoryEmployeeLoan.DeleteAsync(id);

        }

        public async Task Approve(List<Guid> ids, string approvalType)
        {
            foreach (var id in ids)
            {
                var data = await _repositoryEmployeeLoan.FirstOrDefaultAsync(x=> x.Id == id && x.Status == "Pending");
                
                if (data != null)
                {

                    switch (approvalType)
                    {
                        case "approve":
                            data.IsApproved = true;
                            data.Status = "Approved";
                            break;

                        case "reject":
                            data.IsApproved = false;
                            data.Status = "Rejected";
                            break;

                        default:
                            break;
                    }

                    await _repositoryEmployeeLoan.UpdateAsync(data);

                }

            }

        }

        private async Task CreateRepaySchedule(EmployeeLoan input, Guid employeeLoanId)
        {
            
            _totalBalance = input.CurrentBalance;
            _currentDate = input.DeductionStarts;

            //calculate loan repayment schedule... 
            //test for simple interest only
            for (int i = 0; i < input.Duration; i++)
            {
                var loanRepaymentSchedule = new EmployeeLoanRepaymentSchedule
                {
                    EmployeeId = input.EmployeeId,
                    EmployeeIdentifier = input.EmployeeIdentifier,
                    EmployeeName  = input.EmployeeName,
                    EmployeeLoanName = input.LoanTypeName,
                    EmployeeLoanId = employeeLoanId,
                    ScheduleDate = GetCurDate(_currentDate) //obtain last day of the month based on deduction start date ...
                };
                
                if (_totalBalance <= input.MonthlyDeduction)
                {
                    input.MonthlyDeduction = _totalBalance;
                    loanRepaymentSchedule.InterestPlusPrincipalBalance = GetCurBalance(_totalBalance, input.MonthlyDeduction);
                    loanRepaymentSchedule.MonthlyPayment = _totalBalance;

                }
                else
                {
                    loanRepaymentSchedule.InterestPlusPrincipalBalance = GetCurBalance(input.MonthlyDeduction, _totalBalance);

                }

                loanRepaymentSchedule.MonthlyPayment = Math.Round(input.MonthlyDeduction, 2) ;
                loanRepaymentSchedule.PrincipalPayment = Math.Round(input.Amount / input.Duration, 2) ;
                loanRepaymentSchedule.InterestPayment = Math.Round(input.InterestCharges / input.Duration, 2);
                loanRepaymentSchedule.PrincipalBalance = Math.Round(input.Amount - (input.Amount / input.Duration) / input.Duration, 2);

                loanRepaymentSchedule.Period = i + 1;

                await _repositoryEmployeeLoanRepaymentSchedule.InsertAsync(loanRepaymentSchedule);

            }
        }

        //helpers ...
        private decimal GetCurBalance(decimal monthlypayment, decimal currentBalance)
        {

            if (currentBalance <= monthlypayment)
            {
                currentBalance = monthlypayment;
                var balance = currentBalance - monthlypayment;

                return balance;
            }
            else
            {
                var balance = currentBalance - monthlypayment;

                _totalBalance = balance;
                return balance;
            }

        }
         
        private DateTime GetCurDate(DateTime dateTime)
        {
            int numberofDays = DateTime.DaysInMonth(dateTime.Year, dateTime.Month);
            DateTime temp = new DateTime(dateTime.Year, dateTime.Month, numberofDays);
            _currentDate = temp.AddMonths(1);
            return temp;
        }
        
        //if deduction date is behind current pay month, calculate next deduction and balance
        private async Task CalculateNextDeductionAndBalance(EmployeeLoan input)
        {
            var currentPayMonth = await _repositoryInitializePayMonth.GetAll().FirstOrDefaultAsync();
           
            if (input.DeductionStarts.Year < currentPayMonth.Year ||
                (input.DeductionStarts.Year == currentPayMonth.Year && input.DeductionStarts.Month < currentPayMonth.Month))
            {
                // Calculate how many months have passed since deduction started
                var monthsPassed = ((currentPayMonth.Year - input.DeductionStarts.Year) * 12)
                                   + (currentPayMonth.Month - input.DeductionStarts.Month);

                // Cap monthsPassed at the loan duration
                monthsPassed = Math.Min(monthsPassed, input.Duration);

                // Update NextDeduction to next unpaid period
                input.NextDeduction = monthsPassed + 2;

                // Update current balance based on how many payments would have been made
                var totalPaid = input.MonthlyDeduction * monthsPassed;
                input.CurrentBalance = Math.Round(input.Amount - totalPaid, 2);
            }
        }

    }
}
