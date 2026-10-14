using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TopazERP.DomainServices.Ap.ApVouchers.Dto;
using TopazERP.Models.Ap;

namespace TopazERP.DomainServices.Ap.ApVouchers
{
   public interface IApVoucherManager: Abp.Domain.Services.IDomainService
    {
        Task<object> ListAll();
        //get invoices by supplierid
        Task<object> GetInvoicesBySupplierId(Guid supplierId);
        //Task<object> PostVoucher(List<Guid> voucherIds);
        Task<object> Create(ApVoucher input);
        Task<ApVoucher> GetAsync(string SupplierName);
        Task Update(ApVoucher input);
        Task Delete(Guid Id);
        Task<object> DeleteMultiple(List<Guid> ids);
        Task<object> PostVouchers(List<Guid> voucherIds);
        Task<string> GenerateBatchNumberAsync();
        

    }
}
