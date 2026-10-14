using Abp.Domain.Repositories;
using TopazERP.Models.Ap;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using TopazERP.Models.Shared;

namespace TopazERP.DomainServices.Ap.ApWithHoldings;

public class ApWithHoldingManager: Abp.Domain.Services.IDomainService, IApWithHoldingManager
{
    private readonly IRepository<ApInvoice, Guid> _apInvoiceRepository;
    private readonly IRepository<Supplier, Guid> _repositorySupplier;
    private readonly IRepository<ApWithHoldingPayment, Guid> _apWithHoldingPaymentRepository;
    private readonly IRepository<ApInvoicePaymentRecords, Guid> _apInvoicePaymentRecordsRepository;
    public ApWithHoldingManager(IRepository<ApWithHoldingPayment, Guid> apWithHoldingPaymentRepository, IRepository<ApInvoice, Guid> apInvoiceRepository, IRepository<Supplier, Guid> repositorySupplier, IRepository<ApInvoicePaymentRecords, Guid> apInvoicePaymentRecordsRepository)
    {
        _apInvoiceRepository = apInvoiceRepository;
        _apWithHoldingPaymentRepository = apWithHoldingPaymentRepository;
        _repositorySupplier = repositorySupplier;
        _apInvoicePaymentRecordsRepository = apInvoicePaymentRecordsRepository;
    }
    
    public async Task<object> ListAll()
    {
        var withHolding = await _apWithHoldingPaymentRepository.GetAllListAsync();
        return withHolding;
    }

    public async Task<object> Create(ApWithHoldingPayment input)
    {
        input.SupplierName = input.SupplierName.Trim();

        // Fetch the supplier and validate
        var supplier = await _repositorySupplier.FirstOrDefaultAsync(x => x.Id == input.SupplierId);
        if (supplier == null)
        {
            return new
            {
                code = 404,
                message = "Supplier not found."
            };
        }
        if (string.IsNullOrWhiteSpace(input.BatchNumber) || input.BatchNumber.Trim() == "0")
        {
            input.BatchNumber = await GenerateBatchNumberAsync();
        }
        else
        {
            input.BatchNumber = input.BatchNumber.Trim();
        }
        var existingPayment = await _apWithHoldingPaymentRepository.FirstOrDefaultAsync(x => x.BatchNumber == input.BatchNumber);
        if (existingPayment != null)
        {
            return new
            {
            
                code = 400,
                message = "Payment with the same batch number already exists."
            };
        }
        if (supplier.Balance <= 0)
        {
            return new
            {
                code = 400,
                message = "Supplier does not have any balance."
            };
        }
        // Validate InvoiceList before using it
        List<ApInvoice> invoices = new List<ApInvoice>();
        if (input.InvoiceList == null || !input.InvoiceList.Any())
        {
            return new
            {
                code = 400,
                message = "No invoices attached to the payment."
            };
        }

        // Filter invoices with posted  true
        invoices = input.InvoiceList.Where(invoice => invoice.IsPosted).ToList();
        if (!invoices.Any())
        {
            return new
            {
                code = 400,
                message = "No posted invoices found."
            };
        }

        // Save the payment record
        var createdEntity = await _apWithHoldingPaymentRepository.InsertAsync(input);

        return new
        {
            id = createdEntity.Id,
            code = 200,
            message = "Payment created and distributed successfully."
        };
    }

    public async Task Update(ApWithHoldingPayment input)
    {
        await _apWithHoldingPaymentRepository.UpdateAsync(input);
    }
    
    public async Task Delete(Guid Id)
    {
        await _apWithHoldingPaymentRepository.DeleteAsync(Id);
    }
    
    //GET
    public async Task<ApWithHoldingPayment> GetAsync(string SupplierName)
    {
        return await _apWithHoldingPaymentRepository.FirstOrDefaultAsync(x => x.SupplierName == SupplierName);
    }

 public async Task<object> PostWithHoldings(List<Guid> withHoldingIds)
{
    foreach (var withHoldingId in withHoldingIds)
    {
        var withHolding = await _apWithHoldingPaymentRepository.GetAsync(withHoldingId);

        if (withHolding == null)
        {
            continue;
        }

        if (!withHolding.IsPosted)
        {
            var supplier = await _repositorySupplier.FirstOrDefaultAsync(x => x.Id == withHolding.SupplierId);
            var defaultCurrency = supplier?.CurrencyName;

            /*// Fetch related invoices
            var invoices = withHolding.InvoiceList?
                .Where(invoice => invoice.IsPosted)
                .OrderBy(invoice => invoice.ProjectedPayDate)
                .ToList();*/
            var invoices = await _apInvoiceRepository.GetAll()
                .Where(x => withHolding.InvoiceList.Select(i => i.Id).Contains(x.Id) && x.IsPosted)
                .OrderBy(x => x.ProjectedPayDate)
                .ToListAsync();
            
            if (invoices == null || !invoices.Any())
            {
                return new { code = 400, message = "No invoices available for posting." };
            }

            decimal remainingAmountToWithhold = withHolding.AmountToApply;
            
            foreach (var invoice in invoices)
            {
                if (remainingAmountToWithhold <= 0) break;

                decimal paymentBuyRate = withHolding.BuyRate > 0 ? withHolding.BuyRate : 1;
                decimal invoiceBuyRate = invoice.BuyRate > 0 ? invoice.BuyRate : 1;
                decimal supplierBuyingRate = supplier?.buyingRate ?? 1;
                decimal convertedAmount = remainingAmountToWithhold * (paymentBuyRate / invoiceBuyRate);

                var amountToAllocate = Math.Min(invoice.Balance, convertedAmount);
               
                decimal supplierCurrencyAmount = amountToAllocate * (invoiceBuyRate / supplierBuyingRate);
                decimal usedPaymentCurrency = amountToAllocate * (invoiceBuyRate / paymentBuyRate);

                supplier.Balance -= supplierCurrencyAmount;;
                invoice.Balance -= amountToAllocate;
                invoice.WithheldAmount += amountToAllocate;
                remainingAmountToWithhold -= usedPaymentCurrency;

                var paymentRecord = new ApInvoicePaymentRecords
                {
                    PaymentId = withHolding.Id,
                    InvoiceId = invoice.Id,
                    WithheldAmount = withHolding.AmountToPay,
                    ConvertedWithheldAmount = amountToAllocate,
                    PaymentDate = withHolding.PaymentDate,
                    BankName = withHolding.BankAccountName,
                    CurrencyName = withHolding.CurrencyName,
                    CurrencyCode = withHolding.CurrencyCode,
                    ModeOfPayment = withHolding.ModeOfPayment,
                    ChequeNo = withHolding.ChequeNumber,
                    SupplierName = withHolding.SupplierName,
                    InvoiceNo = invoice.InvoiceNumber,
                    /*IsPosted = true,*/
                };
                await _apInvoicePaymentRecordsRepository.InsertAsync(paymentRecord);
                await _apInvoiceRepository.UpdateAsync(invoice);
                await _repositorySupplier.UpdateAsync(supplier);
            }
            
            // Update the supplier balance
            if (supplier != null)
            {
                await _repositorySupplier.UpdateAsync(supplier);
            }

            // Mark the withholding as posted
            withHolding.IsPosted = true;
            await _apWithHoldingPaymentRepository.UpdateAsync(withHolding);
        }
    }

    return new { code = 200, message = "Withholdings posted successfully." };
}

public async Task<string> GenerateBatchNumberAsync()
{
    var hasInvoices = await _apWithHoldingPaymentRepository.CountAsync() > 0;
    if (!hasInvoices)
    {
        return "0001-WP"; // First batch with suffix
    }
    else
    {
        var lastBatch = await _apWithHoldingPaymentRepository.GetAllListAsync();

        // Extract only numbers before "WP"
        var lastBatchNumber = lastBatch
            .Select(x =>
            {
                var numberPart = x.BatchNumber?.Replace("-WP", ""); 
                return int.TryParse(numberPart, out var num) ? num : 0;
            })
            .DefaultIfEmpty(0)
            .Max();

        int nextBatchNumber = lastBatchNumber + 1;
        string batchNumber = nextBatchNumber.ToString("D4") + "-WP"; 
        return batchNumber;
    }
}


}