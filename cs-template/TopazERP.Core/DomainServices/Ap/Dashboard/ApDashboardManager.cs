using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Abp.Domain.Repositories;
using TopazERP.Models.Shared;
using TopazERP.Models.Ap;
namespace TopazERP.DomainServices.Ap.Dashboard;

public class ApDashboardManager: Abp.Domain.Services.DomainService, IApDashboardManager
{
    private readonly IRepository<Supplier, Guid> _repositorySupplier;
    //open balance
   private readonly IRepository<ApOpeningBalance, Guid> _repositoryOpeningBalance;
   
   //invoices
    private readonly IRepository<ApInvoice, Guid> _repositoryInvoice;
    //currency
    private readonly IRepository<Currency, Guid> _repositoryCurrency;
    //payments
    private readonly IRepository<ApPayment, Guid> _repositoryPayment;
    
    public ApDashboardManager(IRepository<Supplier, Guid> repositorySupplier, IRepository<Currency, Guid> repositoryCurrency, IRepository<ApOpeningBalance, Guid> repositoryOpeningBalance, IRepository<ApInvoice, Guid> repositoryInvoice, IRepository<ApPayment, Guid> repositoryPayment)
    {
        _repositorySupplier = repositorySupplier;
       _repositoryOpeningBalance = repositoryOpeningBalance;
        _repositoryCurrency = repositoryCurrency;
        _repositoryInvoice = repositoryInvoice;
        _repositoryPayment = repositoryPayment;
    }
    
    
    //get suppliers with isResident = true and isResident = false
    public async Task<Dictionary<string, object>> GetSupplierResidentDistribution()
    {
        var suppliers = await _repositorySupplier.GetAllListAsync();
        
        Dictionary<string, object> keyValuePairs = new Dictionary<string, object>();
        
        int resident = suppliers.Count(a => a.IsResident);
        int nonResident = suppliers.Count(a => !a.IsResident);
        int totalPopulation = suppliers.Count;

        string residentLabel = $"{Math.Round(totalPopulation != 0 ? ((decimal)resident / totalPopulation) * 100 : 0, 2)}% Resident";
        string nonResidentLabel = $"{Math.Round(totalPopulation != 0 ? ((decimal)nonResident / totalPopulation) * 100 : 0, 2)}% Non Resident";

        keyValuePairs.Add("residentInfo", new { label = residentLabel, nos = resident });
        keyValuePairs.Add("nonResidentInfo", new { label = nonResidentLabel, nos = nonResident });
        
        return keyValuePairs;
    }
    
    //get supplier opening balance
    public async Task<Dictionary<string, object>> GetSupplierOpeningBalance()
    {
        // Fetch opening balances from the repository
        var openingBalances = await _repositoryOpeningBalance.GetAllListAsync();

        // Create a dictionary to hold the data
        Dictionary<string, object> keyValuePairs = new Dictionary<string, object>();

        // Join the opening balances with the currency data
        var supplierOpeningBalances = openingBalances.Select(a => new {
            a.SupplierName, 
            Amount = Math.Round(a.Amount, 2), 
            TransactionDate = a.TransactionDate.ToString("dd-MMM-yyyy"),
            a.CurrencyCode,
           
        }).ToList();

        // Add the opening balances with currency names to the dictionary
        keyValuePairs.Add("supplierOpeningBalances", supplierOpeningBalances);

        return keyValuePairs;
    }
    
    //get supplier invoices
    public async Task<Dictionary<string, object>> GetSupplierInvoices()
    {
        // Fetch invoices from the repository
        var invoices = await _repositoryInvoice.GetAllListAsync(i => i.IsCanceled == false);

        // Create a dictionary to hold the data
        Dictionary<string, object> keyValuePairs = new Dictionary<string, object>();

        // Join the invoices with the currency data
        var supplierInvoices = invoices.Select(a => new {
            a.SupplierName, 
            a.InvoiceNumber, 
            a.InvoiceDate,
            a.CurrencyCode,
            a.TotalInvoiceAmount,
            a.Balance,
            a.Id,
            a.IsPosted
        }).ToList();

        // Add the invoices with currency names to the dictionary
        keyValuePairs.Add("supplierInvoices", supplierInvoices);

        return keyValuePairs;
    }
    
    //get supplier payments
    public async Task<Dictionary<string, object>> GetSupplierPayments()
    {
        // Fetch all suppliers and invoices from the repositories
        var suppliers = await _repositorySupplier.GetAllListAsync();
        var invoices = await _repositoryInvoice.GetAllListAsync(x => x.IsPosted == true && x.Balance != x.TotalInvoiceAmount && x.IsCanceled == false);



        // Get the current month and year
        var currentMonth = DateTime.Now.Month;
        var currentYear = DateTime.Now.Year;

        // Filter invoices for the current month
        var currentMonthInvoices = invoices
            .Where(invoice => invoice.InvoiceDate.Month == currentMonth && invoice.InvoiceDate.Year == currentYear)
            .ToList();

        // Join invoices with suppliers and calculate grouped results
        var supplierPayments = currentMonthInvoices
            .GroupBy(invoice => invoice.SupplierId)
            .Select(group =>
            {
                var supplier = suppliers.FirstOrDefault(s => s.Id == group.Key); // Match supplier by ID
                return new
                {
                    SupplierId = group.Key,
                    SupplierName = supplier?.Name ?? "Unknown",
                    TotalPaid = group.Sum(invoice => invoice.PaidAmount),
                    InvoiceBalance = group.Sum(invoice => invoice.Balance),
                };
            })
            .ToList();

        // Prepare the result dictionary
        Dictionary<string, object> keyValuePairs = new Dictionary<string, object>
        {
            { "SupplierPayments", supplierPayments },
        };

        return keyValuePairs;
    }

    
    public async Task<Dictionary<string, object>> GetCalculations()
    {
        //calculate total number of suppliers with balance > 0
        var suppliers = await _repositorySupplier.GetAllListAsync();
        var suppliersWithBalance = suppliers.Count(a => a.StatusName == "Active" || a.StatusName == "active");
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
            { "SuppliersWithBalance", suppliersWithBalance },
            { "TotalInvoices", totalInvoices },
            { "PostedInvoices", postedInvoices },
            { "PostedPayments", postedPayments },
        };
        
        return keyValuePairs;
        
    }
    
    // invoice Analysis
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