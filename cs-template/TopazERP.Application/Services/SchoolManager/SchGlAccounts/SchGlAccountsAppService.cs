using System.Collections.Generic;
using System.Threading.Tasks;
using AutoMapper;
using TopazERP.DomainServices.SchoolManger.SchGlAccounts;
using TopazERP.Models.Sch;
using TopazERP.Services.SchoolManager.SchGlAccounts.Dto;

namespace TopazERP.Services.SchoolManager.SchGlAccounts;

public class SchGlAccountsAppService: TopazERPAppServiceBase, ISchGlAccountsAppService
{
    private readonly IMapper _mapper;
    private readonly ISchGlAccountsManager _schGlAccountsManager;

    public SchGlAccountsAppService(IMapper mapper, ISchGlAccountsManager schGlAccountsManager)
    {
        _mapper = mapper;
        _schGlAccountsManager = schGlAccountsManager;
    }
    
    // biils
    public async Task<IEnumerable<object>> ListBillAccounts()
    {
        return await _schGlAccountsManager.ListBillAccounts();
    }
    public async Task<object> CreateBillAccount(CreateSchBillAccountInput schBillAccount)
    {
        var entity = _mapper.Map<SchBillAccount>(schBillAccount);
        return await _schGlAccountsManager.CreateBillAccount(entity);
    }
    public async Task UpdateBillAccount(UpdateSchBillAccountInput schBillAccount)
    {
        var entity = _mapper.Map<SchBillAccount>(schBillAccount);
        await _schGlAccountsManager.UpdateBillAccount(entity);
    }

    public async Task DeleteBillAccount(System.Guid id)
    {
        await _schGlAccountsManager.DeleteBillAccount(id);
    }
    //payment accounts
    public async Task<IEnumerable<object>> ListPaymentAccounts()
    {
        return await _schGlAccountsManager.ListPaymentAccounts();
    }

    public async Task<object> CreatePaymentAccount(CreateSchPaymentAccountInput schPaymentAccount)
    {
        var entity = _mapper.Map<SchPaymentAccount>(schPaymentAccount);
        return await _schGlAccountsManager.CreatePaymentAccount(entity);
    }
    public async Task UpdatePaymentAccount(UpdateSchPaymentAccountInput schPaymentAccount)
    {
        var entity = _mapper.Map<SchPaymentAccount>(schPaymentAccount);
        await _schGlAccountsManager.UpdatePaymentAccount(entity);
    }
    public async Task DeletePaymentAccount(System.Guid id)
    {
        await _schGlAccountsManager.DeletePaymentAccount(id);
    }
    //credit memo accounts
    public async Task<IEnumerable<object>> ListCreditMemoAccounts()
    {
        return await _schGlAccountsManager.ListCreditMemoAccounts();
    }
    public async Task<object> CreateCreditMemoAccount(CreateSchCreditMemoAccountInput schCreditMemoAccount)
    {
        var entity = _mapper.Map<SchCreditMemoAccount>(schCreditMemoAccount);
        return await _schGlAccountsManager.CreateCreditMemoAccount(entity);
    }

    public async Task UpdateCreditMemoAccount(UpdateSchCreditMemoAccountInput schCreditMemoAccount)
    {
        var entity = _mapper.Map<SchCreditMemoAccount>(schCreditMemoAccount);
        await _schGlAccountsManager.UpdateCreditMemoAccount(entity);
    }
    public async Task DeleteCreditMemoAccount(System.Guid id)
    {
        await _schGlAccountsManager.DeleteCreditMemoAccount(id);
    }


}