using Abp.Domain.Repositories;
using TopazERP.DomainServices.Payroll.EmployeeBioDatas.Dto;
using TopazERP.Models.Payroll;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TopazERP.Models.Shared;

namespace TopazERP.DomainServices.Payroll.EmployeeBioDatas
{
   public class EmployeeBioDataManager: Abp.Domain.Services.DomainService, IEmployeeBioDataManager
    {

        private readonly IRepository<EmployeeBioData, Guid> _repositoryEmployeeBioData;
        private readonly IRepository<PersonnelStatus, Guid> _repositoryPersonnelStatus;
        private readonly IRepository<SystemNumber, Guid> _repositorySystemNumber; 

        public EmployeeBioDataManager(IRepository<EmployeeBioData, Guid> repositoryEmployeeBioData, IRepository<PersonnelStatus, Guid> repositoryPersonnelStatus, IRepository<SystemNumber, Guid> repositorySystemNumber)
        {
            _repositoryEmployeeBioData = repositoryEmployeeBioData;
            _repositoryPersonnelStatus = repositoryPersonnelStatus;
            _repositorySystemNumber = repositorySystemNumber;
        }

        public async Task<object> Create(EmployeeBioData entity)
        {
            var datta = await _repositoryEmployeeBioData.FirstOrDefaultAsync(x => x.EmployeeIdentifier == entity.EmployeeIdentifier);

            if (datta == null)
            {
                //get default status
                var defaultStatus = await _repositoryPersonnelStatus.FirstOrDefaultAsync(x=>x.IsDefault);

                if (defaultStatus != null && entity.StatusId == Guid.Empty)
                {
                    entity.StatusName = defaultStatus.Name;
                    entity.StatusId= defaultStatus.Id;
                }

                entity.FirstName = entity.FirstName.Trim();
                entity.LastName = entity.LastName.Trim();

                await _repositoryEmployeeBioData.InsertAsync(entity);

                //update system numbers
                var systemNumberInfo = await _repositorySystemNumber.FirstOrDefaultAsync(x=> x.ItemName == "EmployeeID");

                if(systemNumberInfo != null)
                {
                    systemNumberInfo.LastNo++;

                    await _repositorySystemNumber.UpdateAsync(systemNumberInfo);
                }
                

                return new
                {
                    code = 200,
                    message = "successful"
                };
            }

            return new
            {
                code = 400,
                message = "Duplicate Employee ID's are not allowed."
            };
        }

        public async Task Update(EmployeeBioData entity)
        {
            entity.FirstName = entity.FirstName.Trim();
            entity.LastName = entity.LastName.Trim();

            await _repositoryEmployeeBioData.UpdateAsync(entity);
        }

        public async Task<object> GetAsync(Guid id)
        {
            return await _repositoryEmployeeBioData.FirstOrDefaultAsync(id);
        }

        public async Task<EmployeeBioData> GetAsync(string employeeIdentifier)
        {
            return await _repositoryEmployeeBioData.FirstOrDefaultAsync(x=> !string.IsNullOrEmpty(employeeIdentifier) && x.EmployeeIdentifier == employeeIdentifier.Trim());
        }

        public async Task<object> ListAll()
        {
            var data = await _repositoryEmployeeBioData.GetAllListAsync();

            return data.OrderBy(a=>a.LastName);
        }
        public async Task Delete(Guid id)
        {
            await _repositoryEmployeeBioData.DeleteAsync(id);

        }
        
        public async Task UpdateStatus(Guid employeeId, Guid statusId)
        {
            var employeeInfo = await _repositoryEmployeeBioData.FirstOrDefaultAsync(employeeId);

            if (employeeInfo != null)
            {
                employeeInfo.StatusId = statusId;

                await _repositoryEmployeeBioData.UpdateAsync(employeeInfo);
            }

        }

        //export data
        public async Task<IEnumerable<AllowanceExportDto>> ExportAllowances()
        {
            var datta =  await _repositoryEmployeeBioData.GetAllListAsync();

            var query = from u1 in datta 
                        select new AllowanceExportDto
                        {
                            EmployeeIdentifier = u1.EmployeeIdentifier,
                            Amount = 0,
                            IsTaxable = "Yes",
                            AllowanceDays = 0,
                            AllowanceType = string.Empty,
                            EmployeeName = string.IsNullOrEmpty(u1.OtherName) ? $"{u1.LastName} {u1.FirstName}" : $"{u1.LastName} {u1.FirstName} {u1.OtherName}",
                        };

            return query.OrderBy(a => a.EmployeeName).ToList();
        }

        public async Task<IEnumerable<DeductionsExportDto>> ExportDeductions()
        {
            var datta = await _repositoryEmployeeBioData.GetAllListAsync();

            var query = from u1 in datta
                        select new DeductionsExportDto
                        {
                            EmployeeIdentifier = u1.EmployeeIdentifier,
                            Amount = 0,
                            EmployerAmount = 0,
                            DeductionType = string.Empty,
                            EmployeeName = string.IsNullOrEmpty(u1.OtherName) ? $"{u1.LastName} {u1.FirstName}" : $"{u1.LastName} {u1.FirstName} {u1.OtherName}",
                        };

            return query.OrderBy(a => a.EmployeeName).ToList();
        }

        public async Task<IEnumerable<SalaryInfoDto>> ExportSalaryInfo()
        {
            var datta = await _repositoryEmployeeBioData.GetAllListAsync();

            var query = from u1 in datta
                        select new SalaryInfoDto
                        {
                            EmployeeIdentifier = u1.EmployeeIdentifier,
                            SalaryType = "Salaried/Hourly",
                            PayType = "Cheque/Cash/Mobile Wallet",
                            AccountNumber = string.Empty,
                            BankName = string.Empty,
                            Currency = string.Empty,
                            MonthlySalary = 0,
                            EmployeeName = string.IsNullOrEmpty(u1.OtherName) ? $"{u1.LastName} {u1.FirstName}" : $"{u1.LastName} {u1.FirstName} {u1.OtherName}",
                        };

            return query.OrderBy(a => a.EmployeeName).ToList();
        }

        public async Task<IEnumerable<SsnitExportDto>> ExportSsnit()
        {
            var datta = await _repositoryEmployeeBioData.GetAllListAsync();

            var query = from u1 in datta
                        select new SsnitExportDto
                        {
                            EmployeeIdentifier = u1.EmployeeIdentifier,
                            SocialSecurityNo = string.Empty,
                            SocialSecurityFundEmployeeContribution = 0,
                            SocialSecurityFundEmployerContribution = 0,
                            ProvidentFundEmployeeContribution = 0,
                            ProvidentFundEmployerContribution = 0,
                            SecondProvidentFundEmployeeContribution = 0,
                            SecondProvidentFundEmployerContribution = 0,
                            SuperAnnuationEmployeeContribution = 0,
                            SuperAnnuationEmployerContribution = 0,
                            EmployeeName = string.IsNullOrEmpty(u1.OtherName) ? $"{u1.LastName} {u1.FirstName}" : $"{u1.LastName} {u1.FirstName} {u1.OtherName}",
                        };

            return query.OrderBy(a => a.EmployeeName).ToList();
        }
        
        public async Task<IEnumerable<EmployeeLoansExportDto>> ExportEmployeeLoans()
        {
            var datta = await _repositoryEmployeeBioData.GetAllListAsync();

            var query = from u1 in datta
                        select new EmployeeLoansExportDto
                        {
                            EmployeeIdentifier = u1.EmployeeIdentifier,
                            Amount = 0,
                            LoanDate = DateTime.UtcNow.ToString("dd-MMM-yyyy"),
                            InterestRate = 0, 
                            InterestType = "Simple Interest/Compound Interest",
                            LoanDuration = 12, 
                            LoanType = "Rent Loan",
                            NextDeduction = 3

                        };

            return query.OrderBy(a => a.EmployeeIdentifier).ToList();

        }

        public async Task<IEnumerable<BenefitsExportDto>> ExportBenefitsInKind()
        {
            var datta = await _repositoryEmployeeBioData.GetAllListAsync();

            var query = from u1 in datta
                        select new BenefitsExportDto
                        {
                            EmployeeIdentifier = u1.EmployeeIdentifier,
                            Amount = 0, 
                            BenefitsInKindTypeName = "",
                            EmployeeName = string.IsNullOrEmpty(u1.OtherName) ? $"{u1.LastName} {u1.FirstName}" : $"{u1.LastName} {u1.FirstName} {u1.OtherName}",
                        };

            return query.OrderBy(a => a.EmployeeName).ToList();
        }
    
    
    }
}
