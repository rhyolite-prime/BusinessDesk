using AutoMapper;
using TopazERP.DomainServices.Payroll.EmployeeLoans;
using TopazERP.Models.Payroll;
using TopazERP.Services.Payroll.EmployeeLoans.Dto;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.DomainServices.Payroll.EmployeeBioDatas;
using TopazERP.DomainServices.Payroll.LoanTypes;
using TopazERP.DomainServices.Payroll.EmployeeLoans.Dto;

namespace TopazERP.Services.Payroll.EmployeeLoans
{
   public class EmployeeLoanAppService: TopazERPAppServiceBase, IEmployeeLoanAppService
    {
        private readonly IEmployeeLoanManager _employeeLoanManager;
        private readonly IEmployeeBioDataManager _employeeBioDataManager;
        private readonly ILoanTypeManager _loanTypeManager;
        private readonly IMapper _mapper;

        public EmployeeLoanAppService(IEmployeeLoanManager employeeLoanManager, IMapper mapper, IEmployeeBioDataManager employeeBioDataManager, ILoanTypeManager loanTypeManager)
        {
            _employeeLoanManager = employeeLoanManager;
            _mapper = mapper;
            _employeeBioDataManager = employeeBioDataManager;
            _loanTypeManager = loanTypeManager;
        }

        public async Task<object> ListAll()
        {
            return await _employeeLoanManager.ListAll();
        }

        public async Task<object> GetLoanRepaymentSummary(Guid loanId)
        {
            return await _employeeLoanManager.GetLoanRepaymentSummary(loanId);
        }
        public async Task AmortizeLoan(LoanAmortizationDto dto)
        {
            await _employeeLoanManager.AmortizeLoan(dto);
        }

        public async Task<object> ListApprovedLoans()
        {
            return await _employeeLoanManager.GetApprovedLoans();
        }

        public async Task<object> ListPastLoans()
        {
            return await _employeeLoanManager.GetPastLoans();
        }

        /// <summary>
        /// 
        /// </summary>
        /// <param name="inputList"></param>
        public async Task Import(List<ImportEmployeeLoanInput> inputList)
        {
            foreach (var input in inputList)
            {
                var loanType = await _loanTypeManager.GetAsync(input.LoanTypeName);

                var employee = await _employeeBioDataManager.GetAsync(input.EmployeeIdentifier);

                if (employee != null && loanType != null)
                {

                    var createEmployeeLoanInput = new CreateEmployeeLoanInput
                    {
                        EmployeeId = employee.Id,
                        EmployeeIdentifier = employee.EmployeeIdentifier,
                        EmployeeName = input.EmployeeName,
                        LoanTypeName = loanType.Name,
                        Amount = input.Amount,
                        AnnualInterestRate = input.AnnualInterestRate,
                        CurrentBalance = 0,
                        ChargeInterest = input.AnnualInterestRate > 0,
                        Duration = input.Duration, 
                        DeductionStarts = input.DeductionStarts, 
                        InterestType = input.InterestType,
                        IsApproved = true, 
                        LoanDate = input.LoanDate, 
                        LoanTypeId = loanType.Id, 
                        MonthlyDeduction = 0,
                        InterestCharges = 0, 
                        NextDeduction= 0, 
                        Status = "",


                    };


                    var obj = _mapper.Map<EmployeeLoan>(createEmployeeLoanInput);

                    await _employeeLoanManager.Create(obj);

                }

                


            }

        }


        public async Task<object> ListAll(Guid employeeId)
        {
            return await _employeeLoanManager.ListAll(employeeId);
        }
        
        public async Task<EmployeeLoan> GetAsync(Guid id)
        {
            return await _employeeLoanManager.GetAsync(id);
        }

        public async Task<object> ListOutStandingLoans()
        {
            return await _employeeLoanManager.GetOutStandingLoans();
        }

        /// <summary>
        /// 
        /// </summary>
        /// <param name="input"></param>
        public async Task Create(CreateEmployeeLoanInput input)
        {
            var obj = _mapper.Map<EmployeeLoan>(input);
            await _employeeLoanManager.Create(obj);
        }

        /// <summary>
        /// 
        /// </summary>
        /// <param name="input"></param>
        public async Task Update(UpdateEmployeeLoanInput input)
        {
            var obj = _mapper.Map<EmployeeLoan>(input);
            await _employeeLoanManager.Update(obj);
        }

        public async Task<object> ListPendingLoans()
        {
            return await _employeeLoanManager.GetPendingLoans();
        }

        public async Task Delete(Guid Id)
        {
            await _employeeLoanManager.Delete(Id);
        }

       /// <summary>
       /// 
       /// </summary>
       /// <param name="ids"></param>
       /// <param name="approvalType"></param>
       public async Task Approve(List<Guid> ids, string approvalType)
        {
            await _employeeLoanManager.Approve(ids, approvalType);
        }

    }
}
