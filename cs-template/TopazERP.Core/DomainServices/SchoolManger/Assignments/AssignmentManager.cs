using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Abp.Domain.Repositories;
using Microsoft.AspNetCore.Components.Forms;
using Microsoft.EntityFrameworkCore;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.Assignments;

public class AssignmentManager: Abp.Domain.Services.DomainService, IAssignmentManager
{
    private readonly IRepository<ClassAssignment, Guid> _classAssignmentRepository;
    private readonly IRepository<ResultPeriod, Guid> _resultPeriodRepository;

    public AssignmentManager(IRepository<ClassAssignment, Guid> classAssignmentRepository, IRepository<ResultPeriod, Guid> resultPeriodRepository)
    {
        _classAssignmentRepository = classAssignmentRepository;
        _resultPeriodRepository = resultPeriodRepository;
    }

    public async Task<IEnumerable<object>> ListAllByType(string type)
    {
        var allData = await _classAssignmentRepository.GetAllListAsync();
        var filtered = allData.Where(a => a.Type == type).ToList();
        return filtered;
    }
    public async Task<IEnumerable<object>> ListAll()
    {
        var allData = await _classAssignmentRepository.GetAllListAsync();
        return allData.ToList();
    }
    
    public async Task<object> Create(ClassAssignment assignment)
    {
       
        var now = DateTime.UtcNow; 

        var period = await _resultPeriodRepository.FirstOrDefaultAsync(r =>
            r.AcademicYearId == assignment.AcademicYearId &&
            r.TermId == assignment.TermId
        );
        if (period == null)
        {
            return new
            {
                code = 400,
                message = "No result entering period defined for this academic year and term."
            };
        }
        if (now < period.StartDate || now > period.EndDate)
        {
            return new
            {
                code = 400,
                message = $"You cannot add this result. Current date is outside the result entering period ({period.StartDate:dd/MM/yyyy} - {period.EndDate:dd/MM/yyyy})."
            };
        }

        foreach (var detail in assignment.Details)
        {
            if (detail.Marks < 0 || detail.Marks > assignment.OverallMark)
            {
                return new
                {
                    code = 400,
                    message = "Marks must be between 0 and Overall Marks."
                };
            }
        }
        var existing = await _classAssignmentRepository.FirstOrDefaultAsync(a =>
            a.AcademicYearId == assignment.AcademicYearId &&
            a.ClassId == assignment.ClassId &&
            a.SubjectId == assignment.SubjectId &&
            a.TermId == assignment.TermId &&
            a.Type == assignment.Type &&
            a.AssignedDate == assignment.AssignedDate &&
            a.AssignmentNumber == assignment.AssignmentNumber
        );

        if (existing != null)
        {
            return new
            {
                code = 400,
                message = "Duplicate records are not allowed."
            };
        }
        

        await _classAssignmentRepository.InsertAsync(assignment);
        
        foreach (var detail in assignment.Details)
        {
            detail.ClassAssignmentId = assignment.Id;
        }

        return new
        {
            code = 200,
            message = "Result created successfully."
        };
    }


    public async Task Update(ClassAssignment assignment)
    {
        await _classAssignmentRepository.UpdateAsync(assignment);
    }

    public async Task Delete(Guid id)
    {
        await _classAssignmentRepository.DeleteAsync(id);
    }
    
    public async Task<int> GetNextAssignmentNumber(
        Guid academicYearId,
        Guid termId,
        Guid classId,
        Guid subjectId,
        string type)
    {
        var last = await _classAssignmentRepository
            .GetAll()
            .Where(a =>
                a.AcademicYearId == academicYearId &&
                a.TermId == termId &&
                a.ClassId == classId &&
                a.SubjectId == subjectId &&
                a.Type == type)
            .OrderByDescending(a => a.AssignmentNumber)
            .Select(a => a.AssignmentNumber)
            .FirstOrDefaultAsync();

        return last + 1;
    }
    
    // result period specific methods
    public async Task<IEnumerable<object>> ListAllPeriods()
    {
        var allData = await _resultPeriodRepository.GetAllListAsync();
        return allData;
    }
    public async Task<object> CreatePeriod(ResultPeriod period)
    {
        var data = await _resultPeriodRepository.FirstOrDefaultAsync
        (p =>
            p.AcademicYearId == period.AcademicYearId &&
            p.TermId == period.TermId &&
            p.StartDate == period.StartDate &&
            p.EndDate == period.EndDate
        );

        if (data == null)
        {
            await _resultPeriodRepository.InsertAsync(period);
            return new { code = 200, message = "successful"};
        }
        else
        {
            return new { code = 400, message = "Duplicate records are not allowed."};
        }
    }
    public async Task UpdatePeriod(ResultPeriod assignment)
    {
        await _resultPeriodRepository.UpdateAsync(assignment);
    }

    public async Task DeletePeriod(Guid id)
    {
        await _resultPeriodRepository.DeleteAsync(id);
    }

}