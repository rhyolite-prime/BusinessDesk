using Abp.Domain.Repositories;
using TopazERP.Models.Ar;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using TopazERP.Models.Shared;
namespace TopazERP.DomainServices.Ar.ArWithHoldings;

public class ArWithHoldingManager: Abp.Domain.Services.IDomainService, IArWithHoldingManager
{
    private readonly IRepository<ArInvoice, Guid> _arInvoiceRepository;
    private readonly IRepository<Customer, Guid> _repositoryCustomer;
    private readonly IRepository<ArWithholdingPayment, Guid> _arWithHoldingPaymentRepository;
    private readonly IRepository<ArInvoicePaymentRecords, Guid> _arInvoicePaymentRecordsRepository;
    
    public ArWithHoldingManager(IRepository<ArWithholdingPayment, Guid> arWithHoldingPaymentRepository, IRepository<ArInvoice, Guid> arInvoiceRepository, IRepository<Customer, Guid> repositoryCustomer, IRepository<ArInvoicePaymentRecords, Guid> arInvoicePaymentRecordsRepository)
    {
        _arInvoiceRepository = arInvoiceRepository;
        _arWithHoldingPaymentRepository = arWithHoldingPaymentRepository;
        _repositoryCustomer = repositoryCustomer;
        _arInvoicePaymentRecordsRepository = arInvoicePaymentRecordsRepository;
    }
    
    public async Task<object> ListAll()
    {
        var withHolding = await _arWithHoldingPaymentRepository.GetAllListAsync();
        return withHolding;
    }
    
    public async Task<object> Create(ArWithholdingPayment input)
    {
        input.CustomerName = input.CustomerName.Trim();

        var customer = await _repositoryCustomer.FirstOrDefaultAsync(x => x.Id == input.CustomerId);
        if (customer == null)
        {
            return new
            {
                code = 404,
                message = "Customer not found."
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
        var existingPayment = await _arWithHoldingPaymentRepository.FirstOrDefaultAsync(x => x.BatchNumber == input.BatchNumber);
        if (existingPayment != null)
        {
            return new
            {
            
                code = 400,
                message = "Payment with the same batch number already exists."
            };
        }
        if (customer.Balance <= 0)
        {
            return new
            {
                code = 400,
                message = "customer does not have any balance."
            };
        }
        // Validate InvoiceList before using it
        List<ArInvoice> invoices = new List<ArInvoice>();
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
        var createdEntity = await _arWithHoldingPaymentRepository.InsertAsync(input);

        return new
        {
            id = createdEntity.Id,
            code = 200,
            message = "Payment created and distributed successfully."
        };
    }
    
    public async Task Update(ArWithholdingPayment input)
    {
        await _arWithHoldingPaymentRepository.UpdateAsync(input);
    }
    
    public async Task Delete(Guid Id)
    {
        await _arWithHoldingPaymentRepository.DeleteAsync(Id);
    }
    
    public async Task<ArWithholdingPayment> GetAsync(string CustomerName)
    {
        return await _arWithHoldingPaymentRepository.FirstOrDefaultAsync(x => x.CustomerName == CustomerName);
    }
    
    public async Task<object> PostWithHoldings(List<Guid> withHoldingIds)
    {
        foreach (var withHoldingId in withHoldingIds)
        {
            var withHolding = await _arWithHoldingPaymentRepository.GetAsync(withHoldingId);

            if (withHolding == null)
            {
                continue;
            }

            if (!withHolding.IsPosted)
            {
                var customer = await _repositoryCustomer.FirstOrDefaultAsync(x => x.Id == withHolding.CustomerId);
                var defaultCurrency =customer?.CurrencyName;

                // Fetch related invoices
                /*var invoices = withHolding.InvoiceList?
                    .Where(invoice => invoice.IsPosted)
                    .OrderBy(invoice => invoice.ProjectedPayDate)
                    .ToList();*/
            
                var invoices = await _arInvoiceRepository.GetAll()
                    .Where(x =>  withHolding.InvoiceList.Select(i => i.Id).Contains(x.Id) && x.IsPosted)
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
                    decimal customerBuyingRate = customer?.BuyingRate ?? 1;
                    decimal convertedAmount = remainingAmountToWithhold * (paymentBuyRate / invoiceBuyRate);
                
                    // Calculate amount to apply to invoice, ensuring we do not exceed invoice balance
                    var amountToAllocate = Math.Min(invoice.Balance, convertedAmount);
                
                    decimal customerCurrencyAmount = amountToAllocate * (invoiceBuyRate / customerBuyingRate);
                    decimal usedPaymentCurrency = amountToAllocate * (invoiceBuyRate / paymentBuyRate);
                    customer.Balance -= customerCurrencyAmount;
                    invoice.WithheldAmount += amountToAllocate;
                    invoice.Balance -= amountToAllocate;
                    remainingAmountToWithhold -= usedPaymentCurrency;
                    var paymentRecord = new ArInvoicePaymentRecords
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
                        CustomerName = withHolding.CustomerName,
                        InvoiceNo = invoice.InvoiceNumber,
                        /*IsPosted = true,*/
                    }; 
                    await _arInvoicePaymentRecordsRepository.InsertAsync(paymentRecord);
                    await _arInvoiceRepository.UpdateAsync(invoice);
                    await _repositoryCustomer.UpdateAsync(customer);
                }
          
                // Update the customer balance
                if (customer != null)
                {
                    await _repositoryCustomer.UpdateAsync(customer);
                }

                // Mark the withholding as posted
                withHolding.IsPosted = true;
                await _arWithHoldingPaymentRepository.UpdateAsync(withHolding);
            }
        }

        return new { code = 200, message = "Withholding Payments posted successfully." };
    }
    public async Task<string> GenerateBatchNumberAsync()
    {
        var hasInvoices = await _arWithHoldingPaymentRepository.CountAsync() > 0;
        if (!hasInvoices)
        {
            return "0001-WP";
        }
        else
        {
            var lastBatch = await _arWithHoldingPaymentRepository.GetAllListAsync();

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