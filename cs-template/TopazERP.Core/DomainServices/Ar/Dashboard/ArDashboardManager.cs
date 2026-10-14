using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Abp.Domain.Repositories;
using TopazERP.Models.Shared;
using TopazERP.Models.Ar;

namespace TopazERP.DomainServices.Ar.Dashboard;

public class ArDashboardManager: Abp.Domain.Services.DomainService, IArDashboardManager
{
    private readonly IRepository<Customer, Guid> _repositoryCustomer;
    //open balance
    private readonly IRepository<ArOpeningBalance, Guid> _repositoryOpeningBalance;
   
    //invoices
    private readonly IRepository<ArInvoice, Guid> _repositoryInvoice;
    //currency
    private readonly IRepository<Currency, Guid> _repositoryCurrency;
    private readonly IRepository<ArPayment, Guid> _repositoryPayment;
    
    public ArDashboardManager(IRepository<Customer, Guid> repositoryCustomer, IRepository<Currency, Guid> repositoryCurrency, IRepository<ArOpeningBalance, Guid> repositoryOpeningBalance, IRepository<ArInvoice, Guid> repositoryInvoice, IRepository<ArPayment, Guid> repositoryPayment)
    {
        _repositoryCustomer= repositoryCustomer;
        _repositoryOpeningBalance = repositoryOpeningBalance;
        _repositoryCurrency = repositoryCurrency;
        _repositoryInvoice = repositoryInvoice;
        _repositoryPayment = repositoryPayment;
    }
    
    //get customers with balances greater than 0 and without balances
    public async Task<Dictionary<string, object>> GetCustomerDistribution()
    {
        var customers = await _repositoryCustomer.GetAllListAsync();
        
        Dictionary<string, object> keyValuePairs = new Dictionary<string, object>();
        
        int withBalance = customers.Count(a => a.Balance > 0);
        int withoutBalance = customers.Count(a => a.Balance == 0);
        int totalPopulation = customers.Count;

        string withBalanceLabel = $"{Math.Round(totalPopulation != 0 ? ((decimal)withBalance / totalPopulation) * 100 : 0, 2)}% With Outstanding Balances";
        string withoutBalanceLabel = $"{Math.Round(totalPopulation != 0 ? ((decimal)withoutBalance / totalPopulation) * 100 : 0, 2)}% With No Balances";

        keyValuePairs.Add("withBalanceInfo", new { label = withBalanceLabel, nos = withBalance });
        keyValuePairs.Add("withoutBalanceInfo", new { label = withoutBalanceLabel, nos = withoutBalance });
        
        return keyValuePairs;
    }
    
    //get customer opening balance
    public async Task<Dictionary<string, object>> GetCustomerOpeningBalance()
    {
        // Fetch opening balances from the repository
        var openingBalances = await _repositoryOpeningBalance.GetAllListAsync();

        // Create a dictionary to hold the data
        Dictionary<string, object> keyValuePairs = new Dictionary<string, object>();

        // Join the opening balances with the currency data
        var customerOpeningBalances = openingBalances.Select(a => new {
            a.CustomerName, 
            Amount = Math.Round(a.Amount, 2), 
            TransactionDate = a.TransactionDate.ToString("dd-MMM-yyyy"),
            a.CurrencyCode,
           
        }).ToList();

        // Add the opening balances with currency names to the dictionary
        keyValuePairs.Add("customerOpeningBalances", customerOpeningBalances);

        return keyValuePairs;
    }
    
    //get customer invoices
    public async Task<Dictionary<string, object>> GetCustomerInvoices()
    {
        // Fetch invoices from the repository
        var invoices = await _repositoryInvoice.GetAllListAsync(i => i.IsCanceled == false);

        // Create a dictionary to hold the data
        Dictionary<string, object> keyValuePairs = new Dictionary<string, object>();

        // Join the invoices with the currency data
        var customerInvoices = invoices.Select(a => new {
            a.CustomerName, 
            a.InvoiceNumber, 
            a.InvoiceDate,
            a.currencyCode,
            a.TotalInvoiceAmount,
            a.Balance,
            a.Id,
            a.IsPosted
        }).ToList();

        // Add the invoices with currency names to the dictionary
        keyValuePairs.Add("customerInvoices", customerInvoices);

        return keyValuePairs;
    }
    
    public async Task<Dictionary<string, object>> GetCustomerPayments()
    {
      
        var customers = await _repositoryCustomer.GetAllListAsync();
        var invoices = await _repositoryInvoice.GetAllListAsync(x => x.IsPosted == true && x.Balance != x.TotalInvoiceAmount && x.IsCanceled == false);
        
        // Get the current month and year
        var currentMonth = DateTime.Now.Month;
        var currentYear = DateTime.Now.Year;

        // Filter invoices for the current month
        var currentMonthInvoices = invoices
            .Where(invoice => invoice.InvoiceDate.Month == currentMonth && invoice.InvoiceDate.Year == currentYear)
            .ToList();
        
        var customerPayments = currentMonthInvoices
            .GroupBy(invoice => invoice.CustomerId) // <-- group by CustomerId
            .Select(group =>
            {
                var customer = customers.FirstOrDefault(s => s.Id == group.Key); 
                return new
                {
                    CustomerId = group.Key,
                    CustomerName = customer?.Name ?? "Unknown",
                    TotalPaid = group.Sum(invoice => invoice.PaidAmount),
                    InvoiceBalance = group.Sum(invoice => invoice.Balance),
                };
            })
            .ToList();


        // Prepare the result dictionary
        Dictionary<string, object> keyValuePairs = new Dictionary<string, object>
        {
            { "CustomerPayments", customerPayments },
        };

        return keyValuePairs;
    }
    
    public async Task<Dictionary<string, object>> GetCalculations()
    {
        //active customers
        var customer = await _repositoryCustomer.GetAllListAsync();
        var activeCustomers = customer.Count(a => a.Status == "Active" || a.Status == "active");
        //calculated all Invoices
        var invoices = await _repositoryInvoice.GetAllListAsync(i => i.IsCanceled == false);
        var totalInvoices = invoices.Count;
        //calculated number of posted invoices
        var postedInvoices = invoices.Count(a => a.IsPosted && a.IsCanceled == false);
        //calculate the number of posted payments
        var payments = await _repositoryPayment.GetAllListAsync();
        var postedPayments = payments.Count(a => a.IsPosted && a.IsCanceled == false);
        
        Dictionary<string, object> keyValuePairs = new Dictionary<string, object>
        {
            { "activeCustomers", activeCustomers },
            { "TotalInvoices", totalInvoices },
            { "PostedInvoices", postedInvoices },
            { "PostedPayments", postedPayments },
            
        };
        
        return keyValuePairs;
        
    }
    
    public async Task<Dictionary<string, object>> GetInvoiceAnalysis()
    {
        var invoices = await _repositoryInvoice.GetAllListAsync(i => i.IsCanceled == false);

        var invoiceAnalysis = new
        {
            TotalInvoiceAmount = invoices.Sum(inv => inv.TotalInvoiceAmount),
            TotalPaidAmount = invoices.Sum(inv => inv.PaidAmount),
            TotalBalance = invoices.Sum(inv => inv.Balance),

         
            UnpaidCount = invoices.Count(inv => inv.Status == 0),
            PartialCount = invoices.Count(inv => inv.Status == 1),
            FullyPaidCount = invoices.Count(inv => inv.Status == 2),

          
            ApprovedCount = invoices.Count(inv => inv.IsApproved),
            UnapprovedCount = invoices.Count(inv => !inv.IsApproved)
        };

       
        Dictionary<string, object> keyValuePairs = new Dictionary<string, object>
        {
            { "InvoiceAnalysis", new List<object> { invoiceAnalysis } }
        };

        return keyValuePairs;
    }
    
}