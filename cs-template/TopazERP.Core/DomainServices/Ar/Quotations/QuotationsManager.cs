using Abp.Domain.Repositories;
using TopazERP.Models.Ar;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using StackExchange.Redis;
using TopazERP.Models.Shared;

namespace TopazERP.DomainServices.Ar.Quotations;

public class QuotationsManager: Abp.Domain.Services.IDomainService, IQuotationsManager
{
    private readonly IRepository<Quotation, Guid> _quotationRepository;
    private readonly IRepository<Customer, Guid> _repositoryCustomer;
    
    
    public QuotationsManager(IRepository<Quotation, Guid> quotationRepository, IRepository<Customer, Guid> repositoryCustomer)
    {
        _quotationRepository = quotationRepository;
        _repositoryCustomer = repositoryCustomer;
       
    }
    
    public async Task<object> ListAll()
    {
        var quotations = await _quotationRepository.GetAllListAsync();
        return quotations;
    }

    public async Task<object> GetAsync(string customerName)
    {
        var customer = await _repositoryCustomer.FirstOrDefaultAsync(x => x.Name == customerName);
        if (customer == null)
        {
            throw new Exception("Customer not found");
        }

        var quotations = await _quotationRepository.GetAllListAsync(x => x.CustomerId == customer.Id);
        return quotations;
    }

    public async Task<object> Create(Quotation input)
    {
        var existingQuotation = await _quotationRepository.FirstOrDefaultAsync(x => x.QuotationNumber == input.QuotationNumber);
        if (existingQuotation != null)
        {
            return new
            {
                code = 400,
                message = "This Quotation already exists."
            };
        }
        var customer = await _repositoryCustomer.FirstOrDefaultAsync(x => x.Id == input.CustomerId);
        if (customer == null)
        {
            return new
            {
                code = 400,
                message = "Customer not found."
            };
        }
        //if quotation number is not provided, generate a new one
        if (string.IsNullOrWhiteSpace(input.QuotationNumber) || input.QuotationNumber.Trim() == "0")
        {
            input.QuotationNumber = await GenerateQuotationNumberAsync();
        }
        else
        {
            input.QuotationNumber = input.QuotationNumber.Trim();
        }
        
        var createdQuotation = await _quotationRepository.InsertAsync(input);
        return new
        {
            code = 200,
            message = "Quotation created successfully.",
            data = createdQuotation
        };
        
    }

    private async Task<string> GenerateQuotationNumberAsync()
    {
        //generate Quotation number
        var hasQuotation = await _quotationRepository.CountAsync() > 0;
        if (!hasQuotation)
        {
            return "0001";
        }
        else
        {
            var lastNumber = await _quotationRepository.GetAllListAsync();
            var lastQuotationNumber = lastNumber
                .Where(x => int.TryParse(x.QuotationNumber, out _))
                .Select(x => int.Parse(x.QuotationNumber))
                .DefaultIfEmpty(0)
                .Max();
            int nextQuotationNumber = lastQuotationNumber + 1;
            string quotationNumber = nextQuotationNumber.ToString("D4");
            return quotationNumber;
        }
       
    }
    

    public async Task<object> Update(Quotation input)
    {
        var customer = await _repositoryCustomer.FirstOrDefaultAsync(x => x.Id == input.CustomerId);

        if (customer == null)
        {
            throw new Exception("Customer not found.");
        }
        
        foreach (var detailInput in input.Details.ToList())
        {
            var existingDetail = input.Details.FirstOrDefault(x => x.Id == detailInput.Id);
            if (existingDetail != null)
            {
                existingDetail.ReferenceNo = detailInput.ReferenceNo;
                existingDetail.Description = detailInput.Description;
                existingDetail.Quantity = detailInput.Quantity;
                existingDetail.Amount = detailInput.Amount;
                existingDetail.UnitPrice = detailInput.UnitPrice;
                existingDetail.SubTotal = (detailInput.Quantity * detailInput.UnitPrice) - detailInput.Amount;
                existingDetail.DiscountAsPercentage = detailInput.DiscountAsPercentage;
                existingDetail.Discount = detailInput.Discount;
                existingDetail.DebitAccountId = detailInput.DebitAccountId;
                existingDetail.DebitAccountName = detailInput.DebitAccountName;
                
            }
            else
            {
                var newDetail = new QuotationDetail
                {
                    ReferenceNo = detailInput.ReferenceNo,
                    Description = detailInput.Description,
                    Quantity = detailInput.Quantity,
                    Amount = detailInput.Amount,
                    SubTotal = (detailInput.Quantity * detailInput.UnitPrice) - detailInput.Amount,
                    DiscountAsPercentage =  detailInput.DiscountAsPercentage,
                    Discount = detailInput.Discount,
                    UnitPrice = detailInput.UnitPrice,
                    DebitAccountId = detailInput.DebitAccountId,
                    DebitAccountName = detailInput.DebitAccountName,
                    Id = detailInput.Id
                };
                input.Details.Add(newDetail);
            }
        }

        await _quotationRepository.UpdateAsync(input);
        return new
        {
            code = 200,
            message = "Quotation updated successfully."
        };
    }

    public async Task<object> Delete(Guid id)
    {
        await _quotationRepository.DeleteAsync(id);
        //save changes
        return new
        {
            deletedId = id,
            code = 200,
            message = "Quotation deleted successfully."
        };
    }
   
   
}
