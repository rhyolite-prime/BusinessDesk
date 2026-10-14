
using Abp.Domain.Repositories;
using Microsoft.EntityFrameworkCore;
using TopazERP.Models.Ar;
using TopazERP.Models.Shared;
using System;
using System.Collections.Generic;
using System.Dynamic;
using System.Linq;
using System.Threading.Tasks;
using Akka.Actor;
using TopazERP.Actors;
using TopazERP.Actors.MessageModels;
using TopazERP.DomainServices.Ar.Reports.Dto;
using TopazERP.Models.Ledger;
using TopazERP.Notifications.Dto;

namespace TopazERP.DomainServices.Ar.Reports;

public class ArReportManager : Abp.Domain.Services.DomainService, IArReportManager
{
    private readonly IRepository<Customer, Guid> _repositoryCustomer;
    private readonly IRepository<CompanyProfile, Guid> _repositoryCompanyProfile;
    private readonly IRepository<ArInvoice, Guid> _repositoryArInvoice;
    private readonly IRepository<ArOpeningBalance, Guid> _repositoryOpeningBalances;
    private readonly IRepository<ArPayment, Guid> _repositoryPayment;
    private readonly IRepository<ArWithholdingPayment, Guid> _repositoryWithHoldingPayment;
    private readonly IRepository<Quotation, Guid> _repositoryQuotation;
    private readonly IRepository<ArCreditMemo, Guid> _repositoryArCreditMemo;
    private readonly IRepository<Currency, Guid> _repositoryCurrency;
    private readonly IRepository<ArInvoicePaymentRecords, Guid> _repositoryArInvoicePaymentRecords;
    private readonly IRepository<Journal, Guid> _repositoryJournal;
    private readonly IRepository<JournalDetail, Guid> _repositoryJournalDetail;

    public ArReportManager(
        IRepository<Customer, Guid> repositoryCustomer,
        IRepository<CompanyProfile, Guid> repositoryCompanyProfile,
        IRepository<ArInvoice, Guid> repositoryArInvoice,
        IRepository<ArOpeningBalance, Guid> repositoryOpeningBalances,
        IRepository<ArPayment, Guid> repositoryPayment,
        IRepository<ArWithholdingPayment, Guid> repositoryWithHoldingPayment,
        IRepository<Quotation, Guid> repositoryQuotation,
        IRepository<ArCreditMemo, Guid> repositoryArCreditMemo,
        IRepository<Currency, Guid> repositoryCurrency,
        IRepository<ArInvoicePaymentRecords, Guid> repositoryArInvoicePaymentRecords, IRepository<Journal, Guid> repositoryJournal, IRepository<JournalDetail, Guid> repositoryJournalDetail)
    {
        _repositoryCustomer = repositoryCustomer;
        _repositoryCompanyProfile = repositoryCompanyProfile;
        _repositoryArInvoice = repositoryArInvoice;
        _repositoryOpeningBalances = repositoryOpeningBalances;
        _repositoryPayment = repositoryPayment;
        _repositoryWithHoldingPayment = repositoryWithHoldingPayment;
        _repositoryQuotation = repositoryQuotation;
        _repositoryArCreditMemo = repositoryArCreditMemo;
        _repositoryCurrency = repositoryCurrency;
        _repositoryArInvoicePaymentRecords = repositoryArInvoicePaymentRecords;
        _repositoryJournal = repositoryJournal;
        _repositoryJournalDetail = repositoryJournalDetail;
    }
    
    public async Task<object> GetReportHeader(string title)
    {
        var data = await _repositoryCompanyProfile.GetAllListAsync();
        return data.Select(a => new
        {
            a.CompanyName,
            PrimaryPhoneNo = $"Tel: {a.PhoneNo}",
            a.Address,
            Email = $"Email: {a.Email}",
            ReportTitle = title,
            CompanyLogo = a.CompanyLogo,
        }).ToList();
    }
    
    public async Task<object> GetCustomers()
    {
        var data = await _repositoryCustomer.GetAllListAsync();
        return data
            .OrderBy(c => c.Name)
            .Select(c => new
            {
                c.Name,
                c.AccountNumber,
                c.Address,
                c.PhoneNo,
                c.CreditLimit
            })
            .ToList();
    }

    public async Task<object> GetCustomersByGroup(Guid customerGroupId)
    {
        var data = await _repositoryCustomer.GetAllListAsync(c => c.CustomerGroupId == customerGroupId);
        return data
            .OrderBy(c => c.Name)
            .Select(c => new
            {
                c.Name,
                c.AccountNumber,
                c.Address,
                c.PhoneNo,
                c.CreditLimit
            })
            .ToList();
    }
  
    public async Task<object> GetStatement(Guid customerId)
    {
        var customer = await _repositoryCustomer.FirstOrDefaultAsync(s => s.Id == customerId);

        var openingBalances = await _repositoryOpeningBalances.GetAllListAsync(
            ob => ob.CustomerId == customerId
        );

        var invoices = await _repositoryArInvoice.GetAllListAsync(
            s => s.CustomerId == customerId && s.IsCanceled == false
        );

        var creditMemos = await _repositoryArCreditMemo.GetAllListAsync(
            d => d.CustomerId == customerId
        );

        var payments = await _repositoryArInvoicePaymentRecords.GetAllListAsync(
            p => p.CustomerName == customer.Name && p.IsPosted == true
        );
        
        var allCurrencies = openingBalances.Select(o => o.CurrencyName)
            .Union(invoices.Select(i => i.CurrencyName))
            .Union(creditMemos.Select(c => c.CurrencyName))
            .Distinct()
            .ToList();
        
        var currencyInfo = await _repositoryCurrency.GetAllListAsync(c => allCurrencies.Contains(c.CurrencyName));
        var currencyRates = currencyInfo.ToDictionary(c => c.CurrencyName, c => c.BuyRate);

        var statementRecords = new List<ArStatementRecord>();
        
        foreach (var ob in openingBalances)
        {
            statementRecords.Add(new ArStatementRecord
            {
                Type = "OpeningBalance",
                CustomerName = customer.Name,
                AccountNumber = customer.AccountNumber,
                ContactPhone = customer.ContactPersonPhone,
                InvoiceNumber = "Opening Balance",
                InvoiceNo = "Opening Balance",
                InvoiceDate = ob.TransactionDate.ToString("dd-MMM-yyyy"),
                TransactionDate = ob.TransactionDate,
                TotalInvoiceAmount = ob.Amount,
                PaidAmount = null,
                Balance = ob.Amount,
                Outstanding = ob.Amount,
                CurrencyName = ob.CurrencyName,
                BuyRate = currencyRates.TryGetValue(ob.CurrencyName, out var rate) ? rate : 1m,
                Description = "Opening balance"
            });
        }
        foreach (var inv in invoices)
        {
            var invoiceOutstanding = inv.TotalInvoiceAmount - inv.PaidAmount;
            statementRecords.Add(new ArStatementRecord
            {
                Type = "Invoice",
                CustomerName = customer.Name,
                AccountNumber = customer.AccountNumber,
                ContactPhone = customer.ContactPersonPhone,
                InvoiceNumber = inv.InvoiceNumber,
                InvoiceDate = inv.InvoiceDate.ToString("dd-MMM-yyyy"),
                TransactionDate = inv.InvoiceDate,
                TotalInvoiceAmount = inv.TotalInvoiceAmount,
                PaidAmount = null,
                Balance = inv.Balance,
                Outstanding = inv.Balance,
                CurrencyName = inv.CurrencyName,
                //BuyRate = currencyRates.ContainsKey(inv.CurrencyName) ? currencyRates[inv.CurrencyName] : 1m,
                Description = "Invoice"
            });

            var invoicePayments = payments.Where(p => p.InvoiceId == inv.Id).ToList();
            foreach (var pay in invoicePayments)
            {
                var suffix = pay.ModeOfPayment?.Equals("Cash", StringComparison.OrdinalIgnoreCase) == true
                    ? "/Cash"
                    : $"/{pay.ChequeNo}";
                statementRecords.Add(new ArStatementRecord
                {
                    Type = "Payment",
                    CustomerName = customer.Name,
                    AccountNumber = customer.AccountNumber,
                    ContactPhone = customer.ContactPersonPhone,
                    InvoiceNumber = $"{inv.InvoiceNumber}{suffix}",
                    InvoiceDate = inv.InvoiceDate.ToString("dd-MMM-yyyy"),
                    TransactionDate =inv.InvoiceDate,
                    PaidAmount = pay.ConvertedAmount,
                    PaymentDate = pay.PaymentDate.ToString("dd-MMM-yyyy"),
                    CurrencyName = inv.CurrencyName,
                    BuyRate = 1m,
                    Description = $"Payment ({pay.ModeOfPayment})",
                    Outstanding = 0m
                });
            }
        }
        foreach (var cm in creditMemos)
        {
            if (!cm.IsInvoiceDebit) // Unapplied CM
            {
                statementRecords.Add(new ArStatementRecord
                {
                    Type = "CreditMemo",
                    CustomerName = customer.Name,
                    AccountNumber = customer.AccountNumber,
                    ContactPhone = customer.ContactPersonPhone,
                    InvoiceNumber = $"Advanced Payment/{cm.InvoiceNo}",
                    InvoiceDate = cm.TransactionDate.ToString("dd-MMM-yyyy"),
                    TransactionDate = cm.TransactionDate,
                    TotalInvoiceAmount = -cm.Amount,
                    Balance = cm.Amount,
                    Outstanding = -cm.Amount,
                    CurrencyName = cm.CurrencyName,
                   // BuyRate = currencyRates.ContainsKey(cm.CurrencyName) ? currencyRates[cm.CurrencyName] : 1m,
                    Description = cm.Description
                });
            }
           
        }
        var totalsByCurrency = statementRecords
            .GroupBy(r => r.CurrencyName)
            .Select(g => new
            {
                currency = g.Key,
                outstanding = g.Sum(r => r.Balance ?? 0m)
            })
            .ToList();

        return new
        {
            data = statementRecords.OrderBy(r => r.TransactionDate).ToList(),
            outstanding = totalsByCurrency
        };
    }
    public async Task<object> GetStatementType2(Guid customerId, DateTime startDate, DateTime endDate)
    {
        var customer = await _repositoryCustomer.FirstOrDefaultAsync(s => s.Id == customerId);
        var openingBalances = await _repositoryOpeningBalances.GetAllListAsync(
            ob => ob.CustomerId == customerId
        );
        var payments = await _repositoryArInvoicePaymentRecords.GetAllListAsync(
            u => u.IsPosted == true
        );
        var invoices = await _repositoryArInvoice.GetAllListAsync(
            s => s.CustomerId == customerId && s.IsCanceled == false
        );
        var creditMemos = await _repositoryArCreditMemo.GetAllListAsync(
            d => d.CustomerId == customerId && d.IsInvoiceDebit == false
        );
        var allCurrencies = openingBalances.Select(o => o.CurrencyName)
            .Union(invoices.Select(i => i.CurrencyName))
            .Union(creditMemos.Select(c => c.CurrencyName))
            .Distinct()
            .ToList();
        var currencyInfo = await _repositoryCurrency.GetAllListAsync(c => allCurrencies.Contains(c.CurrencyName));
        var currencyRates = currencyInfo.ToDictionary(c => c.CurrencyName, c => c.BuyRate);

        var allStatementRecords = new List<ArStatementRecord>();
        
        foreach (var ob in openingBalances)
        {
            allStatementRecords.Add(new ArStatementRecord
            {
                Type = "OpeningBalance",
                CustomerName = customer.Name,
                AccountNumber = customer.AccountNumber,
                ContactPhone = customer.ContactPersonPhone,
                InvoiceNumber = "Opening Balance",
                InvoiceNo = "Opening Balance",
                InvoiceDate = ob.TransactionDate.ToString("dd-MMM-yyyy"),
                TransactionDate = ob.TransactionDate,
                TotalInvoiceAmount = ob.Amount,
                PaidAmount = 0m,
                CurrencyName = ob.CurrencyName,
                BuyRate = currencyRates.ContainsKey(ob.CurrencyName) ? currencyRates[ob.CurrencyName] : 1m,
                Description = "Opening balance"
            });
        }
        foreach (var inv in invoices)
        {
            allStatementRecords.Add(new ArStatementRecord
            {
                Type = "Invoice",
                CustomerName = customer.Name,
                AccountNumber = customer.AccountNumber,
                ContactPhone = customer.ContactPersonPhone,
                InvoiceNumber = inv.InvoiceNumber,
                InvoiceNo = inv.InvoiceNumber,
                InvoiceDate = inv.InvoiceDate.ToString("dd-MMM-yyyy"),
                TransactionDate = inv.InvoiceDate,
                TotalInvoiceAmount = inv.TotalInvoiceAmount,
                PaidAmount = 0m,
                CurrencyName = inv.CurrencyName,
                BuyRate = currencyRates.TryGetValue(inv.CurrencyName, out var rate) ? rate : 1m,
                Description = "Invoice"
            });
            var invoicePayments = payments
                .Where(p => p.InvoiceId == inv.Id)
                .OrderBy(p => p.PaymentDate)
                .ToList();
            foreach (var pay in invoicePayments)
            {
                var suffix = pay.ModeOfPayment?.Equals("Cash", StringComparison.OrdinalIgnoreCase) == true
                ? "/Cash"
                : $"/{pay.ChequeNo}";
                allStatementRecords.Add(new ArStatementRecord
                {
                    Type = "Payment",
                    CustomerName = customer.Name,
                    AccountNumber = customer.AccountNumber,
                    ContactPhone = customer.ContactPersonPhone,
                    InvoiceNumber = $"{inv.InvoiceNumber}{suffix}",
                    InvoiceNo = inv.InvoiceNumber,
                    InvoiceDate = pay.PaymentDate.ToString("dd-MMM-yyyy"),
                    TransactionDate = pay.PaymentDate,
                    TotalInvoiceAmount = 0m,
                    PaidAmount = pay.ConvertedAmount,
                    CurrencyName = inv.CurrencyName,
                    BuyRate = 1m,
                    PaymentDate = pay.PaymentDate.ToString("dd-MMM-yyyy"),
                    Description = $"Payment ({pay.ModeOfPayment})"
                });
            }
        }
        foreach (var cm in creditMemos)
        {
            var suffix = cm.ModeOfPayment?.Equals("Cash", StringComparison.OrdinalIgnoreCase) == true
            ? "/Cash"
            : $"/{cm.ChequeNo}";
            allStatementRecords.Add(new ArStatementRecord
            {
                Type = "CreditMemo",
                CustomerName = customer.Name,
                AccountNumber = customer.AccountNumber,
                ContactPhone = customer.ContactPersonPhone,
                InvoiceNumber = $"CM/{cm.InvoiceNo}{suffix}",
                InvoiceNo = cm.InvoiceNo,
                InvoiceDate = cm.TransactionDate.ToString("dd-MMM-yyyy"),
                TransactionDate = cm.TransactionDate,
                TotalInvoiceAmount = cm.IsInvoiceDebit ? cm.Amount : -cm.Amount,
                PaidAmount = cm.IsInvoiceDebit ? cm.Amount : 0m,
                CurrencyName = cm.CurrencyName,
                BuyRate = currencyRates.ContainsKey(cm.CurrencyName) ? currencyRates[cm.CurrencyName] : 1m,
                PaymentDate = cm.TransactionDate.ToString("dd-MMM-yyyy"),
                Description = cm.Description
            });
        }
        var orderedRecords = allStatementRecords
            .OrderBy(r => r.TransactionDate)
            .ThenBy(r => GetSortPriority(r.Type))
            .ThenBy(r => ExtractInvoiceOrder(r.InvoiceNo)) 
            .ThenBy(r => r.InvoiceNo) 
            .ToList();
        
        var runningBalances = allCurrencies.ToDictionary(c => c, c => 0m);
        foreach (var rec in orderedRecords)
        {
            var currency = rec.CurrencyName ?? "UNKNOWN";
            if (!runningBalances.ContainsKey(currency))
                runningBalances[currency] = 0m;

            if (rec.Type == "Invoice" || rec.Type == "OpeningBalance")
            {
                runningBalances[currency] += rec.TotalInvoiceAmount ?? 0m;
            }
            else if (rec.Type == "CreditMemo")
            {
                if (rec.PaidAmount == 0m)
                    runningBalances[currency] += rec.TotalInvoiceAmount ?? 0m;
                else
                    runningBalances[currency] -= rec.PaidAmount ?? 0m;
            }
            else if (rec.Type == "Payment")
            {
                runningBalances[currency] -= rec.PaidAmount ?? 0m;
            }
            rec.Balance = runningBalances[currency];
            rec.Outstanding = runningBalances[currency];
        }
        var beforeStart = orderedRecords
            .Where(r => r.TransactionDate < startDate)
            .GroupBy(r => r.CurrencyName ?? "UNKNOWN")
            .ToDictionary(g => g.Key, g => g.LastOrDefault());

        var bbfRecords = new List<ArStatementRecord>();
        foreach (var currency in allCurrencies)
        {
            beforeStart.TryGetValue(currency, out var lastRecord);
            var bbfDate = lastRecord?.TransactionDate ?? startDate.AddDays(-1);
            var bbfBalance = lastRecord?.Balance ?? 0m;
            bbfRecords.Add(new ArStatementRecord
            {
                Type = "BBF",
                CustomerName = customer.Name,
                AccountNumber = customer.AccountNumber,
                ContactPhone = customer.ContactPersonPhone,
                InvoiceNumber = "Balance B/F",
                InvoiceNo = "Balance B/F",
                InvoiceDate ="",
                TransactionDate = bbfDate,
                Balance = bbfBalance,
                Outstanding = bbfBalance,
                CurrencyName = currency,
                BuyRate = currencyRates.ContainsKey(currency) ? currencyRates[currency] : 1m,
                Description = "Balance brought forward"
            });
        }
        var inRange = orderedRecords
            .Where(r => r.TransactionDate >= startDate && r.TransactionDate <= endDate)
            .ToList();
        // Final records (keep BBF first, then sorted in-range)
        var statementRecords = bbfRecords.Concat(inRange).ToList();

        // Convert outstanding to GHS
        decimal overallOutstanding = statementRecords.Sum(r =>
        {
            var rate = r.BuyRate ?? 1m;
            return (r.Outstanding ?? 0m) * rate;
        });

        return new
        {
            data = statementRecords,
            outstanding = new List<object>
            {
                new { currency = "GHS", outstanding = overallOutstanding }
            }
        };
    }
    int GetSortPriority(string type)
    {
        return type switch
        {
            "BBF"            => 0,
            "OpeningBalance" => 0,
            "Invoice"        => 1,
            "Payment"        => 2,
            "CreditMemo"     => 3, 
            _                => 4
        };
    }
    int ExtractInvoiceOrder(string invoiceNo)
    {
        if (string.IsNullOrWhiteSpace(invoiceNo))
         return int.MaxValue;
        // Get all digits in order
        var digits = new string(invoiceNo.Where(char.IsDigit).ToArray());
        // If invoiceNo = "IN/2024XX" → digits = "2024"
        // If invoiceNo = "IN/2025XX" → digits = "2025"
        if (int.TryParse(digits, out var num))
            return num;
        return int.MaxValue;
    }
    public async Task<object> GetStatementType3(Guid customerId, DateTime startDate, DateTime endDate)
    {
        var customer = await _repositoryCustomer.FirstOrDefaultAsync(s => s.Id == customerId);
        var openingBalances = await _repositoryOpeningBalances.GetAllListAsync(
            ob => ob.CustomerId == customerId
        );
        var payments = await _repositoryArInvoicePaymentRecords.GetAllListAsync(
            u => u.IsPosted == true
        );
        var invoices = await _repositoryArInvoice.GetAllListAsync(
            s => s.CustomerId == customerId && s.IsCanceled == false
        );
        var creditMemos = await _repositoryArCreditMemo.GetAllListAsync(
            d => d.CustomerId == customerId && d.IsInvoiceDebit == false
        );
        var allCurrencies = openingBalances.Select(o => o.CurrencyName)
            .Union(invoices.Select(i => i.CurrencyName))
            .Union(creditMemos.Select(c => c.CurrencyName))
            .Distinct()
            .ToList();
        var currencyInfo = await _repositoryCurrency.GetAllListAsync(c => allCurrencies.Contains(c.CurrencyName));
        var currencyRates = currencyInfo.ToDictionary(c => c.CurrencyName, c => c.BuyRate);

        var allStatementRecords = new List<ArStatementRecord>();
        
        foreach (var ob in openingBalances)
        {
            allStatementRecords.Add(new ArStatementRecord
            {
                Type = "OpeningBalance",
                CustomerName = customer.Name,
                AccountNumber = customer.AccountNumber,
                ContactPhone = customer.ContactPersonPhone,
                InvoiceNumber = "Opening Balance",
                InvoiceNo = "Opening Balance",
                InvoiceDate = ob.TransactionDate.ToString("dd-MMM-yyyy"),
                TransactionDate = ob.TransactionDate,
                TotalInvoiceAmount = ob.Amount,
                PaidAmount = 0m,
                CurrencyName = ob.CurrencyName,
                BuyRate = currencyRates.ContainsKey(ob.CurrencyName) ? currencyRates[ob.CurrencyName] : 1m,
                Description = "Opening balance"
            });
        }
        foreach (var inv in invoices)
        {
            // expand details instead of header
            if (inv.Details != null && inv.Details.Any())
            {
                foreach (var detail in inv.Details)
                {
                    allStatementRecords.Add(new ArStatementRecord
                    {
                        Type = "Invoice",
                        CustomerName = customer.Name,
                        AccountNumber = customer.AccountNumber,
                        ContactPhone = customer.ContactPersonPhone,
                        InvoiceNumber = inv.InvoiceNumber,
                        InvoiceNo = inv.InvoiceNumber,
                        InvoiceDate = inv.InvoiceDate.ToString("dd-MMM-yyyy"),
                        TransactionDate = inv.InvoiceDate,
                        TotalInvoiceAmount = detail.SubTotal, 
                        PaidAmount = 0m,
                        CurrencyName = inv.CurrencyName,
                        BuyRate = currencyRates.ContainsKey(inv.CurrencyName) ? currencyRates[inv.CurrencyName] : 1m,
                        Description = detail.Description 
                    });
                }
            }

            // payments still tie to the invoice as a whole
            var invoicePayments = payments
                .Where(p => p.InvoiceId == inv.Id)
                .OrderBy(p => p.PaymentDate)
                .ToList();

            foreach (var pay in invoicePayments)
            {
                var suffix = pay.ModeOfPayment?.Equals("Cash", StringComparison.OrdinalIgnoreCase) == true
                    ? "/Cash"
                    : $"/{pay.ChequeNo}";

                allStatementRecords.Add(new ArStatementRecord
                {
                    Type = "Payment",
                    CustomerName = customer.Name,
                    AccountNumber = customer.AccountNumber,
                    ContactPhone = customer.ContactPersonPhone,
                    InvoiceNumber = $"{inv.InvoiceNumber}{suffix}",
                    InvoiceNo = inv.InvoiceNumber,
                    InvoiceDate = pay.PaymentDate.ToString("dd-MMM-yyyy"),
                    TransactionDate = pay.PaymentDate,
                    TotalInvoiceAmount = 0m,
                    PaidAmount = pay.ConvertedAmount,
                    CurrencyName = inv.CurrencyName,
                    BuyRate = 1m,
                    PaymentDate = pay.PaymentDate.ToString("dd-MMM-yyyy"),
                    Description = $"Payment--{pay.ModeOfPayment}"
                });
            }
        }

        foreach (var cm in creditMemos)
        {
            var suffix = cm.ModeOfPayment?.Equals("Cash", StringComparison.OrdinalIgnoreCase) == true
            ? "/Cash"
            : $"/{cm.ChequeNo}";
            allStatementRecords.Add(new ArStatementRecord
            {
                Type = "CreditMemo",
                CustomerName = customer.Name,
                AccountNumber = customer.AccountNumber,
                ContactPhone = customer.ContactPersonPhone,
                InvoiceNumber = $"CM/{cm.InvoiceNo}{suffix}",
                InvoiceNo = cm.InvoiceNo,
                InvoiceDate = cm.TransactionDate.ToString("dd-MMM-yyyy"),
                TransactionDate = cm.TransactionDate,
                TotalInvoiceAmount = cm.IsInvoiceDebit ? cm.Amount : -cm.Amount,
                PaidAmount = cm.IsInvoiceDebit ? cm.Amount : 0m,
                CurrencyName = cm.CurrencyName,
                BuyRate = currencyRates.ContainsKey(cm.CurrencyName) ? currencyRates[cm.CurrencyName] : 1m,
                PaymentDate = cm.TransactionDate.ToString("dd-MMM-yyyy"),
                Description = cm.Description
            });
        }
        var orderedRecords = allStatementRecords
            .OrderBy(r => r.TransactionDate)
            .ThenBy(r => GetSortPriority(r.Type))
            .ThenBy(r => ExtractInvoiceOrder(r.InvoiceNo)) 
            .ThenBy(r => r.InvoiceNo) 
            .ToList();
        
        var runningBalances = allCurrencies.ToDictionary(c => c, c => 0m);
        foreach (var rec in orderedRecords)
        {
            var currency = rec.CurrencyName ?? "UNKNOWN";
            runningBalances.TryAdd(currency, 0m);

            switch (rec.Type)
            {
                case "Invoice" or "OpeningBalance":
                case "CreditMemo" when rec.PaidAmount == 0m:
                    runningBalances[currency] += rec.TotalInvoiceAmount ?? 0m;
                    break;
                case "CreditMemo":
                case "Payment":
                    runningBalances[currency] -= rec.PaidAmount ?? 0m;
                    break;
            }
            rec.Balance = runningBalances[currency];
            rec.Outstanding = runningBalances[currency];
        }
        var beforeStart = orderedRecords
            .Where(r => r.TransactionDate < startDate)
            .GroupBy(r => r.CurrencyName ?? "UNKNOWN")
            .ToDictionary(g => g.Key, g => g.LastOrDefault());

        var bbfRecords = new List<ArStatementRecord>();
        foreach (var currency in allCurrencies)
        {
            beforeStart.TryGetValue(currency, out var lastRecord);
            var bbfDate = lastRecord?.TransactionDate ?? startDate.AddDays(-1);
            var bbfBalance = lastRecord?.Balance ?? 0m;
            bbfRecords.Add(new ArStatementRecord
            {
                Type = "BBF",
                CustomerName = customer.Name,
                AccountNumber = customer.AccountNumber,
                ContactPhone = customer.ContactPersonPhone,
                InvoiceNumber = "Balance B/F",
                InvoiceNo = "Balance B/F",
                InvoiceDate ="",
                TransactionDate = bbfDate,
                Balance = bbfBalance,
                Outstanding = bbfBalance,
                CurrencyName = currency,
                BuyRate = currencyRates.ContainsKey(currency) ? currencyRates[currency] : 1m,
                Description = ""
            });
        }
        var inRange = orderedRecords
            .Where(r => r.TransactionDate >= startDate && r.TransactionDate <= endDate)
            .ToList();
        // Final records (keep BBF first, then sorted in-range)
        var statementRecords = bbfRecords.Concat(inRange).ToList();

        // Convert outstanding to GHS
        decimal overallOutstanding = statementRecords.Sum(r =>
        {
            var rate = r.BuyRate ?? 1m;
            return (r.Outstanding ?? 0m) * rate;
        });

        return new
        {
            data = statementRecords,
            outstanding = new List<object>
            {
                new { currency = "GHS", outstanding = overallOutstanding }
            }
        };
    }
    public async Task<object> GetInvoice(Guid customerId)
    {
        var data = await _repositoryArInvoice.GetAllListAsync(s => s.CustomerId == customerId && s.IsCanceled == false);
        return data.Select(c => new
        {
            c.CustomerName,
            c.AccountName,
            c.InvoiceNumber,
            InvoiceDate = c.InvoiceDate.ToString("dd-MMM-yyyy"),
            c.Balance,
            c.TotalInvoiceAmount,
            c.PaidAmount,
            c.CurrencyName,
        }).ToList();
    }
    
    public async Task<object> GetInvoiceByBatch(string batchNumber)
    {
        var data = await _repositoryArInvoice.GetAllListAsync(s => s.BatchNumber == batchNumber && s.IsCanceled == false);
        return data.Select(c => new
        {
            c.CustomerName,
            c.AccountName,
            c.InvoiceNumber,
            InvoiceDate = c.InvoiceDate.ToString("dd-MMM-yyyy"),
            c.Balance,
            c.TotalInvoiceAmount,
            c.PaidAmount,
            c.CurrencyName,
        }).ToList();
    }
    
    public async Task<object> GetInvoiceByInvoiceNumber(string invoiceNumber)
    {
        var data = await _repositoryArInvoice.GetAllListAsync(s => s.InvoiceNumber == invoiceNumber && s.IsCanceled == false);
        return data.Select(c => new
        {
            c.CustomerName,
            c.AccountName,
            c.InvoiceNumber,
            InvoiceDate = c.InvoiceDate.ToString("dd-MMM-yyyy"),
            c.Balance,
            c.TotalInvoiceAmount,
            c.PaidAmount,
            c.CurrencyName,
        }).ToList();
    }
    
    public async Task<object> GetInvoiceByDate(DateTime startDate, DateTime endDate)
    {
        var data = await _repositoryArInvoice.GetAllListAsync(s => s.InvoiceDate >= startDate && s.InvoiceDate <= endDate && s.IsCanceled == false);
        return data.Select(c => new
        {
            c.CustomerName,
            c.AccountName,
            c.InvoiceNumber,
            InvoiceDate = c.InvoiceDate.ToString("dd-MMM-yyyy"),
            c.Balance,
            c.TotalInvoiceAmount,
            c.PaidAmount,
            c.CurrencyName,
        }).ToList();
    }
    
    public async Task<object> GetInvoiceByRange(int startNumber, int endNumber)
    {
        if (startNumber < 0 || endNumber < startNumber)
        {
            throw new ArgumentException("Invalid range. The start number must be less than or equal to the end number.");
        }

       
        var supplierInvoices = await _repositoryArInvoice.GetAllListAsync(i => i.IsCanceled == false);

       
        var selectedInvoices = supplierInvoices
            .Skip(startNumber - 1)
            .Take(endNumber - startNumber + 1) 
            .Select(u1 => new
            {
                u1.CustomerName,
                u1.InvoiceNumber,
                InvoiceDate = u1.InvoiceDate.ToString("dd-MMM-yyyy"),
                u1.PurchaseOrderNumber,
                u1.TotalInvoiceAmount,
                u1.CurrencyName,
            })
            .ToList();

        return selectedInvoices;
    }

    public async Task<object> GetAllInvoices()
    {
        var result = await _repositoryArInvoice.GetAllListAsync(i => i.IsCanceled == false);
        return result.Select(s => new
        {
            s.CustomerName,
            s.InvoiceNumber,
            InvoiceDate = s.InvoiceDate.ToString("dd-MMM-yyyy"),
            s.Balance,
            s.PurchaseOrderNumber,
            s.TotalInvoiceAmount,
            s.PaidAmount,
            s.CurrencyName,
        }).ToList();
    }
    public async Task<object> GetCanceledInvoices()
    {
        var result = await _repositoryArInvoice.GetAllListAsync(i => i.IsCanceled == true);
        return result.Select(s => new
        {
            s.CustomerName,
            s.InvoiceNumber,
            InvoiceDate = s.InvoiceDate.ToString("dd-MMM-yyyy"),
            s.Balance,
            s.PurchaseOrderNumber,
            s.TotalInvoiceAmount,
            s.PaidAmount,
            s.CurrencyName,
        }).ToList();
    }
    public async Task<object> GetInvoiceReport(Guid id)
    {
        var invoice = await _repositoryArInvoice.FirstOrDefaultAsync(i => i.Id == id && i.IsCanceled == false);
        if (invoice == null)
        {
            return new { message = "Invoice not found." };
        }

        var supplier = await _repositoryCustomer.FirstOrDefaultAsync(s => s.Id == invoice.CustomerId);
        if (supplier == null)
        {
            return new { message = "Customer not found." };
        }

        var flattenedData = invoice.Details.Select(d => new
            {
                SupplierName = supplier.Name,
                SupplierAccountNumber = supplier.AccountNumber,
                SupplierAddress = supplier.Address,
                SupplierPhoneNo = supplier.PhoneNo,
                SupplierVatNumber = supplier.VatNumber,
                SupplierCreditLimit = supplier.CreditLimit,
                InvoiceNumber = invoice.InvoiceNumber,
                InvoiceDate = invoice.InvoiceDate.ToString("dd-MMM-yyyy"),
                ProjectedPayDate = invoice.ProjectedPayDate.ToString("dd-MMM-yyyy"),
                invoice.Balance,
                invoice.TotalInvoiceAmount,
                invoice.PaidAmount,
                invoice.CurrencyName,
                invoice.vatAmount,
                invoice.vatRate,
                invoice.PurchaseOrderNumber,
                AmountInWords =
                    ConvertAmountToWords(invoice.TotalInvoiceAmount, invoice.CurrencyName, invoice.MinorName),
                Description = d.Description,
                Amount = d.Amount,
                ReferenceNumber = d.ReferenceNo,
                Quantity = d.Quantity,
                SubTotal = d.SubTotal

            })
            .ToList();

        return new
        {
            data = flattenedData
        };
    }
    
    public async Task<dynamic> GetInvoiceDetails(Guid id)
    {
        var invoice = await _repositoryArInvoice.FirstOrDefaultAsync(i => i.Id == id && i.IsCanceled == false);
        if (invoice == null) return new { message = "Invoice not found." };
        var customer = await _repositoryCustomer.FirstOrDefaultAsync(s => s.Id == invoice.CustomerId);
        if (customer == null) return new { message = "Customer not found." };
        bool allAmountsAreZero = (invoice.Details ?? new List<ArInvoiceDetail>())
            .All(d => d.Amount == 0);
        var invoiceDetails = (invoice.Details ?? new List<ArInvoiceDetail>())
            .Select((d, index) => new ArInvoiceDetailDto
            {
                Index = index + 1,
                Description = d.Description,
                UnitPrice = d.UnitPrice,
                ReferenceNumber = d.ReferenceNo,
                Quantity = d.Quantity,
                Amount = allAmountsAreZero ? " " : d.Amount.ToString("0.00"),
                SubTotal = d.SubTotal,
                AmountBeforeDiscount = d.UnitPrice * d.Quantity
            })
            .ToList();
        var companyProfile = await _repositoryCompanyProfile.GetAll().FirstOrDefaultAsync();
        var reportHeader = new ReportHeader
        {
            CompanyName = companyProfile.CompanyName,
            PrimaryPhoneNo = $"Tel: {companyProfile.PhoneNo}",
            Address = companyProfile.Address,
            Email = $"Email: {companyProfile.Email}",
            ReportTitle = $"INVOICE",
            CompanyLogo = companyProfile.CompanyLogo != null 
            ? $"data:image/png;base64,{Convert.ToBase64String(companyProfile.CompanyLogo)}" 
            : null
        };
   
        var supplierInfo = new CustomerInfo
        {
            CustomerName = customer.Name,
            AccountNumber = customer.AccountNumber,
            CustomerAddress = customer.Address,
            CustomerPhoneNo = customer.PhoneNo,
            VatNumber = customer.VatNumber,
            CreditLimit = customer.CreditLimit,
            Email = customer.Email,
        };
        var smtpCredentials = new SmtpCredentials
        {
            PrimaryEmailAddress = companyProfile.PrimaryEmailAddress,
            EmailPassword = companyProfile.EmailPassword,
            MailHostName =  companyProfile.MailHostName,
            PortNumber =  companyProfile.PortNumber,
            IsSSLEnabled =  companyProfile.IsSSLEnabled,
            DefaultFromDisplayName = companyProfile.CompanyName
        };
        var invoiceData = new InvoiceData
        {
            InvoiceNumber = invoice.InvoiceNumber,
            InvoiceDate = invoice.InvoiceDate.ToString("dd-MMM-yyyy"),
            ProjectedPayDate = invoice.ProjectedPayDate.ToString("dd-MMM-yyyy"),
            Balance = invoice.Balance,
            TotalInvoiceAmount = invoice.TotalInvoiceAmount,
            CurrencyName = invoice.CurrencyName,
            VatAmount = invoice.vatAmount,
            PurchaseOrderNumber = invoice.PurchaseOrderNumber,
            AmountInWords = ConvertAmountToWords(invoice.TotalInvoiceAmount, invoice.CurrencyName, invoice.MinorName),
            TotalBeforeDiscount = invoiceDetails.Sum(i => i.AmountBeforeDiscount),
            TotalDiscount = invoiceDetails.Sum(i => string.IsNullOrWhiteSpace(i.Amount) ? 0 : Convert.ToDecimal(i.Amount)),
            ReportHeader = reportHeader,
            CustomerInfo = supplierInfo,
            InvoiceDetails = invoiceDetails,
            ReferenceNumber = invoiceDetails[0].ReferenceNumber,
            // SmtpCredentials = smtpCredentials,
        };
    
        return invoiceData;
    }
    public async Task<object> GetOpeningBalances(string status)
    {
        var result = await _repositoryOpeningBalances.GetAllListAsync();
        if (status == "posted")
            result = result.Where(s => s.IsPosted).ToList();
        else if (status == "unposted")
            result = result.Where(s => !s.IsPosted).ToList();

        return result.Select(s => new
        {
            s.CustomerName,
            s.Amount,
            TransactionDate = s.TransactionDate.ToString("dd-MMM-yyyy"),
            s.CurrencyName,
            s.IsPosted
        }).ToList();
    }

    public async Task<object> GetOpeningBalancesByCustomer(Guid customerId, string status)
    {
        var result = await _repositoryOpeningBalances.GetAllListAsync(s => s.CustomerId == customerId);
        if (status == "posted")
            result = result.Where(s => s.IsPosted).ToList();
        else if (status == "unposted")
            result = result.Where(s => !s.IsPosted).ToList();

        return result.Select(s => new
        {
            s.CustomerName,
            s.Amount,
            TransactionDate = s.TransactionDate.ToString("dd-MMM-yyyy"),
            s.CurrencyName,
            s.IsPosted
        }).ToList();
    }
   
    
    public async Task<object> GetAllConvertedOpeningBalances(string status)
    {
        var result = await _repositoryOpeningBalances.GetAllListAsync();
        if (status == "posted")
            result = result.Where(s => s.IsPosted).ToList();
        else if (status == "unposted")
            result = result.Where(s => !s.IsPosted).ToList();
        var defaultCurrency = await _repositoryCurrency.FirstOrDefaultAsync(c => 
            c.CurrencyName.ToLower() == "ghana cedi" || 
            c.CurrencyName.ToLower() == "ghana cedis"
        );

        return result.Select(s => new
        {
            s.CustomerName,
            s.IsPosted,
            s.CurrencyName,
            TransactionDate = s.TransactionDate.ToString("dd-MMM-yyyy"),
            Amount = s.BuyRate > 0 ? (s.Amount * defaultCurrency.BuyRate) / s.BuyRate : 0
        }).ToList();
    }
    public async Task<object> GetPayments()
    {
    
        var paymentRecords = await _repositoryArInvoicePaymentRecords
            .GetAll()
            /*.Where(p => p.IsPosted == true)*/
            .ToListAsync();

   
        var invoiceIds = paymentRecords.Select(p => p.InvoiceId).Distinct().ToList();
    
        var invoices = await _repositoryArInvoice.GetAll()
            .Where(i => invoiceIds.Contains(i.Id))
            .ToListAsync();
        var allPayments = (from p in paymentRecords
            join i in invoices on p.InvoiceId equals i.Id
            select new
            {
                p.CustomerName,
                PaymentDate = p.PaymentDate.ToString("dd-MMM-yyyy"),
                p.ModeOfPayment,
                ChequeNumber = string.IsNullOrEmpty(p.ChequeNo) ? "--" : p.ChequeNo,
                DaysToPayment = (p.PaymentDate - i.InvoiceDate).Days,
                i.InvoiceNumber,
                InvoiceDate = i.InvoiceDate.ToString("dd-MMM-yyyy"),
                TotalAmount = i.TotalInvoiceAmount,
                AmountToPay = p.ConvertedAmount + p.ConvertedWithheldAmount,
                i.CurrencyName
            }).ToList();

        return new { data = allPayments };
    }

    public async Task<object> GetPaymentsByCustomer(Guid customerId)
    {
        var paymentRecords = await _repositoryArInvoicePaymentRecords.GetAll()
        /*.Where(p => p.IsPosted == true)*/
        .ToListAsync();

        var invoiceIds = paymentRecords.Select(p => p.InvoiceId).Distinct().ToList();

        var invoices = await _repositoryArInvoice.GetAll()
            .Where(i => invoiceIds.Contains(i.Id) && i.CustomerId == customerId && i.IsCanceled == false)
            .ToListAsync();

        var allPayments = (from p in paymentRecords
            join i in invoices on p.InvoiceId equals i.Id
            select new
            {
                i.CustomerName,
                PaymentDate = p.PaymentDate.ToString("dd-MMM-yyyy"),
                p.ModeOfPayment,
                ChequeNumber = string.IsNullOrEmpty(p.ChequeNo) ? "--" : p.ChequeNo,
                DaysToPayment = (p.PaymentDate - i.InvoiceDate).Days,
                i.InvoiceNumber,
                InvoiceDate = i.InvoiceDate.ToString("dd-MMM-yyyy"),
                TotalAmount = i.TotalInvoiceAmount,
                AmountToPay = p.ConvertedAmount + p.ConvertedWithheldAmount,
                i.CurrencyName
            }).ToList();

        return new { data = allPayments };
    }

    public async Task<object> GetPaymentsByDate(DateTime startDate, DateTime endDate)
    {
        var paymentRecords = await _repositoryArInvoicePaymentRecords
            .GetAll()
            .Where(p => p.PaymentDate >= startDate && p.PaymentDate <= endDate /*&& p.IsPosted == true*/)
            .ToListAsync();

        var invoiceIds = paymentRecords.Select(p => p.InvoiceId).Distinct().ToList();

        var invoices = await _repositoryArInvoice.GetAll()
            .Where(i => invoiceIds.Contains(i.Id) && i.IsCanceled == false)
            .ToListAsync();

        var allPayments = (from pr in paymentRecords
            join i in invoices on pr.InvoiceId equals i.Id
            select new
            {
                i.CustomerName,
                PaymentDate = pr.PaymentDate.ToString("dd-MMM-yyyy"),
                pr.ModeOfPayment,
                ChequeNumber = string.IsNullOrEmpty(pr.ChequeNo) ? "--" : pr.ChequeNo,
                pr.BankName,
                pr.BankBranch,
                pr.CurrencyName,
                pr.CurrencyCode,
                pr.ReceiptNo,
                i.InvoiceNumber,
                InvoiceDate = i.InvoiceDate.ToString("dd-MMM-yyyy"),
                AmountToPay = pr.ConvertedWithheldAmount + pr.ConvertedAmount,
                DaysToPayment = (pr.PaymentDate - i.InvoiceDate).Days,
                TotalAmount = i.TotalInvoiceAmount,
            }).ToList();

        return new { data = allPayments };
    }

    public async Task<object> GetPaymentReceipts(Guid id)
    {
        var payments = await _repositoryPayment.GetAllListAsync(s => s.Id == id && s.IsCanceled == false);
        if (payments == null || payments.Count == 0)
        {
            return new { code = 404, message = "Payment not found." };
        }

        var paymentRecords = await _repositoryArInvoicePaymentRecords
            .GetAllListAsync(i => i.PaymentId == id);

        if (paymentRecords == null || paymentRecords.Count == 0)
        {
            return new { code = 404, message = "No invoice payment record found." };
        }

        var receipts = new List<PaymentReceipts>();

        foreach (var record in paymentRecords)
        {
            ArInvoice invoice = null;
            if (record.InvoiceId != Guid.Empty)
            {
                invoice = await _repositoryArInvoice.FirstOrDefaultAsync(i => i.Id == record.InvoiceId);
            }

            Currency currency = null;
            if (!string.IsNullOrEmpty(record.CurrencyName))
            {
                currency = await _repositoryCurrency.FirstOrDefaultAsync(c => c.CurrencyName == record.CurrencyName);
            }

            var minorName = currency != null ? currency.MinorName : "peswas";

            receipts.Add(new PaymentReceipts
            {
                CustomerName   = record.CustomerName,
                PaymentDate    = record.PaymentDate.ToString("dd-MMM-yyyy"),
                CurrencyName   = record.CurrencyName,
                CurrencyCode   = record.CurrencyCode,
                PaidAmount     = record.Amount,
                AmountInWords  = ConvertAmountToWords(record.Amount, record.CurrencyName, minorName),
                ModeOfPayment  = record.ModeOfPayment,
                ChequeNo       = record.ChequeNo,
                BankBranch     = record.BankBranch,
                BankName       = record.BankName,
                InvoiceNo      = invoice != null ? invoice.InvoiceNumber : "N/A",
                ReceiptNo      = record.ReceiptNo
            });
        }

        return receipts;
        }
      public async Task<object> GetPaymentReceipts(List<Guid> ids)
        {
    
            var paymentRecords = await _repositoryArInvoicePaymentRecords
                .GetAllListAsync(s => ids.Contains(s.PaymentId));

            var header = (await _repositoryCompanyProfile.GetAllListAsync())
            .Select(a => new
            {
            a.CompanyName,
            PrimaryPhoneNo = $"Tel: {a.PhoneNo}",
            a.Address,
            Email = $"Email: {a.Email}",
            ReportTitle = "AR PAYMENT RECEIPT",
            a.CompanyLogo,
            })
            .FirstOrDefault();
           

    var resultList = new List<object>();

    foreach (var s in paymentRecords)
    {
        ArInvoice invoice = null;
        if (s.InvoiceId != Guid.Empty)
        {
            invoice = await _repositoryArInvoice.FirstOrDefaultAsync(i => i.Id == s.InvoiceId);
        }
        ArPayment matchedPayment = null;
        if (s.PaymentId != Guid.Empty)
        {
            matchedPayment = await _repositoryPayment.FirstOrDefaultAsync(p => p.Id == s.PaymentId && p.IsCanceled == false);
        }
        Currency currency = null;
        if (!string.IsNullOrEmpty(s.CurrencyName))
        {
            currency = await _repositoryCurrency.FirstOrDefaultAsync(c => c.CurrencyName == s.CurrencyName);
        }

        var minorName = currency != null ? currency.MinorName : "peswas";
        
        if (matchedPayment != null)
            if (invoice != null)
                resultList.Add(new
                {
                    // 🔥 HEADER (same for every row)
                    CompanyName = header?.CompanyName,
                    PrimaryPhoneNo = header?.PrimaryPhoneNo,
                    Address = header?.Address,
                    Email = header?.Email,
                    ReportTitle = header?.ReportTitle,
                    CompanyLogo = header?.CompanyLogo,

            
                    Id = s.Id,
                    CustomerName   = s.CustomerName,
                    PaymentDate    = s.PaymentDate.ToString("dd-MMM-yyyy"),
                    CurrencyName   = s.CurrencyName,
                    CurrencyCode   = s.CurrencyCode,
                    PaidAmount     = s.Amount,
                    AmountInWords  = ConvertAmountToWords(s.Amount, s.CurrencyName, minorName),
                    ModeOfPayment  = s.ModeOfPayment,
                    ChequeNo       = s.ChequeNo,
                    BankBranch     = s.BankBranch,
                    BankName       = s.BankName,
                    InvoiceNo      = invoice != null ? invoice.InvoiceNumber : "N/A",
                    ReceiptNo      = s.ReceiptNo
                });
        
    }
    return resultList;
   
}
        public async Task<object> GetQuotations()
        {
            var data = await _repositoryQuotation.GetAllListAsync();
            return data.Select(c => new
            {
                c.CustomerName,
                c.AccountNumber,
                c.QuotationNumber,
                QuotationDate = c.QuotationDate.ToString("dd-MMM-yyyy"),
                c.IsConvertedToInvoice,
                c.CurrencyName,
            }).ToList();
        }
        
        public async Task<object> GetQuotationByCustomer(Guid customerId)
        {
            var data = await _repositoryQuotation.GetAllListAsync(s => s.CustomerId == customerId);
            return data.Select(c => new
            {
                c.CustomerName,
                c.AccountNumber,
                c.QuotationNumber,
                QuotationDate = c.QuotationDate.ToString("dd-MMM-yyyy"),
                c.IsConvertedToInvoice,
                c.CurrencyName,
            }).ToList();
        }
        
        public async Task<object> GetQuotationByDate(DateTime startDate, DateTime endDate)
        {
            var data = await _repositoryQuotation.GetAllListAsync(s => s.QuotationDate >= startDate && s.QuotationDate <= endDate);
            return data.Select(c => new
            {
                c.CustomerName,
                c.AccountNumber,
                c.QuotationNumber,
                QuotationDate = c.QuotationDate.ToString("dd-MMM-yyyy"),
                c.IsConvertedToInvoice,
                c.CurrencyName,
            }).ToList();
        }
        
        public async Task<object> GetQuotation(Guid quotationId)
        {
            var data = await _repositoryQuotation.FirstOrDefaultAsync(s => s.Id == quotationId);
            return new
            {
                data.CustomerName,
                data.AccountNumber,
                data.QuotationNumber,
                QuotationDate = data.QuotationDate.ToString("dd-MMM-yyyy"),
                data.IsConvertedToInvoice,
                data.CurrencyName,
            };
        }
        public async Task<dynamic> GetQuotationPdf(Guid quotationId)
        {
            var quotation = await _repositoryQuotation.FirstOrDefaultAsync(i => i.Id == quotationId );
            if (quotation == null) return new { message = "Quotation not found." };
            var customer = await _repositoryCustomer.FirstOrDefaultAsync(s => s.Id == quotation.CustomerId);
            if (customer == null) return new { message = "Customer not found." };
            bool allAmountsAreZero = (quotation.Details ?? new List<QuotationDetail>())
            .All(d => d.Amount == 0);
            var quotationDetails = (quotation.Details ?? new List<QuotationDetail>())
            .Select((d, index) => new QuotationDetailDto
            {
                Index = index + 1,
                Description = d.Description,
                UnitPrice = d.UnitPrice,
                ReferenceNumber = d.ReferenceNo,
                Quantity = d.Quantity,
                Amount = allAmountsAreZero ? " " : d.Amount.ToString("0.00"),
                SubTotal = d.SubTotal,
                AmountBeforeDiscount = d.UnitPrice * d.Quantity
            })
            .ToList();
            var companyProfile = await _repositoryCompanyProfile.GetAll().FirstOrDefaultAsync();
            var reportHeader = new ReportHeader
            {
                CompanyName = companyProfile.CompanyName,
                PrimaryPhoneNo = $"Tel: {companyProfile.PhoneNo}",
                Address = companyProfile.Address,
                Email = $"Email: {companyProfile.Email}",
                ReportTitle = $"Quotation",
                CompanyLogo = companyProfile.CompanyLogo != null 
                ? $"data:image/png;base64,{Convert.ToBase64String(companyProfile.CompanyLogo)}" 
                : null
            };
   
            var customerInfo = new CustomerInfo
            {
                CustomerName = customer.Name,
                AccountNumber = customer.AccountNumber,
                CustomerAddress = customer.Address,
                CustomerPhoneNo = customer.PhoneNo,
                VatNumber = customer.VatNumber,
                CreditLimit = customer.CreditLimit,
                Email = customer.Email,
            };
            var smtpCredentials = new SmtpCredentials
            {
                PrimaryEmailAddress = companyProfile.PrimaryEmailAddress,
                EmailPassword = companyProfile.EmailPassword,
                MailHostName =  companyProfile.MailHostName,
                PortNumber =  companyProfile.PortNumber,
                IsSSLEnabled =  companyProfile.IsSSLEnabled,
                DefaultFromDisplayName = companyProfile.CompanyName
            };
            var totalAmount = quotationDetails.Sum(d => d.SubTotal);
            var totalBeforeDiscount = quotationDetails.Sum(i => i.AmountBeforeDiscount);
            var currency = await _repositoryCurrency.FirstOrDefaultAsync(c => c.CurrencyName == quotation.CurrencyName);
            var minorName = currency != null ? currency.MinorName : "peswas";
            var quotationData = new QuotationData
            {
                QuotationNumber = quotation.QuotationNumber,
                QuotationDate = quotation.QuotationDate.ToString("dd-MMM-yyyy"),
                TotalAmount = totalAmount,
                CurrencyName = quotation.CurrencyName,
                AmountInWords = ConvertAmountToWords(totalAmount, quotation.CurrencyName, minorName),
                TotalBeforeDiscount = totalBeforeDiscount,
                TotalDiscount = quotationDetails.Sum(i => string.IsNullOrWhiteSpace(i.Amount) ? 0 : Convert.ToDecimal(i.Amount)),
                ReportHeader = reportHeader,
                CustomerInfo = customerInfo,
                Details = quotationDetails,
                ReferenceNumber = quotationDetails.FirstOrDefault()?.ReferenceNumber,
                Notes = quotation.Notes
            };
            return quotationData;
        }
        public async Task<object> GetCreditMemo()
        {
            var result = await _repositoryArCreditMemo.GetAllListAsync();
            return result.Select(s => new
                {
                    s.CustomerName,
                    s.InvoiceNo,
                    TransactionDate = s.TransactionDate.ToString("dd-MMM-yyyy"),
                    s.InvoiceBalance,
                    s.InvoiceCurrencyName,
                    s.Amount,
                    s.OuName,
                    s.CurrencyName,
                
                })
                .OrderBy(i => i.CurrencyName)
                .ToList();
        }

        public async Task<object> GetAgingSummary(DateTime startDate, int agingInterval)
        {
            var invoices = await _repositoryArInvoice.GetAllListAsync(i =>
                !i.IsCanceled && i.IsPosted);

            // Group invoices by Supplier and Currency, then calculate aging buckets
            var agingSummary = invoices
                .GroupBy(i => new { i.CustomerName, i.CurrencyName })
                .Select(g => new
                {
                    g.Key.CustomerName,
                    g.Key.CurrencyName,
                    AgingNumber = agingInterval,
                    TotalInvoiceAmount = g.Sum(i => i.TotalInvoiceAmount),
                    TotalPaidAmount = g.Sum(i => i.PaidAmount + i.WithheldAmount),
                    TotalBalance = g.Sum(i => i.Balance),
                    CurrentDay = g.Where(i => (startDate - i.ProjectedPayDate).Days < agingInterval).Sum(i => i.Balance),
                    AgingFirst = g.Where(i => (startDate - i.ProjectedPayDate).Days >= agingInterval && (startDate - i.ProjectedPayDate).Days < 2 * agingInterval).Sum(i => i.Balance),
                    AgingSecond = g.Where(i => (startDate - i.ProjectedPayDate).Days >= 2 * agingInterval && (startDate - i.ProjectedPayDate).Days < 3 * agingInterval).Sum(i => i.Balance),
                    AgingThird = g.Where(i => (startDate - i.ProjectedPayDate).Days >= 3 * agingInterval).Sum(i => i.Balance),
                    
                })
                .ToList();

            return new { Invoices = agingSummary };
        }

        public async Task<object> GetAgeingByCustomer(Guid customerId, DateTime startDate, int agingInterval)
        {
            var invoices = await _repositoryArInvoice.GetAllListAsync(i =>
                !i.IsCanceled && i.IsPosted && i.CustomerId == customerId);
            var agingSummary = invoices.Select(i => new
            {
                i.currencyCode,
                i.CustomerName,
                i.AccountName,
                i.InvoiceNumber,
                i.BuyRate,
                i.Balance,
                i.TotalInvoiceAmount,
                PaidAmount = i.PaidAmount + i.WithheldAmount,
                ProjectedPayDate = i.ProjectedPayDate.ToString("dd-MMM-yyyy"),
                InvoiceDate = i.InvoiceDate.ToString("dd-MMM-yyyy"),
                i.PurchaseOrderNumber,
                AgingNumber = agingInterval,
                CurrentDay = (startDate - i.ProjectedPayDate).Days < agingInterval ? i.Balance : 0,
                AgingFirst = (startDate - i.ProjectedPayDate).Days >= agingInterval && (startDate - i.ProjectedPayDate).Days < 2 * agingInterval ? i.Balance : 0,
                AgingSecond = (startDate - i.ProjectedPayDate).Days >= 2 * agingInterval && (startDate - i.ProjectedPayDate).Days < 3 * agingInterval ? i.Balance : 0,
                AgingThird = (startDate - i.ProjectedPayDate).Days >= 3 * agingInterval ? i.Balance : 0,
            }).OrderBy(i => i.currencyCode).ToList();
            return new { Invoices = agingSummary };
        }

        public async Task<object> GetAgeingByDate(DateTime startDate, int agingInterval)
        {
            var invoices = await _repositoryArInvoice.GetAllListAsync(i =>
                !i.IsCanceled && i.IsPosted);
            var agingSummary = invoices.Select(i => new
            {
                i.currencyCode,
                i.CustomerName,
                i.AccountName,
                i.InvoiceNumber,
                i.BuyRate,
                i.Balance,
                i.TotalInvoiceAmount,
                PaidAmount = i.PaidAmount + i.WithheldAmount,
                InvoiceDate = i.InvoiceDate.ToString("dd-MMM-yyyy"),
                ProjectedPayDate = i.ProjectedPayDate.ToString("dd-MMM-yyyy"),
                i.PurchaseOrderNumber,
                AgingNumber = agingInterval,
                CurrentDay = (startDate - i.ProjectedPayDate).Days < agingInterval ? i.Balance : 0,
                AgingFirst = (startDate - i.ProjectedPayDate).Days >= agingInterval && (startDate - i.ProjectedPayDate).Days < 2 * agingInterval ? i.Balance : 0,
                AgingSecond = (startDate - i.ProjectedPayDate).Days >= 2 * agingInterval && (startDate - i.ProjectedPayDate).Days < 3 * agingInterval ? i.Balance : 0,
                AgingThird = (startDate - i.ProjectedPayDate).Days >= 3 * agingInterval ? i.Balance : 0,
            }).OrderBy(i => i.currencyCode).ToList();
            return new { Invoices = agingSummary };
        }

        private string ConvertAmountToWords(decimal amount, string majorName, string minorName)
        {
            if (amount == 0) return "Zero";

            var unitsMap = new[]
            {
             "Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
             "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"
             };
             var tensMap = new[] { "Zero", "Ten", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety" };

            var words = "";

            long integerPart = (long)amount;
            // Extract fractional part
            int fractionalPart = (int)((amount - integerPart) * 100); 

            // Convert integer part
            if (integerPart > 0)
            {
                words += ConvertIntegerToWords(integerPart, unitsMap, tensMap) + " " + majorName;
            }

            // Convert fractional part
            if (fractionalPart > 0)
            {
                if (!string.IsNullOrEmpty(words)) words += " and ";
                words += ConvertIntegerToWords(fractionalPart, unitsMap, tensMap) + " " + minorName;
            }

            return words.Trim();
        }
        private string ConvertIntegerToWords(long number, string[] unitsMap, string[] tensMap)
        {
            if (number == 0) return "";

            var words = "";

            if (number / 1000000 > 0)
            {
                words += ConvertIntegerToWords(number / 1000000, unitsMap, tensMap) + " Million ";
                number %= 1000000;
            }
            if (number / 1000 > 0)
            {
                words += ConvertIntegerToWords(number / 1000, unitsMap, tensMap) + " Thousand ";
                number %= 1000;
            }
            if (number / 100 > 0)
            {
                words += ConvertIntegerToWords(number / 100, unitsMap, tensMap) + " Hundred ";
                number %= 100;
            }
            if (number > 0)
            {
                if (words != "") words += "and ";

                if (number < 20)
                    words += unitsMap[number];
                else
                {
                    words += tensMap[number / 10];
                    if ((number % 10) > 0)
                        words += "-" + unitsMap[number % 10];
                }
            }

            return words.Trim();
        }
        
        public async Task<object> GetGlTransaction(DateTime startDate, DateTime endDate, bool isMultiCurrency)
        {
            var start = startDate.Date;
            var end = endDate.Date.AddDays(1).AddTicks(-1);
    
            var journals = await _repositoryJournal.GetAll()
                .Where(j => j.BatchDate >= start 
                            && j.BatchDate <= end 
                            && j.TransactionSource == "AR")
                .ToListAsync();

            var journalIds = journals.Select(j => j.Id).ToList();

            var journalDetails = await _repositoryJournalDetail.GetAll()
                .Where(d => journalIds.Contains(d.JournalId) && d.IsMultiCurrency == isMultiCurrency)
                .ToListAsync();

            var journalDetailsQuery = _repositoryJournalDetail.GetAll()
                .Where(d => journalIds.Contains(d.JournalId));

          
            var result = (from j in journals
                    join d in journalDetails on j.Id equals d.JournalId
                    select new
                    {
                        j.BatchNumber,
                        j.TransactionSource,
                        d.AccountName,
                        d.Description,
                        d.DebitAmount,
                        d.CreditAmount,
                        TransactionDate = d.TransactionDate.ToString("dd-MMM-yyyy"),
                        d.CurrencyCode,
                        d.CurrencyName,
                        d.OuName,
                        d.ReferenceNumber,
                        d.ChequeNo,
                        d.IsMultiCurrency
                    })
                // 🔽 Order by batch number, then ensure debit comes first
                .OrderBy(x => x.BatchNumber)
                .ThenByDescending(x => x.DebitAmount > 0)
                .ThenBy(x => x.AccountName) // optional tie-breaker
                .ToList();

            return new
            {
                code = 200,
                message = "GL transaction details retrieved successfully",
                data = result
            };
        }
    
}