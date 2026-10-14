using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using AutoMapper;
using TopazERP.DomainServices.SchoolManger.ProcessBills;
using TopazERP.DomainServices.SchoolManger.ProcessBills.Dto;
using TopazERP.Models.Sch;
using TopazERP.Services.SchoolManager.ProcessBills.Dto;

namespace TopazERP.Services.SchoolManager.ProcessBills
{
    public class ProcessBillAppService : TopazERPAppServiceBase, IProcessBillAppService
    {
        private readonly IMapper _mapper;
        private readonly IProcessBillManager _processBillManager;

        public ProcessBillAppService(
            IMapper mapper,
            IProcessBillManager processBillManager)
        {
            _mapper = mapper;
            _processBillManager = processBillManager;
        }

        /// <summary>
        /// Returns all bills.
        /// </summary>
        public async Task<IEnumerable<object>> ListAllBills()
        {
            return await _processBillManager.ListAllBills();
        }
        public async Task<IEnumerable<object>> ListAllStudentBills()
        {
            return await _processBillManager.ListAllStudentBills();
        }

        /// <summary>
        /// Creates a single bill.
        /// </summary>
        public async Task<object> CreateBill(CreateBillInput input)
        {
            var entity = _mapper.Map<Bill>(input);
            return await _processBillManager.CreateBill(entity);
        }

        /// <summary>
        /// Updates an existing bill.
        /// </summary>
        public async Task UpdateBill(UpdateBillInput input)
        {
            var entity = _mapper.Map<Bill>(input);
            await _processBillManager.UpdateBill(entity);
        }

        /// <summary>
        /// Deletes a bill.
        /// </summary>
        public async Task DeleteBill(Guid id)
        {
            await _processBillManager.DeleteBill(id);
        }

        /// <summary>
        /// Processes multiple bills.
        /// </summary>
        public async Task<object> ProcessMultipleBills(ProcessMultipleBillsInput input)
        {
            var entities = _mapper.Map<List<Bill>>(input.Items);
            return await _processBillManager.ProcessMultipleBills(entities);
        }

        /// <summary>
        /// Cancels a single bill.
        /// </summary>
        public async Task<object> CancelBill(Guid id)
        {
            return await _processBillManager.CancelBill(id);
        }

        /// <summary>
        /// Cancels multiple bills.
        /// </summary>
        public async Task<object> CancelMultipleBills(List<Guid> billIds)
        {
            return await _processBillManager.CancelMultipleBills(billIds);
        }
        public async Task<object> CancelBillsForStudents(CancelBillForStudentInput input)
        {
            return await _processBillManager.CancelBillsForStudents(
                input.studentBillInfoIds);
        }
        
        public async Task<bool> CheckExistingBill(CheckExistingBillDto input)
        {
            return await _processBillManager.CheckExistingBill(input);
        }

        public async Task<string> GenerateBillNumberAsync(Guid academicYearId, Guid termId, Guid classId)
        {
            return await _processBillManager.GenerateBillNumberAsync(academicYearId, termId, classId);
        }
    }
}