using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Abp.Domain.Services;
using TopazERP.DomainServices.SchoolManger.ProcessBills.Dto;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.ProcessBills;

public interface IProcessBillManager:IDomainService
{
    Task<IEnumerable<object>> ListAllBills();
    Task<IEnumerable<object>> ListAllStudentBills();
    Task<object> CreateBill(Bill bill);
    Task UpdateBill(Bill bill);
    Task DeleteBill(Guid id);
    Task<object> ProcessMultipleBills(List<Bill> bills);
    //Cancel Bill
    Task<object> CancelBill(Guid id);
    Task<object> CancelMultipleBills(List<Guid> billIds);
    Task<object> CancelBillsForStudents(List<Guid> studentBillInfoIds);
    Task<bool> CheckExistingBill(CheckExistingBillDto input);
    Task<string> GenerateBillNumberAsync(Guid academicYearId, Guid termId, Guid classId);
}