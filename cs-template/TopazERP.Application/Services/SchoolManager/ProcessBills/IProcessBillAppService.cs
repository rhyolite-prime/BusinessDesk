using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Abp.Application.Services;
using TopazERP.DomainServices.SchoolManger.ProcessBills.Dto;
using TopazERP.Services.SchoolManager.ProcessBills.Dto;

namespace TopazERP.Services.SchoolManager.ProcessBills;

public interface IProcessBillAppService:IApplicationService
{
    Task<IEnumerable<object>> ListAllBills();
    Task<IEnumerable<object>> ListAllStudentBills();
    Task<object> CreateBill(CreateBillInput input);
    Task UpdateBill(UpdateBillInput input);
    Task DeleteBill(Guid id);
    //process bill
    Task<object> ProcessMultipleBills(ProcessMultipleBillsInput input);
    //Cancel Bill
    Task<object> CancelBill(Guid id);
    Task<object> CancelMultipleBills(List<Guid> billIds);
    Task<object> CancelBillsForStudents(CancelBillForStudentInput input);
    Task<bool> CheckExistingBill(CheckExistingBillDto input);
    Task<string> GenerateBillNumberAsync(Guid academicYearId, Guid termId, Guid classId);
}