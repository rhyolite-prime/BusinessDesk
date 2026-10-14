using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Abp.Domain.Services;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.SchGlAccounts;

public interface ISchGlAccountsManager:IDomainService
{
    //bills
    Task<IEnumerable<object>> ListBillAccounts();
    Task<object> CreateBillAccount(SchBillAccount schBillAccount);
    Task UpdateBillAccount(SchBillAccount schBillAccount);
    Task DeleteBillAccount(Guid id);
    //payments
    Task<IEnumerable<object>> ListPaymentAccounts();
    Task<object> CreatePaymentAccount(SchPaymentAccount schPaymentAccount);
    Task UpdatePaymentAccount(SchPaymentAccount schPaymentAccount);
    Task DeletePaymentAccount(Guid id);
    //creditMemo
    Task<IEnumerable<object>> ListCreditMemoAccounts();
    Task<object> CreateCreditMemoAccount(SchCreditMemoAccount schCreditMemoAccount);
    Task UpdateCreditMemoAccount(SchCreditMemoAccount schCreditMemoAccount);
    Task DeleteCreditMemoAccount(Guid id);
}