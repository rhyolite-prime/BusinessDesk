using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Abp.Domain.Repositories;
using Abp.Domain.Services;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.OpeningBalances;

public class OpeningBalanceManager:DomainService, IOpeningBalanceManager
{
    private readonly IRepository<StudentOpeningBalance, Guid> _repositoryBalance;
    private readonly IRepository<StudentInfo, Guid> _studentInfoRepository;
    public OpeningBalanceManager(IRepository<StudentOpeningBalance, Guid> repositoryBalance, IRepository<StudentInfo, Guid> studentInfoRepository)
    {
        _repositoryBalance = repositoryBalance;
        _studentInfoRepository = studentInfoRepository;
    }


    public async Task<IEnumerable<object>> ListAll()
    {
        var data = await _repositoryBalance.GetAllListAsync();
        return data.OrderBy(d => d.StudentIdentifier).ToList();
    }

    public async Task<object> Create(StudentOpeningBalance entity)
    {
        await _repositoryBalance.InsertAsync(entity);

        return new
        {
            code = 200,
            message = "Successful"
        };
    }

    public async Task Update(StudentOpeningBalance input)
    {
        await _repositoryBalance.UpdateAsync(input);
    }

    public async Task Delete(Guid id)
    {
        var openingBalance = await _repositoryBalance.FirstOrDefaultAsync(id);
        if (openingBalance == null)
            return;
        if (openingBalance.IsPosted)
        {
            var student = await _studentInfoRepository.FirstOrDefaultAsync(x => x.Id == openingBalance.StudentId);

            if (student != null)
            {
                decimal rate = openingBalance.Rate <= 0 ? 1 : openingBalance.Rate;
                decimal convertedAmount = openingBalance.Amount * rate;

                student.BalanceDue -= convertedAmount;

                await _studentInfoRepository.UpdateAsync(student);
            }
        }

        await _repositoryBalance.DeleteAsync(openingBalance);
    }

    public async Task<object> Delete(List<Guid> balanceIds)
    {
        if (balanceIds == null || !balanceIds.Any())
        {
            return new
            {
                code = 400,
                message = "No balances selected."
            };
        }

        var selectedBalances = await _repositoryBalance.GetAllListAsync(x => balanceIds.Contains(x.Id));

        if (!selectedBalances.Any())
            return new { code = 404, message = "Balance(s) not found." };

        foreach (var balance in selectedBalances)
        {
            await Delete(balance.Id);
        }

        return new { code = 200, message = "Balance(s) deleted successfully." };
    }

    public async Task<StudentOpeningBalance> GetAsync(string studentName)
    {
        return await _repositoryBalance.FirstOrDefaultAsync(x => x.StudentName == studentName);
    }
    
    public async Task<object> PostBalances(List<Guid> balanceIds)
    {
        if (balanceIds == null || !balanceIds.Any())
        {
            return new
            {
                code = 400,
                message = "No balance selected."
            };
        }

        var selectedBalances = await _repositoryBalance.GetAllListAsync(x => balanceIds.Contains(x.Id));

        if (!selectedBalances.Any())
            return new { code = 404, message = "Balance(s) not found." };
        
        foreach (var b in selectedBalances)
        {
            
            b.IsPosted = true;
           
            
            var student = await _studentInfoRepository.FirstOrDefaultAsync(x => x.Id == b.StudentId);

            if (student == null)
                return new { code = 404, message = "Student not found." };

            decimal rate = b.Rate <= 0 ? 1 : b.Rate;
            decimal convertedAmount = b.Amount * rate;

            student.BalanceDue += convertedAmount;

            await _studentInfoRepository.UpdateAsync(student);
            await _repositoryBalance.UpdateAsync(b);
            
        }

        return new { code = 200, message = "Balance(s) posted successfully." };
    }
}