using Abp.Domain.Repositories;
using Microsoft.EntityFrameworkCore;
using TopazERP.Models.Ap;
using TopazERP.Models.Shared;
using System;
using System.Collections.Generic;
using System.Dynamic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Mail;
using System.Threading.Tasks;
using Abp.Net.Mail;
using Akka.Actor;
using TopazERP.Actors;
using TopazERP.Actors.MessageModels;
using TopazERP.DomainServices.Ap.Reports.Dto;
using TopazERP.Models.Ledger;
using TopazERP.Notifications;
using TopazERP.Notifications.Dto;
using TopazERP.Pdf;
using TopazERP.Notifications.Dto;
/*using ReportHeader = TopazERP.DomainServices.Ap.Reports.Dto.ReportHeader;
using SmtpCredentials = TopazERP.Notifications.Dto.SmtpCredentials;*/


namespace TopazERP.DomainServices.Ap.Reports
{
    public class ApReportManager : Abp.Domain.Services.DomainService, IApReportManager
    {
        private readonly IRepository<Supplier, Guid> _repositorySupplier;
        private readonly IRepository<CompanyProfile, Guid> _repositoryCompanyProfile;
        private readonly IRepository<ApInvoice, Guid> _repositoryApInvoice;
        private readonly IRepository<ApOpeningBalance, Guid> _repositoryOpeningBalances;
        private readonly IRepository<ApPayment, Guid> _repositoryPayment;
        private readonly IRepository<ApWithHoldingPayment, Guid> _repositoryWithHoldingPayment;
        private readonly IRepository<ApVoucher, Guid> _repositoryVoucher;
        private readonly IRepository<ApDebitMemo, Guid> _repositoryApDebitMemo;
        private readonly IRepository<Currency, Guid> _repositoryCurrency;
        private readonly IRepository<ApInvoicePaymentRecords, Guid> _repositoryApInvoicePaymentRecords;
        private readonly IApInvoicePdfGenerator _apInvoicePdfGenerator;
        private readonly IRepository<Journal, Guid> _repositoryJournal;
        private readonly IRepository<JournalDetail, Guid> _repositoryJournalDetail;
        public ApReportManager(
            IRepository<Supplier, Guid> repositorySupplier,
            IRepository<CompanyProfile, Guid> repositoryCompanyProfile,
            IRepository<ApInvoice, Guid> repositoryApInvoice,
            IRepository<ApOpeningBalance, Guid> repositoryOpeningBalances,
            IRepository<ApPayment, Guid> repositoryPayment,
            IRepository<ApWithHoldingPayment, Guid> repositoryWithHoldingPayment,
            IRepository<ApVoucher, Guid> repositoryVoucher,
            IRepository<ApDebitMemo, Guid> repositoryApDebitMemo,
            IRepository<Currency, Guid> repositoryCurrency,
            IRepository<ApInvoicePaymentRecords, Guid> repositoryApInvoicePaymentRecords,
            IApInvoicePdfGenerator apInvoicePdfGenerator, IRepository<Journal, Guid> repositoryJournal, IRepository<JournalDetail, Guid> repositoryJournalDetail)
        {
            _repositorySupplier = repositorySupplier;
            _repositoryCompanyProfile = repositoryCompanyProfile;
            _repositoryApInvoice = repositoryApInvoice;
            _repositoryOpeningBalances = repositoryOpeningBalances;
            _repositoryPayment = repositoryPayment;
            _repositoryWithHoldingPayment = repositoryWithHoldingPayment;
            _repositoryVoucher = repositoryVoucher;
            _repositoryApDebitMemo = repositoryApDebitMemo;
            _repositoryCurrency = repositoryCurrency;
            _repositoryApInvoicePaymentRecords = repositoryApInvoicePaymentRecords;
            _apInvoicePdfGenerator = apInvoicePdfGenerator;
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
        public async Task<object> GetSuppliers()
        {
            var result = await _repositorySupplier.GetAllListAsync();
            return result
                .OrderBy(s => s.Name)
                .Select(s => new
                {
                    s.Name,
                    s.AccountNumber,
                    s.Address,
                    s.PhoneNo,
                    s.ContactPerson,
                    s.CreditLimit
                })
                .ToList();
        }

        public async Task<object> GetSuppliersByGroup(Guid supplierGroupId)
        {
            var result = await _repositorySupplier.GetAll()
                .Where(s => s.SupplierGroupId == supplierGroupId)
                .OrderBy(s => s.Name)
                .ToListAsync();

            return result.Select(s => new
            {
                s.Name,
                s.AccountNumber,
                s.Address,
                s.PhoneNo,
                s.ContactPerson,
                s.CreditLimit,
                s.SupplierGroupId,
                s.SupplierGroupName
            }).ToList();
        }
        public async Task<object> GetStatement(Guid supplierId)
        {
            var supplier = await _repositorySupplier.FirstOrDefaultAsync(s => s.Id == supplierId);

            var openingBalances = await _repositoryOpeningBalances.GetAllListAsync(
                ob => ob.SupplierId == supplierId
            );

            var invoices = await _repositoryApInvoice.GetAllListAsync(
                s => s.SupplierId == supplierId && s.IsCanceled == false
            );

            var debitMemos = await _repositoryApDebitMemo.GetAllListAsync(
                d => d.SupplierId == supplierId
            );

            var payments = await _repositoryApInvoicePaymentRecords.GetAllListAsync(
                p => p.SupplierName == supplier.Name && p.IsPosted == true
            );
        
            var allCurrencies = openingBalances.Select(o => o.CurrencyName)
                .Union(invoices.Select(i => i.CurrencyName))
                .Union(debitMemos.Select(c => c.CurrencyName))
                .Distinct()
                .ToList();
        
            var currencyInfo = await _repositoryCurrency.GetAllListAsync(c => allCurrencies.Contains(c.CurrencyName));
            var currencyRates = currencyInfo.ToDictionary(c => c.CurrencyName, c => c.BuyRate);

            var statementRecords = new List<StatementRecord>();
        
            foreach (var ob in openingBalances)
            {
                statementRecords.Add(new StatementRecord
                {
                    Type = "OpeningBalance",
                    SupplierName = supplier.Name,
                    AccountNumber = supplier.AccountNumber,
                    ContactPhone =supplier.ContactPersonPhone,
                    InvoiceNumber = "Opening Balance",
                    InvoiceNo = "Opening Balance",
                    InvoiceDate = ob.TransactionDate.ToString("dd-MMM-yyyy"),
                    TransactionDate = ob.TransactionDate,
                    TotalInvoiceAmount = ob.Amount,
                    PaidAmount = null,
                    Balance = ob.Amount,
                    Outstanding = ob.Amount,
                    CurrencyName = ob.CurrencyName,
                    BuyRate = currencyRates.ContainsKey(ob.CurrencyName) ? currencyRates[ob.CurrencyName] : 1m,
                    Description = "Opening balance"
                });
            }
            foreach (var inv in invoices)
            {
                var invoiceOutstanding = inv.TotalInvoiceAmount - inv.PaidAmount;
                statementRecords.Add(new StatementRecord
                {
                    Type = "Invoice",
                    SupplierName = supplier.Name,
                    AccountNumber = supplier.AccountNumber,
                    ContactPhone = supplier.ContactPersonPhone,
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
                    statementRecords.Add(new StatementRecord
                    {
                        Type = "Payment",
                        SupplierName = supplier.Name,
                        AccountNumber = supplier.AccountNumber,
                        ContactPhone = supplier.ContactPersonPhone,
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
            foreach (var cm in debitMemos)
            {
                if (!cm.IsInvoiceDebit) // Unapplied CM
                {
                    statementRecords.Add(new StatementRecord
                    {
                        Type = "DebitMemo",
                        SupplierName = supplier.Name,
                        AccountNumber = supplier.AccountNumber,
                        ContactPhone = supplier.ContactPersonPhone,
                        InvoiceNumber = $"Debit Memo/{cm.InvoiceNo}",
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
            /*decimal overallOutstanding = statementRecords.Sum(r =>
            {
               r.Outstanding = (r.Outstanding ?? 0m);
                return r.Outstanding ?? 0m;
            });

            return new
            {
                data = statementRecords.OrderBy(r => r.TransactionDate).ToList(),
                outstanding = new List<object>
                {
                    new { currency = "GHS", outstanding = overallOutstanding }
                }
            };*/
            // 🔹 Group totals per currency
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
        public async Task<object> GetStatementType2(Guid supplierId, DateTime startDate, DateTime endDate)
        {
            var supplier = await _repositorySupplier.FirstOrDefaultAsync(s => s.Id == supplierId);
            var openingBalances = await _repositoryOpeningBalances.GetAllListAsync(
                ob => ob.SupplierId == supplierId
            );
            var payments = await _repositoryApInvoicePaymentRecords.GetAllListAsync(
                u => u.IsPosted == true
            );
            var invoices = await _repositoryApInvoice.GetAllListAsync(
                s => s.SupplierId == supplierId && s.IsCanceled == false
            );
            var debitMemos = await _repositoryApDebitMemo.GetAllListAsync(
                d => d.SupplierId == supplierId && d.IsInvoiceDebit == false
            );
            var allCurrencies = openingBalances.Select(o => o.CurrencyName)
                .Union(invoices.Select(i => i.CurrencyName))
                .Union(debitMemos.Select(c => c.CurrencyName))
                .Distinct()
                .ToList();
            var currencyInfo = await _repositoryCurrency.GetAllListAsync(c => allCurrencies.Contains(c.CurrencyName));
            var currencyRates = currencyInfo.ToDictionary(c => c.CurrencyName, c => c.BuyRate);

            var allStatementRecords = new List<StatementRecord>();
        
            foreach (var ob in openingBalances)
            {
                allStatementRecords.Add(new StatementRecord
                {
                    Type = "OpeningBalance",
                    SupplierName = supplier.Name,
                    AccountNumber = supplier.AccountNumber,
                    ContactPhone = supplier.ContactPersonPhone,
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
                allStatementRecords.Add(new StatementRecord
                {
                    Type = "Invoice",
                    SupplierName =supplier.Name,
                    AccountNumber = supplier.AccountNumber,
                    ContactPhone = supplier.ContactPersonPhone,
                    InvoiceNumber = inv.InvoiceNumber,
                    InvoiceNo = inv.InvoiceNumber,
                    InvoiceDate = inv.InvoiceDate.ToString("dd-MMM-yyyy"),
                    TransactionDate = inv.InvoiceDate,
                    TotalInvoiceAmount = inv.TotalInvoiceAmount,
                    PaidAmount = 0m,
                    CurrencyName = inv.CurrencyName,
                    BuyRate = currencyRates.ContainsKey(inv.CurrencyName) ? currencyRates[inv.CurrencyName] : 1m,
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
                    allStatementRecords.Add(new StatementRecord
                    {
                        Type = "Payment",
                        SupplierName = supplier.Name,
                        AccountNumber =supplier.AccountNumber,
                        ContactPhone = supplier.ContactPersonPhone,
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
            foreach (var dm in debitMemos)
            {
                var suffix = dm.ModeOfPayment?.Equals("Cash", StringComparison.OrdinalIgnoreCase) == true
                    ? "/Cash"
                    : $"/{dm.ChequeNo}";
                allStatementRecords.Add(new StatementRecord
                {
                    Type = "DebitMemo",
                    SupplierName = supplier.Name,
                    AccountNumber =supplier.AccountNumber,
                    ContactPhone = supplier.ContactPersonPhone,
                    InvoiceNumber = $"DM/{dm.InvoiceNo}{suffix}",
                    InvoiceNo = dm.InvoiceNo,
                    InvoiceDate = dm.TransactionDate.ToString("dd-MMM-yyyy"),
                    TransactionDate = dm.TransactionDate,
                    TotalInvoiceAmount = dm.IsInvoiceDebit ? dm.Amount : -dm.Amount,
                    PaidAmount = dm.IsInvoiceDebit ? dm.Amount : 0m,
                    CurrencyName = dm.CurrencyName,
                    BuyRate = currencyRates.ContainsKey(dm.CurrencyName) ? currencyRates[dm.CurrencyName] : 1m,
                    PaymentDate = dm.TransactionDate.ToString("dd-MMM-yyyy"),
                    Description = dm.Description
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
                else if (rec.Type == "DebitMemo")
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

            var bbfRecords = new List<StatementRecord>();
            foreach (var currency in allCurrencies)
            {
                beforeStart.TryGetValue(currency, out var lastRecord);
                var bbfDate = lastRecord?.TransactionDate ?? startDate.AddDays(-1);
                var bbfBalance = lastRecord?.Balance ?? 0m;
                bbfRecords.Add(new StatementRecord
                {
                    Type = "BBF",
                    SupplierName =supplier.Name,
                    AccountNumber =supplier.AccountNumber,
                    ContactPhone = supplier.ContactPersonPhone,
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
    
        public async Task<object> GetStatementType3(Guid supplierId, DateTime startDate, DateTime endDate)
        {
            var supplier = await _repositorySupplier.FirstOrDefaultAsync(s => s.Id == supplierId);
            var openingBalances = await _repositoryOpeningBalances.GetAllListAsync(
                ob => ob.SupplierId == supplierId
            );
            var payments = await _repositoryApInvoicePaymentRecords.GetAllListAsync(
                u => u.IsPosted == true
            );
            var invoices = await _repositoryApInvoice.GetAllListAsync(
                s => s.SupplierId == supplierId && s.IsCanceled == false
            );
            var debitMemos = await _repositoryApDebitMemo.GetAllListAsync(
                d => d.SupplierId ==supplierId && d.IsInvoiceDebit == false
            );
            var allCurrencies = openingBalances.Select(o => o.CurrencyName)
                .Union(invoices.Select(i => i.CurrencyName))
                .Union(debitMemos.Select(c => c.CurrencyName))
                .Distinct()
                .ToList();
            var currencyInfo = await _repositoryCurrency.GetAllListAsync(c => allCurrencies.Contains(c.CurrencyName));
            var currencyRates = currencyInfo.ToDictionary(c => c.CurrencyName, c => c.BuyRate);

            var allStatementRecords = new List<StatementRecord>();
        
            foreach (var ob in openingBalances)
            {
                allStatementRecords.Add(new StatementRecord
                {
                    Type = "OpeningBalance",
                    SupplierName = supplier.Name,
                    AccountNumber = supplier.AccountNumber,
                    ContactPhone = supplier.ContactPersonPhone,
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
                if (inv.InvoiceDetails != null && inv.InvoiceDetails.Any())
                {
                    foreach (var detail in inv.InvoiceDetails)
                    {
                        allStatementRecords.Add(new StatementRecord
                        {
                            Type = "Invoice",
                            SupplierName = supplier.Name,
                            AccountNumber = supplier.AccountNumber,
                            ContactPhone = supplier.ContactPersonPhone,
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

                    allStatementRecords.Add(new StatementRecord
                    {
                        Type = "Payment",
                        SupplierName = supplier.Name,
                        AccountNumber = supplier.AccountNumber,
                        ContactPhone = supplier.ContactPersonPhone,
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

            foreach (var dm in debitMemos)
            {
                var suffix = dm.ModeOfPayment?.Equals("Cash", StringComparison.OrdinalIgnoreCase) == true
                    ? "/Cash"
                    : $"/{dm.ChequeNo}";
                allStatementRecords.Add(new StatementRecord
                {
                    Type = "DebitMemo",
                    SupplierName = supplier.Name,
                    AccountNumber =supplier.AccountNumber,
                    ContactPhone = supplier.ContactPersonPhone,
                    InvoiceNumber = $"DM/{dm.InvoiceNo}{suffix}",
                    InvoiceNo = dm.InvoiceNo,
                    InvoiceDate = dm.TransactionDate.ToString("dd-MMM-yyyy"),
                    TransactionDate = dm.TransactionDate,
                    TotalInvoiceAmount = dm.IsInvoiceDebit ? dm.Amount : -dm.Amount,
                    PaidAmount = dm.IsInvoiceDebit ? dm.Amount : 0m,
                    CurrencyName = dm.CurrencyName,
                    BuyRate = currencyRates.ContainsKey(dm.CurrencyName) ? currencyRates[dm.CurrencyName] : 1m,
                    PaymentDate = dm.TransactionDate.ToString("dd-MMM-yyyy"),
                    Description = dm.Description
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
                    case "DebitMemo" when rec.PaidAmount == 0m:
                        runningBalances[currency] += rec.TotalInvoiceAmount ?? 0m;
                        break;
                    case "DebitMemo":
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

            var bbfRecords = new List<StatementRecord>();
            foreach (var currency in allCurrencies)
            {
                beforeStart.TryGetValue(currency, out var lastRecord);
                var bbfDate = lastRecord?.TransactionDate ?? startDate.AddDays(-1);
                var bbfBalance = lastRecord?.Balance ?? 0m;
                bbfRecords.Add(new StatementRecord
                {
                    Type = "BBF",
                    SupplierName = supplier.Name,
                    AccountNumber =supplier.AccountNumber,
                    ContactPhone = supplier.ContactPersonPhone,
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
        public async Task<object> GetStatementByOu(Guid supplierId, Guid ouid, DateTime startDate, DateTime endDate)
        {
            var supplier = await _repositorySupplier.FirstOrDefaultAsync(s => s.Id == supplierId);

            var supplierInvoices = await _repositoryApInvoice.GetAllListAsync(s =>
            s.InvoiceDate >= startDate && s.InvoiceDate <= endDate &&
            s.SupplierId == supplierId && s.IsCanceled == false && s.OuId == ouid
        );

        var debitMemos = await _repositoryApDebitMemo.GetAllListAsync(d => d.SupplierId == supplierId &&
                                                                       d.TransactionDate >= startDate && d.TransactionDate <= endDate && d.OuId == ouid);
        var vouchers = await _repositoryVoucher.GetAllListAsync(v =>
            v.PaymentDate >= startDate &&
            v.PaymentDate <= endDate &&
            v.SupplierId == supplierId &&
            _repositoryApInvoice.GetAll().Any(i => i.Id.ToString() == v.InvoiceId && i.OuId == ouid));
        
        var payments =
            await _repositoryPayment.GetAllListAsync(u =>
                u.PaymentDate >= startDate && u.PaymentDate <= endDate && u.OuId == ouid
            );

        var paymentRecords =
            await _repositoryApInvoicePaymentRecords.GetAllListAsync(p =>
                p.PaymentDate >= startDate && p.PaymentDate <= endDate
            );

        var previousInvoices = await _repositoryApInvoice.GetAllListAsync(s =>
            s.InvoiceDate < startDate && s.SupplierId == supplierId && s.IsCanceled == false
        );

        var previousPayments = await _repositoryApInvoicePaymentRecords.GetAllListAsync(p =>
            p.PaymentDate < startDate && previousInvoices.Select(i => i.Id).Contains(p.InvoiceId)
        );

        var currencies = previousInvoices
            .Select(p => p.CurrencyName ?? "")
            .Union(supplierInvoices.Select(p => p.CurrencyName ?? ""))
            .Distinct()
            .ToList();

        var bbfPerCurrency = previousInvoices
            .GroupBy(inv => inv.CurrencyName ?? "")
            .ToDictionary(
                g => g.Key,
                g => g.Sum(inv => inv.TotalInvoiceAmount - inv.PaidAmount)
            );
        var records = new List<StatementRecord>();

        var unpaidDebitMemos = debitMemos
            .Where(dm => dm.Amount != 0 && dm.IsInvoiceDebit == false)
            .ToList();

        foreach (var debitMemo in unpaidDebitMemos)
        {
            records.Add(new StatementRecord
            {
                Type = "Invoice",
                ContactPerson = $"Contact: {supplier.PhoneNo}",
                SupplierName = $"Supplier: {debitMemo.SupplierName}",
                AccountNumber = debitMemo.AccountNo,
                InvoiceNumber = $"(DM/{debitMemo.Amount:F2})",
                InvoiceDate = debitMemo.TransactionDate.ToString("dd-MMM-yyyy"),
                Balance = 0m,
                TotalInvoiceAmount = 0m,
                OuName = debitMemo.OuName,
                PaidAmount = 0m,
                AmountPaid = 0m,
                Description = debitMemo.Description,
                PaymentDate = "",
                CurrencyName = debitMemo.CurrencyName
            });
        }

        var paidDebitMemos = debitMemos
            .Where(dm => paymentRecords.Any(pr => pr.PaymentId == dm.Id))
            .ToList();


        var paidVouchers = vouchers
            .Where(v => paymentRecords.Any(pr => pr.PaymentId == v.Id))
            .ToList();

        foreach (var invoice in supplierInvoices)
        {
            string description = "";
            var relatedPayments = paymentRecords
                .Where(p => p.InvoiceId == invoice.Id ||
                            paidDebitMemos.Any(dm => dm.Id == p.PaymentId && dm.InvoiceId == invoice.Id))
                .OrderBy(p => p.PaymentDate)
                .ToList();

            decimal runningBalance = invoice.TotalInvoiceAmount;

            if (!relatedPayments.Any())
            {
                records.Add(new StatementRecord
                {
                    Type = "Invoice",
                    ContactPerson = $"Contact: {supplier.PhoneNo}",
                    SupplierName = $"Supplier: {invoice.SupplierName}",
                    AccountNumber = $"Account No.: {invoice.AccountNumber}",
                    InvoiceNumber = invoice.InvoiceNumber,
                    InvoiceDate = invoice.InvoiceDate.ToString("dd-MMM-yyyy"),
                    Balance = runningBalance,
                    TotalInvoiceAmount = invoice.TotalInvoiceAmount,
                    PaidAmount = 0m,
                    AmountPaid = 0m,
                    OuName = invoice.OuName,
                    Description = invoice.InvoiceDetails.FirstOrDefault()?.Description ?? "",
                    PaymentDate = "",
                    CurrencyName = invoice.CurrencyName
                });
            }
            else
            {
                bool isFirstPayment = true;

                foreach (var payment in relatedPayments)
                {
                    var matchedPayment = payments.FirstOrDefault(p => p.Id == payment.PaymentId);
                    var matchedDebitMemo = debitMemos.FirstOrDefault(dm => dm.Id == payment.PaymentId);
                    var matchedVoucher = vouchers.FirstOrDefault(v => v.Id == payment.PaymentId);



                    if (matchedDebitMemo != null)
                    {
                        description = matchedDebitMemo.Description;
                    }

                    else if (matchedVoucher != null)
                    {
                        description = matchedVoucher.Description;
                    }
                    else if (matchedPayment != null)
                    {
                        description = "Invoice Payment";
                    }

                    else if (!relatedPayments.Any())
                    {
                        description = invoice.InvoiceDetails.FirstOrDefault()?.Description;
                    }

                    bool IsValidCheque(string chequeNumber)
                    {
                        return !string.IsNullOrWhiteSpace(chequeNumber) && chequeNumber != "00000000" &&
                               chequeNumber != "0";
                    }

                    bool IsValidDebitMemoCheque(string chequeNo)
                    {
                        return !string.IsNullOrWhiteSpace(chequeNo) && chequeNo != "00000000" && chequeNo != "0";
                    }

                    var chequePart = IsValidCheque(matchedPayment?.ChequeNumber)
                        ? matchedPayment.ChequeNumber
                        : IsValidDebitMemoCheque(matchedDebitMemo?.ChequeNo)
                            ? matchedDebitMemo.ChequeNo
                            : IsValidCheque(matchedVoucher?.ChequeNumber)
                                ? matchedVoucher.ChequeNumber
                                : "Cash";


                    string suffix = matchedDebitMemo != null
                        ? "/DM"
                        : matchedVoucher != null
                            ? "/PV"
                            : "";

                    runningBalance -= payment.Amount;

                    records.Add(new StatementRecord
                    {
                        Type = "Invoice",
                        ContactPerson = $"Contact: {supplier.PhoneNo}",
                        SupplierName = $"Supplier: {invoice.SupplierName}",
                        AccountNumber = $"Account No.: {invoice.AccountNumber}",
                        InvoiceNumber = $"{invoice.InvoiceNumber}/{chequePart}",
                        InvoiceDate = $"{invoice.InvoiceDate:dd-MMM-yyyy}{suffix}",
                        Balance = runningBalance,
                        TotalInvoiceAmount = isFirstPayment ? invoice.TotalInvoiceAmount : null,
                        PaidAmount = invoice.PaidAmount,
                        AmountPaid = payment.Amount,
                        OuName = invoice.OuName,
                        Description = description,
                        PaymentDate = payment.PaymentDate.ToString("dd-MMM-yyyy"),
                        CurrencyName = invoice.CurrencyName
                    });

                    isFirstPayment = false;
                }
            }
        }

        // FINAL RESULT
        var finalData = new List<StatementRecord>();

        foreach (var currency in currencies)
        {
            var bbf = bbfPerCurrency.ContainsKey(currency) ? bbfPerCurrency[currency] : 0m;

            // Invoice rows for this currency, sorted by InvoiceDate
            var currencyRows = records
                .Where(r => r.CurrencyName == currency)
                .OrderBy(r =>
                {
                    DateTime dt;
                    return DateTime.TryParse(r.InvoiceDate, out dt) ? dt : DateTime.MinValue;
                })
                .ToList();

            // Add BBF first
            finalData.Add(new StatementRecord
            {
                Type = "BBF",
                ContactPerson = $"Contact: {supplier.PhoneNo}",
                SupplierName = $"Supplier: {supplier.Name}",
                AccountNumber = $"Account No.: {supplier.AccountNumber}",
                InvoiceNumber = "Balance B/F",
                InvoiceDate = "",
                Balance = bbf,
                TotalInvoiceAmount = null,
                PaidAmount = null,
                OuName = "",
                AmountPaid = null,
                PaymentDate = "",
                CurrencyName = currency
            });

            // Add sorted invoices
            finalData.AddRange(currencyRows);

            //  Total row (last)
            var totalAmount = currencyRows.Sum(r => r.TotalInvoiceAmount ?? 0m);
            var totalPaid = currencyRows.Sum(r => r.PaidAmount ?? 0m);
            var totalApplied = currencyRows.Sum(r => r.AmountPaid ?? 0m);
            var totalBalance = currencyRows.Sum(r => r.Balance);
            decimal? outstanding = supplierInvoices.Sum(i => i.Balance);

            finalData.Add(new StatementRecord
            {
                Type = "Total :",
                ContactPerson = $"Contact: {supplier.PhoneNo}",
                SupplierName = $"Supplier: {supplier.Name}",
                AccountNumber = $"Account No.: {supplier.AccountNumber}",
                InvoiceNumber = "Total :",
                InvoiceDate = "",
                Balance = null,
                OuName = "",
                TotalInvoiceAmount = totalAmount,
                PaidAmount = totalPaid,
                AmountPaid = totalApplied,
                PaymentDate = "",
                CurrencyName = currency,
                Outstanding = outstanding,

            });
        }

        return new
        {
            data = finalData,
            summary = new[]
            {
                new { FinalOutstanding = finalData.Sum(r => r.Outstanding ?? 0m) }
            }
        };
        }

        public async Task<object> GetStatementByOuType2(Guid supplierId, Guid ouid, DateTime startDate, DateTime endDate)
        {
            var supplier = await _repositorySupplier.FirstOrDefaultAsync(s => s.Id == supplierId);

            var supplierInvoices = await _repositoryApInvoice.GetAllListAsync(
                s => s.InvoiceDate >= startDate && s.InvoiceDate <= endDate &&
                     s.SupplierId == supplierId && s.IsCanceled == false && s.OuId == ouid
            );
  
            var debitMemos = await _repositoryApDebitMemo.GetAllListAsync(
                d => d.SupplierId == supplierId &&
                     d.TransactionDate >= startDate &&
                     d.TransactionDate <= endDate && d.OuId == ouid
            );
            var vouchers = await _repositoryVoucher.GetAllListAsync(v =>
                v.PaymentDate >= startDate &&
                v.PaymentDate <= endDate &&
                v.SupplierId == supplierId &&
                _repositoryApInvoice.GetAll().Any(i => i.Id.ToString() == v.InvoiceId && i.OuId == ouid)
            );


            var payments = await _repositoryPayment.GetAllListAsync(
                u => u.PaymentDate >= startDate && u.PaymentDate <= endDate && u.OuId == ouid
            );

            var paymentRecords = await _repositoryApInvoicePaymentRecords.GetAllListAsync(
                p => p.PaymentDate >= startDate && p.PaymentDate <= endDate
            );

            var previousInvoices = await _repositoryApInvoice.GetAllListAsync(
                s => s.InvoiceDate < startDate && s.SupplierId == supplierId && s.IsCanceled == false
            );

            var previousPayments = await _repositoryApInvoicePaymentRecords.GetAllListAsync(
                p => p.PaymentDate < startDate && previousInvoices.Select(i => i.Id).Contains(p.InvoiceId)
            );

            var currencies = previousInvoices
                .Select(p => p.CurrencyName ?? "")
                .Union(supplierInvoices.Select(p => p.CurrencyName ?? ""))
                .Distinct()
                .ToList();
    
            var bbfPerCurrency = previousInvoices
                .GroupBy(inv => inv.CurrencyName ?? "")
                .ToDictionary(
                    g => g.Key,
                    g => g.Sum(inv => inv.TotalInvoiceAmount - inv.PaidAmount)
                );
            var records = new List<StatementRecord>();
    
            var unpaidDebitMemos = debitMemos
                .Where(dm => dm.Amount != 0 && dm.IsInvoiceDebit == false)
                .ToList();

            foreach (var debitMemo in unpaidDebitMemos)
            {
                records.Add(new StatementRecord
                {
                    Type = "Invoice",
                    ContactPerson = $"Contact: {supplier.ContactPerson}",
                    SupplierName = $"Supplier: {debitMemo.SupplierName}",
                    AccountNumber = debitMemo.AccountNo,
                    InvoiceNumber = $"(DM/{debitMemo.Amount:F2})",
                    InvoiceDate = debitMemo.TransactionDate.ToString("dd-MMM-yyyy"),
                    Balance = 0m, 
                    TotalInvoiceAmount = 0m,
                    OuName = debitMemo.OuName,
                    PaidAmount = 0m,
                    AmountPaid = 0m,
                    Description = debitMemo.Description,
                    PaymentDate = "",
                    CurrencyName = debitMemo.CurrencyName
                });
            }
            var paidDebitMemos = debitMemos
                .Where(dm => paymentRecords.Any(pr => pr.PaymentId == dm.Id))
                .ToList();

   
            var paidVouchers = vouchers
                .Where(v => paymentRecords.Any(pr => pr.PaymentId == v.Id))
                .ToList();

            foreach (var invoice in supplierInvoices)
            {
                string description = "";
                var relatedPayments = paymentRecords
                    .Where(p => p.InvoiceId == invoice.Id || 
                                paidDebitMemos.Any(dm => dm.Id == p.PaymentId && dm.InvoiceId == invoice.Id))
                    .OrderBy(p => p.PaymentDate)
                    .ToList();
       
                decimal runningBalance = invoice.TotalInvoiceAmount;

                if (!relatedPayments.Any())
                {
                    records.Add(new StatementRecord
                    {
                        Type = "Invoice",
                        ContactPerson = $"Contact: {supplier.ContactPerson}",
                        SupplierName = $"Supplier: {invoice.SupplierName}",
                        AccountNumber = $"Account No.: {invoice.AccountNumber}",
                        InvoiceNumber = invoice.InvoiceNumber,
                        InvoiceDate = invoice.InvoiceDate.ToString("dd-MMM-yyyy"),
                        Balance = runningBalance,
                        TotalInvoiceAmount = invoice.TotalInvoiceAmount,
                        PaidAmount = 0m,
                        AmountPaid = 0m,
                        OuName = invoice.OuName,
                        Description = invoice.InvoiceDetails.FirstOrDefault()?.Description ?? "",
                        PaymentDate = "",
                        CurrencyName = invoice.CurrencyName
                    });
                }
                else
                {
                    bool isFirstPayment = true;

                    foreach (var payment in relatedPayments)
                    {
                        var matchedPayment = payments.FirstOrDefault(p => p.Id == payment.PaymentId);
                        var matchedDebitMemo = debitMemos.FirstOrDefault(dm => dm.Id == payment.PaymentId);
                        var matchedVoucher = vouchers.FirstOrDefault(v => v.Id == payment.PaymentId);
                


                        if (matchedDebitMemo != null)
                        {
                            description = matchedDebitMemo.Description;
                        }

                        else if (matchedVoucher != null)
                        {
                            description = matchedVoucher.Description;
                        }
                        else if (matchedPayment != null)
                        {
                            description = "Invoice Payment";
                        }
                
                        else if (!relatedPayments.Any())
                        {
                            description = invoice.InvoiceDetails.FirstOrDefault()?.Description;
                        }

                        bool IsValidCheque(string chequeNumber)
                        {
                            return !string.IsNullOrWhiteSpace(chequeNumber) && chequeNumber != "00000000" && chequeNumber != "0";
                        }
                        bool IsValidDebitMemoCheque(string chequeNo)
                        {
                            return !string.IsNullOrWhiteSpace(chequeNo) && chequeNo != "00000000" && chequeNo != "0";
                        }

                        var chequePart = IsValidCheque(matchedPayment?.ChequeNumber)
                            ? matchedPayment.ChequeNumber
                            : IsValidDebitMemoCheque(matchedDebitMemo?.ChequeNo)
                                ? matchedDebitMemo.ChequeNo
                                : IsValidCheque(matchedVoucher?.ChequeNumber)
                                    ? matchedVoucher.ChequeNumber
                                    : "Cash";


                        string suffix = matchedDebitMemo != null
                            ? "/DM"
                            : matchedVoucher != null
                                ? "/PV"
                                : "";
                   
                        runningBalance -= payment.Amount;

                        records.Add(new StatementRecord
                        {
                            Type = "Invoice",
                            ContactPerson = $"Contact: {supplier.ContactPerson}",
                            SupplierName = $"Supplier: {invoice.SupplierName}",
                            AccountNumber = $"Account No.: {invoice.AccountNumber}",
                            InvoiceNumber = $"{invoice.InvoiceNumber}/{chequePart}",
                            InvoiceDate = $"{invoice.InvoiceDate:dd-MMM-yyyy}{suffix}",
                            Balance = runningBalance,
                            TotalInvoiceAmount = isFirstPayment ? invoice.TotalInvoiceAmount : null,
                            PaidAmount = invoice.PaidAmount,
                            AmountPaid = payment.Amount,
                            OuName = invoice.OuName,
                            Description = description,
                            PaymentDate = payment.PaymentDate.ToString("dd-MMM-yyyy"),
                            CurrencyName = invoice.CurrencyName
                        });

                        isFirstPayment = false;
                    }
                }
            }

            // FINAL RESULT
            var finalData = new List<StatementRecord>();

            foreach (var currency in currencies)
            {
                var bbf = bbfPerCurrency.ContainsKey(currency) ? bbfPerCurrency[currency] : 0m;

                // Invoice rows for this currency, sorted by InvoiceDate
                var currencyRows = records
                    .Where(r => r.CurrencyName == currency)
                    .OrderBy(r =>
                    {
                        DateTime dt;
                        return DateTime.TryParse(r.InvoiceDate, out dt) ? dt : DateTime.MinValue;
                    })
                    .ToList();

                // Add BBF first
                finalData.Add(new StatementRecord
                {
                    Type = "BBF",
                    ContactPerson = $"Contact: {supplier.ContactPerson}",
                    SupplierName = $"Supplier: {supplier.Name}",
                    AccountNumber = $"Account No.: {supplier.AccountNumber}",
                    InvoiceNumber = "Balance B/F",
                    InvoiceDate = "",
                    Balance = bbf,
                    TotalInvoiceAmount = null,
                    PaidAmount = null,
                    OuName = "",
                    AmountPaid = null,
                    PaymentDate = "",
                    CurrencyName = currency
                });

                // Add sorted invoices
                finalData.AddRange(currencyRows);

                //  Total row (last)
                var totalAmount = currencyRows.Sum(r => r.TotalInvoiceAmount ?? 0m);
                var totalPaid = currencyRows.Sum(r => r.PaidAmount ?? 0m);
                var totalApplied = currencyRows.Sum(r => r.AmountPaid ?? 0m);
                var totalBalance = currencyRows.Sum(r => r.Balance);
                decimal? outstanding = supplierInvoices.Sum(i => i.Balance);

                finalData.Add(new StatementRecord
                {
                    Type = "Total :",
                    ContactPerson = $"Contact: {supplier.ContactPerson}",
                    SupplierName = $"Supplier: {supplier.Name}",
                    AccountNumber = $"Account No.: {supplier.AccountNumber}",
                    InvoiceNumber = "Total :",
                    InvoiceDate = "",
                    Balance = null,
                    OuName = "",
                    TotalInvoiceAmount = totalAmount,
                    PaidAmount = totalPaid,
                    AmountPaid = totalApplied,
                    PaymentDate = "",
                    CurrencyName = currency,
                    Outstanding = outstanding,
            
                });
            }
            return new 
            {
                data = finalData,
                summary = new [] 
                {
                    new { FinalOutstanding = finalData.Sum(r => r.Outstanding ?? 0m) }
                }
            };

        }


        public async Task<object> GetAllInvoices()
        {
            var result = await _repositoryApInvoice.GetAllListAsync(i => i.IsCanceled == false);
            return result.Select(s => new
            {
                s.SupplierName,
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
            var result = await _repositoryApInvoice.GetAllListAsync(i => i.IsCanceled == true);
            return result.Select(s => new
            {
                s.SupplierName,
                s.InvoiceNumber,
                InvoiceDate = s.InvoiceDate.ToString("dd-MMM-yyyy"),
                s.Balance,
                s.PurchaseOrderNumber,
                s.TotalInvoiceAmount,
                s.PaidAmount,
                s.CurrencyName,
            }).ToList();
        }

        public async Task<object> GetInvoice(Guid supplierId)
        {
            var supplierInvoices = await _repositoryApInvoice.GetAllListAsync(s => s.SupplierId == supplierId && s.IsCanceled == false);
            var query = (supplierInvoices.Select(u1 => new
            {
                u1.SupplierName,
                u1.InvoiceNumber,
                InvoiceDate = u1.InvoiceDate.ToString("dd-MMM-yyyy"),
                u1.PurchaseOrderNumber,
                u1.TotalInvoiceAmount,
                u1.CurrencyName,
            })).ToList();

            return query;

        }
        
        public async Task<object> GetInvoiceByBatch(string batchNumber)
        {
            var supplierInvoices = await _repositoryApInvoice.GetAllListAsync(s => s.BatchNumber == batchNumber && s.IsCanceled == false);
            var query = supplierInvoices.Select(u1 => new
            {
                u1.SupplierName,
                u1.InvoiceNumber,
                InvoiceDate = u1.InvoiceDate.ToString("dd-MMM-yyyy"),
                u1.PurchaseOrderNumber,
                u1.TotalInvoiceAmount,
                u1.CurrencyName,
            }).ToList();

            return query;
        }
        
        public async Task<object> GetInvoiceByInvoiceNumber(string invoiceNumber)
        {
            var supplierInvoices = await _repositoryApInvoice.GetAllListAsync(s => s.InvoiceNumber == invoiceNumber && s.IsCanceled == false);
            var query = supplierInvoices.Select(u1 => new
            {
                u1.SupplierName,
                u1.InvoiceNumber,
                InvoiceDate = u1.InvoiceDate.ToString("dd-MMM-yyyy"),
                u1.PurchaseOrderNumber,
                u1.TotalInvoiceAmount,
                u1.CurrencyName,
            }).ToList();

            return query;
        }
        
        public async Task<object> GetInvoiceByRange(int startNumber, int endNumber)
        {
            // Validate that the range is valid
            if (startNumber < 0 || endNumber < startNumber)
            {
                throw new ArgumentException("Invalid range. The start number must be less than or equal to the end number.");
            }

            // Fetch all the invoices
            var supplierInvoices = await _repositoryApInvoice.GetAllListAsync(i => i.IsCanceled == false);

            // Fetch invoices by the specified range using LINQ
            var selectedInvoices = supplierInvoices
                .Skip(startNumber - 1) // Skip the first 'startNumber - 1' invoices to get the range
                .Take(endNumber - startNumber + 1) // Take the range of invoices (end - start + 1)
                .Select(u1 => new
                {
                    u1.SupplierName,
                    u1.InvoiceNumber,
                    InvoiceDate = u1.InvoiceDate.ToString("dd-MMM-yyyy"),
                    u1.PurchaseOrderNumber,
                    u1.TotalInvoiceAmount,
                    u1.CurrencyName,
                })
                .ToList();

            return selectedInvoices;
        }
        
        public async Task<object> GetInvoiceByDate(DateTime startDate, DateTime endDate)
        {
            var supplierInvoices = await _repositoryApInvoice.GetAllListAsync(s => s.InvoiceDate >= startDate && s.InvoiceDate <= endDate && s.IsCanceled == false);
            var query = supplierInvoices.Select(u1 => new
            {
                u1.SupplierName,
                u1.InvoiceNumber,
                InvoiceDate = u1.InvoiceDate.ToString("dd-MMM-yyyy"),
                u1.PurchaseOrderNumber,
                u1.TotalInvoiceAmount,
                u1.CurrencyName,
            }).ToList();

            return query;
        }
        
        public async Task<object> GetInvoiceReport(Guid id)
        {
            var invoice = await _repositoryApInvoice.FirstOrDefaultAsync(i => i.Id == id && i.IsCanceled == false);
            if (invoice == null)
            {
                return new { message = "Invoice not found." };
            }
            var supplier = await _repositorySupplier.FirstOrDefaultAsync(s => s.Id == invoice.SupplierId);
            if (supplier == null)
            {
                return new { message = "Supplier not found." };
            }
            var flattenedData = invoice.InvoiceDetails.Select(d => new
            {
                SupplierName = supplier.Name,
                SupplierAccountNumber = supplier.AccountNumber,
                SupplierAddress = supplier.Address,
                SupplierPhoneNo = supplier.PhoneNo,
                SupplierContactPerson = supplier.ContactPerson,
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
                AmountInWords = ConvertAmountToWords(invoice.TotalInvoiceAmount, invoice.CurrencyName, invoice.MinorName),
                Description = d.Description,
                Amount = d.Amount,
                ReferenceNumber = d.ReferenceNumber,
                Quantity = d.Quantity,
                SubTotal = d.SubTotal
            
            }).ToList();

            return new
            {
                data = flattenedData
            };
        }
        
        

        public async Task<dynamic> GetInvoiceDetails(Guid id)
        {
            var invoice = await _repositoryApInvoice.FirstOrDefaultAsync(i => i.Id == id && i.IsCanceled == false);
            if (invoice == null) return new { message = "Invoice not found." };
            var supplier = await _repositorySupplier.FirstOrDefaultAsync(s => s.Id == invoice.SupplierId);
            if (supplier == null) return new { message = "Supplier not found." };
            var invoiceDetails = (invoice.InvoiceDetails ?? new List<ApInvoiceDetail>())
                .Select((d, index) => new InvoiceDetailDto
                {
                    Index = index + 1,
                    Description = d.Description,
                    UnitPrice = d.UnitPrice,
                    ReferenceNumber = d.ReferenceNumber,
                    Quantity = d.Quantity,
                    Amount = d.Amount,
                    SubTotal = d.SubTotal
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
   
            var supplierInfo = new SupplierInfo
            {

                SupplierName = supplier.Name,
                AccountNumber = supplier.AccountNumber,
                SupplierAddress = supplier.Address,
                SupplierPhoneNo = supplier.PhoneNo,
                ContactPerson = supplier.ContactPerson,
                VatNumber = supplier.VatNumber,
                CreditLimit = supplier.CreditLimit,
                Email = supplier.Email,

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
                ReportHeader = reportHeader,
                SupplierInfo = supplierInfo,
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
                s.SupplierName,
                s.Amount,
                TransactionDate = s.TransactionDate.ToString("dd-MMM-yyyy"),
                s.CurrencyName,
                s.IsPosted
            }).ToList();
        }

        public async Task<object> GetOpeningBalancesBySupplier(Guid supplierId, string status)
        {
            var result = await _repositoryOpeningBalances.GetAllListAsync(s => s.SupplierId == supplierId);

            if (status == "posted")
                result = result.Where(s => s.IsPosted).ToList();
            else if (status == "unposted")
                result = result.Where(s => !s.IsPosted).ToList();
            else if (status == "all")
                result = result.ToList();
    

            return result.Select(s => new
            {
                s.SupplierName,
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
                s.SupplierName,
                s.IsPosted,
                s.CurrencyName,
                TransactionDate = s.TransactionDate.ToString("dd-MMM-yyyy"),
                Amount = s.BuyRate > 0 ? (s.Amount * defaultCurrency.BuyRate) / s.BuyRate : 0
            }).ToList();
        }

        public async Task<object> GetPayments()
        {
            var paymentRecords = await _repositoryApInvoicePaymentRecords
                .GetAll()
                /*.Where(p => p.IsPosted == true)*/
                .ToListAsync();

   
            var invoiceIds = paymentRecords.Select(p => p.InvoiceId).Distinct().ToList();
    
            var invoices = await _repositoryApInvoice.GetAll()
                .Where(i => invoiceIds.Contains(i.Id))
                .ToListAsync();
            var allPayments = (from p in paymentRecords
                join i in invoices on p.InvoiceId equals i.Id
                select new
                {
                    p.SupplierName,
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
        
        public async Task<object> GetPaymentsBySupplier(Guid supplierId)
        {
            var paymentRecords = await _repositoryApInvoicePaymentRecords
                .GetAll()
                /*.Where(p => p.IsPosted == true)*/
                .ToListAsync();

            var invoiceIds = paymentRecords.Select(p => p.InvoiceId).Distinct().ToList();

            var invoices = await _repositoryApInvoice.GetAll()
                .Where(i => invoiceIds.Contains(i.Id) && i.SupplierId == supplierId && i.IsCanceled == false)
                .ToListAsync();

            var allPayments = (from p in paymentRecords
                join i in invoices on p.InvoiceId equals i.Id
                select new
                {
                    i.SupplierName,
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
            var paymentRecords = await _repositoryApInvoicePaymentRecords
                .GetAll()
                .Where(p => p.PaymentDate >= startDate && p.PaymentDate <= endDate /*&& p.IsPosted == true*/)
                .ToListAsync();

            var invoiceIds = paymentRecords.Select(p => p.InvoiceId).Distinct().ToList();

            var invoices = await _repositoryApInvoice.GetAll()
                .Where(i => invoiceIds.Contains(i.Id) && i.IsCanceled == false)
                .ToListAsync();

            var allPayments = (from pr in paymentRecords
                join i in invoices on pr.InvoiceId equals i.Id
                select new
                {
                    i.SupplierName,
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
                    AmountToPay = pr.ConvertedAmount + pr.ConvertedWithheldAmount,
                    DaysToPayment = (pr.PaymentDate - i.InvoiceDate).Days,
                    TotalAmount = i.TotalInvoiceAmount,
                }).ToList();

            return new { data = allPayments };
        }
        
        public async Task<object> GetPaymentReceipts(Guid id)
        {
            var paymentRecords = await _repositoryApInvoicePaymentRecords
                .GetAllListAsync(i => i.PaymentId == id);

            var receipts = new List<PaymentReceipts>();
            foreach (var record in paymentRecords)
            {
                ApInvoice invoice = null;
                if (record.InvoiceId != Guid.Empty)
                {
                    invoice = await _repositoryApInvoice.FirstOrDefaultAsync(i => i.Id == record.InvoiceId);
                }
                ApPayment matchedPayment = null;
                if (record.PaymentId != Guid.Empty)
                {
                    matchedPayment = await _repositoryPayment.FirstOrDefaultAsync(p => p.Id == record.PaymentId && p.IsCanceled == false);
                }

                if (matchedPayment != null)
                    if (invoice != null)
                        receipts.Add(new PaymentReceipts
                        {
                            SupplierName = record.SupplierName,
                            PaymentDate = record.PaymentDate.ToString("dd-MMM-yyyy"),
                            ChequeNo = string.IsNullOrEmpty(matchedPayment?.ChequeNumber) ? "Cash" : matchedPayment.ChequeNumber,
                            AmountToApply = record.ConvertedAmount,
                            AmountToPay = matchedPayment.AmountToPay,
                            OutstandingCreditMemo = matchedPayment.OutstandingCreditMemo,
                            CurrencyName = record.CurrencyName,
                            ModeOfPayment = record.ModeOfPayment,
                            CurrencyCode = record.CurrencyCode,
                            TotalInvoiceAmount = invoice.TotalInvoiceAmount,
                            Rate = invoice.BuyRate,
                            BankName = record.BankName,
                            BankBranch = record.BankBranch,
                            AmountInWords =ConvertAmountToWords(matchedPayment.AmountToPay, matchedPayment.CurrencyName, matchedPayment.MinorName) + " to be applied to the following invoice(s): ",
                            InvoiceNumber = invoice?.InvoiceNumber ?? "N/A",
                            InvoiceType = invoice?.CurrencyCode ?? "N/A",
                            InvoiceDate = invoice.InvoiceDate.ToString("dd-MMM-yyyy"),
                            CreditGl = matchedPayment.BankAccountName,
                            DebitGl = invoice.LiabilityAccountName,
                            BatchNumber = matchedPayment.BatchNumber,
                            PayRate = matchedPayment.BuyRate
                        });
            }
            //sort receipts in invoicedate
            receipts = receipts.OrderBy(r => DateTime.Parse(r.InvoiceDate)).ToList();
            return receipts;
        }
        
         public async Task<object> GetPaymentReceipts(List<Guid> ids)
        {
    
            var paymentRecords = await _repositoryApInvoicePaymentRecords
                .GetAllListAsync(s => ids.Contains(s.PaymentId));

            var header = (await _repositoryCompanyProfile.GetAllListAsync())
            .Select(a => new
            {
            a.CompanyName,
            PrimaryPhoneNo = $"Tel: {a.PhoneNo}",
            a.Address,
            Email = $"Email: {a.Email}",
            ReportTitle = "AP PAYMENT RECEIPT",
            a.CompanyLogo,
            })
            .FirstOrDefault();

    var resultList = new List<object>();

    foreach (var s in paymentRecords)
    {
        ApInvoice invoice = null;
        if (s.InvoiceId != Guid.Empty)
        {
            invoice = await _repositoryApInvoice.FirstOrDefaultAsync(i => i.Id == s.InvoiceId);
        }
        ApPayment matchedPayment = null;
        if (s.PaymentId != Guid.Empty)
        {
            matchedPayment = await _repositoryPayment.FirstOrDefaultAsync(p => p.Id == s.PaymentId && p.IsCanceled == false);
        }

        
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
                    SupplierName = s.SupplierName,
                    PaymentDate = s.PaymentDate.ToString("dd-MMM-yyyy"),
                    ChequeNo = string.IsNullOrEmpty(matchedPayment?.ChequeNumber) ? "Cash" : matchedPayment.ChequeNumber,
                    AmountToApply = s.ConvertedAmount,
                    AmountToPay = matchedPayment.AmountToPay,
                    OutstandingCreditMemo = matchedPayment.OutstandingCreditMemo,
                    CurrencyName = s.CurrencyName,
                    ModeOfPayment = s.ModeOfPayment,
                    CurrencyCode = s.CurrencyCode,
                    TotalInvoiceAmount = invoice.TotalInvoiceAmount,
                    Rate = invoice.BuyRate,
                    BankName = s.BankName,
                    BankBranch = s.BankBranch,
                    AmountInWords =ConvertAmountToWords(matchedPayment.AmountToPay, matchedPayment.CurrencyName, matchedPayment.MinorName) + " to be applied to the following invoice(s): ",
                    InvoiceNumber = invoice?.InvoiceNumber ?? "N/A",
                    InvoiceType = invoice?.CurrencyCode ?? "N/A",
                    InvoiceDate = invoice.InvoiceDate.ToString("dd-MMM-yyyy"),
                    CreditGl = matchedPayment.BankAccountName,
                    DebitGl = invoice.LiabilityAccountName,
                    BatchNumber = matchedPayment.BatchNumber,
                    PayRate = matchedPayment.BuyRate
                });
        
    }
  
    //sort by invoice date
    resultList = resultList.OrderBy(r => DateTime.Parse(((dynamic)r).InvoiceDate)).ToList();
    return resultList;
   
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
        public async Task<object> GetVouchers()
        {
            var result = await _repositoryVoucher.GetAllListAsync();
            return result.Select(s => new
            {
                s.SupplierName,
                s.InvoiceNumber,
                s.InvoiceAmount,
                PaymentDate = s.PaymentDate.ToString("dd-MMM-yyyy"),
                s.Balance,
                s.VoucherNumber,
                VoucherEntryDate = s.VoucherEntryDate.ToString("dd-MMM-yyyy"),
                s.ModeOfPayment,
                s.PaymentAmount,
                s.CurrencyCode,
                s.PayCurrencyCode,
                s.ChequeNumber,
                s.VATRate,
                s.NHILRate,
                s.GETFLRate,
                s.Total,
                s.WithHeld,
                s.VATAmount,
                s.NetAmount,
                s.VATWithHeld,
                s.WithHoldingRate,
                s.TotalTaxAmount,
                s.BankName,
                s.BankBranchCode,
            }).ToList();
            
        }
        public async Task<object> GetVouchersBySupplier(Guid supplierId)
        {
            var result = await _repositoryVoucher.GetAllListAsync(s => s.SupplierId == supplierId);
            return result.Select(s => new
            {
                s.SupplierName,
                s.InvoiceNumber,
                s.InvoiceAmount,
                PaymentDate = s.PaymentDate.ToString("dd-MMM-yyyy"),
                s.Balance,
                s.VoucherNumber,
                VoucherEntryDate = s.VoucherEntryDate.ToString("dd-MMM-yyyy"),
                s.ModeOfPayment,
                s.PaymentAmount,
                s.CurrencyCode,
                s.PayCurrencyCode,
                s.ChequeNumber,
                s.VATRate,
                s.NHILRate,
                s.GETFLRate,
                s.Total,
                s.WithHeld,
                s.VATAmount,
                s.NetAmount,
                s.VATWithHeld,
                s.WithHoldingRate,
                s.TotalTaxAmount,
                s.BankName,
                s.BankBranchCode,
            }).ToList();
        }
        public async Task<object> GetVouchersByDate(DateTime startDate, DateTime endDate)
        {
            var result = await _repositoryVoucher.GetAllListAsync(s => s.VoucherEntryDate >= startDate && s.VoucherEntryDate <= endDate);
            return result.Select(s => new
            {
                s.SupplierName,
                s.InvoiceNumber,
                s.InvoiceAmount,
                PaymentDate = s.PaymentDate.ToString("dd-MMM-yyyy"),
                s.Balance,
                s.VoucherNumber,
                VoucherEntryDate = s.VoucherEntryDate.ToString("dd-MMM-yyyy"),
                s.ModeOfPayment,
                s.PaymentAmount,
                s.CurrencyCode,
                s.PayCurrencyCode,
                s.ChequeNumber,
                s.VATRate,
                s.NHILRate,
                s.GETFLRate,
                s.Total,
                s.WithHeld,
                s.VATAmount,
                s.NetAmount,
                s.VATWithHeld,
                s.WithHoldingRate,
                s.TotalTaxAmount,
                s.BankName,
                s.BankBranchCode,
            }).ToList();
        }
        public async Task<object> GetVoucherByInvoice(string invoiceId)
        {
            var result = await _repositoryVoucher.GetAllListAsync(s => s.InvoiceId == invoiceId);
            return result.Select(s => new
            {
                s.SupplierName,
                s.Description,
                s.InvoiceNumber,
                s.InvoiceAmount,
                PaymentDate = s.PaymentDate.ToString("dd-MMM-yyyy"),
                s.Balance,
                s.VoucherNumber,
                VoucherEntryDate = s.VoucherEntryDate.ToString("dd-MMM-yyyy"),
                s.ModeOfPayment,
                s.PaymentAmount,
                s.CurrencyCode,
                s.PayCurrencyCode,
                s.ChequeNumber,
                s.VATRate,
                s.NHILRate,
                s.GETFLRate,
                s.Total,
                s.WithHeld,
                s.VATAmount,
                s.NetAmount,
                s.VATWithHeld,
                s.WithHoldingRate,
                s.TotalTaxAmount,
                s.BankName,
                s.BankBranchCode,
            }).ToList();
        }
        public async Task<object> GetVoucherDetails(Guid voucherId)
        {
            var result = await _repositoryVoucher.GetAllListAsync(s => s.Id == voucherId);
            var relatedInvoice = await _repositoryApInvoice.FirstOrDefaultAsync(i => i.Id.ToString() == result.FirstOrDefault().InvoiceId);
            return result.Select(s => new
            {
                s.SupplierName,
                s.Description,
                s.InvoiceNumber,
                s.InvoiceAmount,
                PaymentDate = s.PaymentDate.ToString("dd-MMM-yyyy"),
                s.Balance,
                s.VoucherNumber,
                VoucherEntryDate = s.VoucherEntryDate.ToString("dd-MMM-yyyy"),
                s.ModeOfPayment,
                s.PaymentAmount,
                s.CurrencyCode,
                s.PayCurrencyCode,
                s.ChequeNumber,
                s.Total,
                s.WithHeld,
                s.VATAmount,
                s.NetAmount,
                s.VATWithHeld,
                s.TotalTaxAmount,
                s.BankName,
                s.BankBranchCode,
                s.LiabilityAccountName,
                s.BankAccountName,
                s.BatchNumber,
                s.isWithHolding,
                s.WithHoldingRate,
                relatedInvoice.OuName,
                s.ReferenceNumber,
                AmountInWords = ConvertAmountToWords(s.NetAmount, s.PayCurrencyName, s.MinorName),

            }).ToList();
        }
        public async Task<object> GetPaymentVoucher(Guid id)
        {
            var result = await _repositoryVoucher.GetAllListAsync(s => s.Id == id);
            var relatedInvoice = await _repositoryApInvoice.FirstOrDefaultAsync(i => i.Id.ToString() == result.FirstOrDefault().InvoiceId);
            return result.Select(s => new
            {
                s.SupplierName,
                s.Description,
                s.InvoiceNumber,
                s.InvoiceAmount,
                PaymentDate = s.PaymentDate.ToString("dd-MMM-yyyy"),
                s.Balance,
                s.VoucherNumber,
                VoucherEntryDate = s.VoucherEntryDate.ToString("dd-MMM-yyyy"),
                s.ModeOfPayment,
                s.PaymentAmount,
                s.CurrencyCode,
                s.PayCurrencyCode,
                s.ChequeNumber,
                s.Total,
                s.WithHeld,
                s.VATAmount,
                s.NetAmount,
                s.VATWithHeld,
                s.TotalTaxAmount,
                s.BankName,
                s.BankBranchCode,
                s.LiabilityAccountName,
                s.BankAccountName,
                s.BatchNumber,
                s.isWithHolding,
                s.WithHoldingRate,
                relatedInvoice.OuName,
                s.ReferenceNumber,
                AmountInWords = ConvertAmountToWords(s.NetAmount, s.PayCurrencyName, s.MinorName),

            }).ToList();
        }
      public async Task<object> GetPaymentVouchers(List<Guid> ids)
{
    var vouchers = await _repositoryVoucher
        .GetAllListAsync(s => ids.Contains(s.Id));

    var header = (await _repositoryCompanyProfile.GetAllListAsync())
        .Select(a => new
        {
            a.CompanyName,
            PrimaryPhoneNo = $"Tel: {a.PhoneNo}",
            a.Address,
            Email = $"Email: {a.Email}",
            ReportTitle = "AP PAYMENT VOUCHERS",
            a.CompanyLogo,
        })
        .FirstOrDefault();

    var resultList = new List<object>();

    foreach (var s in vouchers)
    {
        var relatedInvoice = await _repositoryApInvoice
            .FirstOrDefaultAsync(i => i.Id.ToString() == s.InvoiceId);

        resultList.Add(new
        {
            // 🔥 HEADER (same for every row)
            CompanyName = header?.CompanyName,
            PrimaryPhoneNo = header?.PrimaryPhoneNo,
            Address = header?.Address,
            Email = header?.Email,
            ReportTitle = header?.ReportTitle,
            CompanyLogo = header?.CompanyLogo,

            // 🔥 VOUCHER DATA
            Id = s.Id,
            SupplierName = s.SupplierName,
            Description = s.Description,
            InvoiceNumber = s.InvoiceNumber,
            InvoiceAmount = s.InvoiceAmount,
            PaymentDate = s.PaymentDate.ToString("dd-MMM-yyyy"),
            Balance = s.Balance,
            VoucherNumber = s.VoucherNumber,
            VoucherEntryDate = s.VoucherEntryDate.ToString("dd-MMM-yyyy"),
            ModeOfPayment = s.ModeOfPayment,
            PaymentAmount = s.PaymentAmount,
            CurrencyCode = s.CurrencyCode,
            PayCurrencyCode = s.PayCurrencyCode,
            ChequeNumber = s.ChequeNumber,
            Total = s.Total,
            WithHeld = s.WithHeld,
            VATAmount = s.VATAmount,
            NetAmount = s.NetAmount,
            VATWithHeld = s.VATWithHeld,
            TotalTaxAmount = s.TotalTaxAmount,
            BankName = s.BankName,
            BankBranchCode = s.BankBranchCode,
            LiabilityAccountName = s.LiabilityAccountName,
            BankAccountName = s.BankAccountName,
            BatchNumber = s.BatchNumber,
            isWithHolding = s.isWithHolding,
            WithHoldingRate = s.WithHoldingRate,
            OuName = relatedInvoice?.OuName,
            ReferenceNumber = s.ReferenceNumber,
            AmountInWords = ConvertAmountToWords(s.NetAmount, s.PayCurrencyName, s.MinorName),
        });
    }

    return resultList;
}
        
        public async Task<object> GetAgingSummary(DateTime startDate, int agingInterval)
        {
            var invoices = await _repositoryApInvoice.GetAllListAsync(i =>
                !i.IsCanceled && i.IsPosted);

            // Group invoices by Supplier and Currency, then calculate aging buckets
            var agingSummary = invoices
                .GroupBy(i => new { i.SupplierName, i.CurrencyName })
                .Select(g => new
                {
                    g.Key.SupplierName,
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
        public async Task<object>GetAgeingBySupplier(Guid supplierId, DateTime startDate, int agingInterval)
        {
            var invoices = await _repositoryApInvoice.GetAllListAsync(i =>
                !i.IsCanceled && i.IsPosted && i.SupplierId == supplierId);
            var agingSummary = invoices.Select(i => new
            {
                i.CurrencyCode,
                i.SupplierName,
                i.AccountNumber,
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
            }).OrderBy(i => i.CurrencyCode).ToList();
            return new { Invoices = agingSummary };
        }
        public async Task<object>GetAgeingByDate(DateTime startDate, int agingInterval)
        {
            var invoices = await _repositoryApInvoice.GetAllListAsync(i =>
                !i.IsCanceled && i.IsPosted);
            var agingSummary = invoices.Select(i => new
            {
                i.CurrencyCode,
                i.SupplierName,
                i.AccountNumber,
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
            }).OrderBy(i => i.CurrencyCode).ToList();
            return new { Invoices = agingSummary };
        }
        public async Task<object> GetDebitMemo()
        {
            var result = await _repositoryApDebitMemo.GetAllListAsync();
            return result.Select(s => new
                {
                    s.SupplierName,
                    s.InvoiceNo,
                    TransactionDate = s.TransactionDate.ToString("dd-MMM-yyyy"),
                    s.InvoiceBalance,
                    s.InvoiceCurrencyName,
                    s.Amount,
                    s.OuName,
                    s.CurrencyName,
                    IsInvoiceDebit = s.IsInvoiceDebit ? "Yes" : "No"
                })
                .OrderBy(i => i.CurrencyName)
                .ToList();
        }
        public async Task<object> GetGlTransaction(DateTime startDate, DateTime endDate, bool isMultiCurrency)
        {
            var start = startDate.Date;
            var end = endDate.Date.AddDays(1).AddTicks(-1);
    
            var journals = await _repositoryJournal.GetAll()
                .Where(j => j.BatchDate >= start 
                            && j.BatchDate <= end 
                            && j.TransactionSource == "AP")
                .ToListAsync();

            var journalIds = journals.Select(j => j.Id).ToList();

            var journalDetails = await _repositoryJournalDetail.GetAll()
                .Where(d => journalIds.Contains(d.JournalId) && d.IsMultiCurrency == isMultiCurrency)
                .ToListAsync();

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
                // 🔽 Order by batch number, then ensure credit comes before debit
                .OrderBy(x => x.BatchNumber)
                .ThenByDescending(x => x.CreditAmount > 0)
                .ThenBy(x => x.AccountName)
                .ToList();

            return new
            {
                code = 200,
                message = "GL transaction details retrieved successfully",
                data = result
            };
        }
    }
    
}
