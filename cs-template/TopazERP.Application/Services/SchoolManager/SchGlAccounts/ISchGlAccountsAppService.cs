using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Abp.Application.Services;
using TopazERP.Services.SchoolManager.SchGlAccounts.Dto;

namespace TopazERP.Services.SchoolManager.SchGlAccounts;

public interface ISchGlAccountsAppService:IApplicationService
{
        //bills
        Task<IEnumerable<object>> ListBillAccounts();
        Task<object> CreateBillAccount(CreateSchBillAccountInput schBillAccount);
        Task UpdateBillAccount(UpdateSchBillAccountInput schBillAccount);
        Task DeleteBillAccount(Guid id);
        //payments
        Task<IEnumerable<object>> ListPaymentAccounts();
        Task<object> CreatePaymentAccount(CreateSchPaymentAccountInput schPaymentAccount);
        Task UpdatePaymentAccount(UpdateSchPaymentAccountInput schPaymentAccount);
        Task DeletePaymentAccount(Guid id);
        //creditMemo
        Task<IEnumerable<object>> ListCreditMemoAccounts();
        Task<object> CreateCreditMemoAccount(CreateSchCreditMemoAccountInput schCreditMemoAccount);
        Task UpdateCreditMemoAccount(UpdateSchCreditMemoAccountInput schCreditMemoAccount);
        Task DeleteCreditMemoAccount(Guid id);
}