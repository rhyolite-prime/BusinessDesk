using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Abp.Domain.Repositories;
using Abp.Domain.Services;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.SchGlAccounts;

public class SchGlAccountsManager:DomainService, ISchGlAccountsManager
{
    private readonly IRepository<SchBillAccount, Guid> _billAccountRepository;
    private readonly IRepository<SchPaymentAccount, Guid> _paymentAccountRepository;
    private readonly IRepository<SchCreditMemoAccount, Guid> _creditMemoAccountRepository;

    public SchGlAccountsManager(IRepository<SchBillAccount, Guid> billAccountRepository, IRepository<SchPaymentAccount, Guid> paymentAccountRepository, IRepository<SchCreditMemoAccount, Guid> creditMemoAccountRepository)
    {
        _billAccountRepository = billAccountRepository;
        _paymentAccountRepository = paymentAccountRepository;
        _creditMemoAccountRepository = creditMemoAccountRepository;
    }
    //bill account
    public async Task<IEnumerable<object>> ListBillAccounts()
    {
        var data = await _billAccountRepository.GetAllListAsync();
        return data;
    }
    
    public async Task<object> CreateBillAccount(SchBillAccount schBillAccount)
    {
            await _billAccountRepository.InsertAsync(schBillAccount);
            return new { code = 200, message = "successful" };
    }

    public async Task UpdateBillAccount(SchBillAccount schBillAccount)
    {
        await _billAccountRepository.UpdateAsync(schBillAccount);
    }
     
    public async Task DeleteBillAccount(Guid id)
    {
        await _billAccountRepository.DeleteAsync(id);
    }
    
    //payment account
    public async Task<IEnumerable<object>> ListPaymentAccounts()
    {
        var data = await _paymentAccountRepository.GetAllListAsync();
        return data;
    }
    
    public async Task<object> CreatePaymentAccount(SchPaymentAccount schPaymentAccount)
    {
        await _paymentAccountRepository.InsertAsync(schPaymentAccount);
        return new { code = 200, message = "successful" };
    }

    public async Task UpdatePaymentAccount(SchPaymentAccount schPaymentAccount)
    {
        await _paymentAccountRepository.UpdateAsync(schPaymentAccount);
    }

    public async Task DeletePaymentAccount(Guid id)
    {
        await _paymentAccountRepository.DeleteAsync(id);
    }

    //credit memo account
    public async Task<IEnumerable<object>> ListCreditMemoAccounts()
    {
        var data = await _creditMemoAccountRepository.GetAllListAsync();
        return data;
    }

    public async Task<object> CreateCreditMemoAccount(SchCreditMemoAccount schCreditMemoAccount)
    {
        await _creditMemoAccountRepository.InsertAsync(schCreditMemoAccount);
        return new { code = 200, message = "successful" };
    }

    public async Task UpdateCreditMemoAccount(SchCreditMemoAccount schCreditMemoAccount)
    {
        await _creditMemoAccountRepository.UpdateAsync(schCreditMemoAccount);
    }

    public async Task DeleteCreditMemoAccount(Guid id)
    {
        await _creditMemoAccountRepository.DeleteAsync(id);
    }
    
}