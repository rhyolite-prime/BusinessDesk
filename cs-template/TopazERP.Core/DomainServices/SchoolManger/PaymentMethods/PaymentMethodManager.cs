using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Abp.Domain.Repositories;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.PaymentMethods;

public class PaymentMethodManager : Abp.Domain.Services.DomainService, IPaymentMethodManager
{
    private readonly IRepository<PaymentMethod, Guid> _repositoryPaymentMethod;

    public PaymentMethodManager(IRepository<PaymentMethod, Guid> repositoryPaymentMethod)
    {
        _repositoryPaymentMethod = repositoryPaymentMethod;
    }

    public async Task<object> Create(PaymentMethod entity)
    {
        var data = await _repositoryPaymentMethod.FirstOrDefaultAsync(x => x.Name.Trim().ToLower() == entity.Name.Trim().ToLower());
        if (data == null)
        {
            await _repositoryPaymentMethod.InsertAsync(entity);
            return new { code = 200, message = "successful" };
        }
        return new { code = 400, message = "Duplicate records are not allowed." };
    }

    public async Task Update(PaymentMethod entity)
    {
        await _repositoryPaymentMethod.UpdateAsync(entity);
    }

    public async Task<IEnumerable<object>> ListAll()
    {
        var data = await _repositoryPaymentMethod.GetAllListAsync();
        return data.OrderBy(d => d.Name).ToList();
    }

    public async Task Delete(Guid id)
    {
        await _repositoryPaymentMethod.DeleteAsync(id);
    }
}