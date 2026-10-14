using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Abp.Domain.Repositories;
using Abp.Linq.Expressions;
using Abp.UI;
using Microsoft.EntityFrameworkCore;
using TopazERP.DomainServices.Ledger.Reports.Dto;
using TopazERP.Models.Ledger;
using TopazERP.Models.Shared;

namespace TopazERP.DomainServices.Ledger.Reports
{
   public class ReportManager : Abp.Domain.Services.DomainService, IReportManager
    {

        private readonly IRepository<CompanyProfile, Guid> _repositoryCompanyProfile;
        private readonly IRepository<BankAccount, Guid> _repositoryBankAccount;
        private readonly IRepository<Journal, Guid> _repositoryJournal;
        private readonly IRepository<JournalDetail, Guid> _repositoryJournalDetail;
        private readonly IRepository<DeletedJournal, Guid> _repositoryDeletedJournal;
        private readonly IRepository<CoaDetail, Guid> _repositoryCoaDetail;

        public ReportManager(IRepository<CompanyProfile, Guid> repositoryCompanyProfile, IRepository<Journal, Guid> repositoryJournal, IRepository<DeletedJournal, Guid> repositoryDeletedJournal, IRepository<CoaDetail, Guid> repositoryCoaDetail, IRepository<JournalDetail, Guid> repositoryJournalDetail, IRepository<BankAccount, Guid> repositoryBankAccount)
        {
            _repositoryCompanyProfile = repositoryCompanyProfile;
            _repositoryJournal = repositoryJournal;
            _repositoryDeletedJournal = repositoryDeletedJournal;
            _repositoryCoaDetail = repositoryCoaDetail;
            _repositoryJournalDetail = repositoryJournalDetail;
            _repositoryBankAccount = repositoryBankAccount;
        }

        public async Task<object> GetReportHeader(string title)
        {
            var datta = await _repositoryCompanyProfile.GetAllListAsync();
            
            return datta.Select(a => new { a.CompanyName, a.CompanyLogo, PrimaryPhoneNo = $"Tel: {a.PhoneNo}", a.Address, Email = $"Email: {a.Email}", ReportTitle = title }).ToList();
        }

        
        public async Task<object> GenerateGlTransactionReports(GlTransactionReportDto dto)
        {
            // preliminary checks ...
            if (dto.ReportType.Equals("bank-report"))
            {
                var bankAccountInfo = await _repositoryBankAccount.FirstOrDefaultAsync(a => a.AccountId == dto.AccountId);
        
                if (bankAccountInfo == null)
                {
                    return new
                    {
                        message = $"The GL Account {dto.AccountName} is not tied to any bank account. Cannot generate bank report.",
                        success = false,
                        code = 1,
                    };
                }
            }
            
            // Validate date range
            if (dto.StartDate.HasValue && dto.EndDate.HasValue)
            {
                if (dto.StartDate.Value > dto.EndDate.Value)
                {
                    return new
                    {
                        message = "Start date cannot be later than end date.",
                        success = false,
                        code = 1
                    };
                }
            }
            

            
            
            var predicate = PredicateBuilder.New<JournalDetail>(x => !x.IsDeleted && x.IsPosted);

            // Filter by period end date (as provided by UI payload)
            
            if (dto.StartDate.HasValue)
            {
                predicate.And(x => x.BatchDate >= dto.StartDate.Value);
            }
            
            if (dto.EndDate.HasValue)
            {
                predicate.And(x => x.BatchDate <= dto.EndDate.Value);
            }

            // Filter by OU (Cost Center)
            if (dto.OuId != Guid.Empty)
            {
                predicate.And(x => x.OuId == dto.OuId);
            }

            // Filter by account
            if (dto.AccountId != Guid.Empty)
            {
                predicate.And(x => x.AccountId == dto.AccountId);
            }

            // Filter by batch number (if provided)
            if (!string.IsNullOrWhiteSpace(dto.BatchNo))
            {
                predicate.And(x => x.BatchNumber == dto.BatchNo);
            }

            decimal openingBalance = 0;
            
            // perform customized operations based on the report type
            switch (dto.ReportType)
            {
                case "account":
                case "bank-report":
                    // compute opening balance for that account as at the end date
                    // dont run for a closed period 
                    // check if the date range falls within a closed period. if yes , abort and return a message to the user, if not continue
                    var balanceQuery = _repositoryJournalDetail.GetAll().Where(x => !x.IsDeleted && x.IsPosted && x.AccountId == dto.AccountId);

                    if (dto.EndDate.HasValue)
                    {
                        balanceQuery = balanceQuery.Where(x => x.BatchDate <= dto.EndDate.Value);
                    }

                    if (dto.OuId != Guid.Empty)
                    {
                        balanceQuery = balanceQuery.Where(x => x.OuId == dto.OuId);
                    }

                    openingBalance = await balanceQuery.SumAsync(x =>
                        (dto.JournalEntryType == "foreign" && x.BuyRate > 0
                            ? x.DebitAmount / x.BuyRate
                            : x.DebitAmount)
                        -
                        (dto.JournalEntryType == "foreign" && x.BuyRate > 0
                            ? x.CreditAmount / x.BuyRate
                            : x.CreditAmount)
                    );
                    break;
                
                case "prior-account":
                    // check if the date range falls within the current accounting period, if yes abort and return a message to the user
                    break;

            }
            
            var transactions = await _repositoryJournalDetail.GetAllListAsync(predicate);

            
            if (dto.ReportType.Equals("account") ||  dto.ReportType.Equals("bank-report"))
            {
                //sort the transactionList by transaction date and preprocess the ending balance for each row 
                var sortedTransactions = transactions.OrderBy(t => t.TransactionDate).ToList();

                var transactionList = new List<TransactionReportItem>();
                
                decimal totalTransactionEffect = sortedTransactions.Sum(t =>
                    (dto.JournalEntryType == "foreign" && t.BuyRate > 0
                        ? t.DebitAmount / t.BuyRate
                        : t.DebitAmount)
                    -
                    (dto.JournalEntryType == "foreign" && t.BuyRate > 0
                        ? t.CreditAmount / t.BuyRate
                        : t.CreditAmount)
                );
                decimal runningBalance = openingBalance - totalTransactionEffect;

                foreach (var transaction in sortedTransactions)
                {
                    // Calculate adjusted debit/credit amounts for foreign journal entry type
                    var debitAmount = dto.JournalEntryType == "foreign" && transaction.BuyRate > 0
                        ? transaction.DebitAmount / transaction.BuyRate
                        : transaction.DebitAmount;

                    var creditAmount = dto.JournalEntryType == "foreign" && transaction.BuyRate > 0
                        ? transaction.CreditAmount / transaction.BuyRate
                        : transaction.CreditAmount;

                    // Calculate the running balance (opening balance + net effect of current transaction)
                    decimal transactionEffect = debitAmount - creditAmount;
                    runningBalance += transactionEffect;

                    if (dto.ReportType.Equals("bank-report"))
                    {
                        // For bank reports, use deposit/withdrawal structure
                        transactionList.Add(new TransactionReportItem
                        {
                            BatchNumber = transaction.BatchNumber,
                            AccountId = transaction.AccountId,
                            AccountName = transaction.AccountName,
                            ChequeNo = transaction.ChequeNo ?? "",
                            Deposit = debitAmount, // Debits are deposits for bank accounts (adjusted)
                            Withdrawal = creditAmount, // Credits are withdrawals for bank accounts (adjusted)
                            Description = transaction.Description,
                            Date = transaction.TransactionDate.ToString("dd-MMM-yyyy"),
                            Source = transaction.TransactionSource,
                            RefNo = !string.IsNullOrEmpty(transaction.ChequeNo) ? transaction.ChequeNo : transaction.ReferenceNumber,
                            OrganizationalUnit = transaction.OuName,
                            EndingBalance = runningBalance,
                            Month = $"Month: {transaction.TransactionDate:MMMM}",
                            MonthIndex = transaction.TransactionDate.Month,
                            Year = $"Year: {transaction.TransactionDate.Year}"
                        });
                    }
                    else
                    {
                        // For regular account reports, use the existing structure
                        transactionList.Add(new TransactionReportItem
                        {
                            BatchNo = transaction.BatchNumber,
                            Date = transaction.TransactionDate.ToString("dd-MMM-yyyy"),
                            Description = transaction.Description,
                            OuName = transaction.OuName,
                            Source = transaction.TransactionSource,
                            RefNo = !string.IsNullOrEmpty(transaction.ChequeNo) ? transaction.ChequeNo : transaction.ReferenceNumber,
                            ChequeNo = transaction.ChequeNo,
                            Debit = debitAmount,
                            Credit = creditAmount,
                            EndingBalance = runningBalance,
                            Year = $"Year: {transaction.TransactionDate.Year}",
                            MonthIndex = transaction.TransactionDate.Month,
                            Month = $"Month: {transaction.TransactionDate:MMMM}",
                        });
                    }
                }
                
                return new 
                { 
                    OpeningBalance = new
                    {
                        openingBalance,
                        obDisplayText = $"Opening Balance: ({openingBalance:F2}) — G/L No.: {dto.AccountName}",
                        dto.AccountName
                    }, 
                    Transactions = transactionList
                };
            }


            if (dto.ReportType.Equals("batch-numbers"))
            {
                var bnTransactionList = transactions.Where(a=> !string.IsNullOrEmpty(a.BatchNumber))
                    .OrderBy(t => t.TransactionDate)
                    .Select(t => new TransactionReportItem
                    {
                        BatchNo = t.BatchNumber,
                        BatchNumber = $"Batch Number: {t.BatchNumber}",
                        Date = t.TransactionDate.ToString("dd-MMM-yyyy"),
                        Description = t.Description,
                        AccountId = t.AccountId,
                        AccountName = t.AccountName,
                        OuName = t.OuName,
                        Source = t.TransactionSource,
                        OrganizationalUnit = t.OuName,
                        CreatedAt = t.CreationTime.ToString("dd-MMM-yyyy"),
                        RefNo = !string.IsNullOrEmpty(t.ChequeNo) ? t.ChequeNo : t.ReferenceNumber,
                        Debit = (dto.JournalEntryType == "foreign" && t.BuyRate > 0 ? t.DebitAmount / t.BuyRate : t.DebitAmount),
                        Credit = (dto.JournalEntryType == "foreign" && t.BuyRate > 0 ? t.CreditAmount / t.BuyRate : t.CreditAmount),
                        EndingBalance = openingBalance - Math.Abs(
                            (dto.JournalEntryType == "foreign" && t.BuyRate > 0 ? t.DebitAmount / t.BuyRate : t.DebitAmount)
                            -
                            (dto.JournalEntryType == "foreign" && t.BuyRate > 0 ? t.CreditAmount / t.BuyRate : t.CreditAmount)
                        ),
                        Year = $"{t.TransactionDate.Year}",
                        MonthIndex = t.TransactionDate.Month,
                        Month = t.TransactionDate.ToString("MMMM"),
                    })
                    .ToList();

                return bnTransactionList;
            }
            
            if (dto.ReportType.Equals("no-batch-numbers"))
            {
                var nbnTransactionList = transactions.Where(a=> string.IsNullOrEmpty(a.BatchNumber))
                    .OrderBy(t => t.TransactionDate)
                    .Select(t => new TransactionReportItem
                    {
                        BatchNo = t.BatchNumber,
                        BatchNumber = $"Batch Number: {t.BatchNumber}",
                        Date = t.TransactionDate.ToString("dd-MMM-yyyy"),
                        Description = t.Description,
                        AccountId = t.AccountId,
                        AccountName = t.AccountName,
                        OuName = t.OuName,
                        Source = t.TransactionSource,
                        OrganizationalUnit = t.OuName,
                        CreatedAt = t.CreationTime.ToString("dd-MMM-yyyy"),
                        RefNo = !string.IsNullOrEmpty(t.ChequeNo) ? t.ChequeNo : t.ReferenceNumber,
                        Debit = (dto.JournalEntryType == "foreign" && t.BuyRate > 0 ? t.DebitAmount / t.BuyRate : t.DebitAmount),
                        Credit = (dto.JournalEntryType == "foreign" && t.BuyRate > 0 ? t.CreditAmount / t.BuyRate : t.CreditAmount),
                        EndingBalance = openingBalance - Math.Abs((dto.JournalEntryType == "foreign" && t.BuyRate > 0 ? t.DebitAmount / t.BuyRate : t.DebitAmount) - (dto.JournalEntryType == "foreign" && t.BuyRate > 0 ? t.CreditAmount / t.BuyRate : t.CreditAmount)),
                        Year = $"{t.TransactionDate.Year}",
                        MonthIndex = t.TransactionDate.Month,
                        Month = t.TransactionDate.ToString("MMMM"),
                    })
                    .ToList();

                return nbnTransactionList;
            }
            

            if (dto.ReportType.Equals("unbalanced-transactions"))
            {
                // Find journals where total debits don't equal total credits
                var unbalancedJournals = await _repositoryJournalDetail.GetAll()
                    .Where(predicate)
                    .GroupBy(jd => new { jd.BatchNumber, jd.TransactionDate, jd.OuId, jd.OuName })
                    .Select(g => new
                    {
                        g.Key.BatchNumber,
                        g.Key.TransactionDate,
                        g.Key.OuId,
                        g.Key.OuName,
                        TotalDebits = g.Sum(jd => (dto.JournalEntryType == "foreign" && jd.BuyRate > 0 ? jd.DebitAmount / jd.BuyRate : jd.DebitAmount)),
                        TotalCredits = g.Sum(jd => (dto.JournalEntryType == "foreign" && jd.BuyRate > 0 ? jd.CreditAmount / jd.BuyRate : jd.CreditAmount)),
                        Difference = g.Sum(jd => (dto.JournalEntryType == "foreign" && jd.BuyRate > 0 ? jd.DebitAmount / jd.BuyRate : jd.DebitAmount))
                                     - g.Sum(jd => (dto.JournalEntryType == "foreign" && jd.BuyRate > 0 ? jd.CreditAmount / jd.BuyRate : jd.CreditAmount)),
                        TransactionCount = g.Count(),
                        JournalDetails = g.ToList()
                    })
                    .Where(g => Math.Abs(g.Difference) > 0.01m) // Allow for small rounding differences
                    .OrderBy(g => g.TransactionDate)
                    .ThenBy(g => g.BatchNumber)
                    .ToListAsync();

                var unbalancedTransactionList = new List<object>();
        
                foreach (var journal in unbalancedJournals)
                {
                    // Add summary record for the unbalanced journal
                    unbalancedTransactionList.Add(new
                    {
                        BatchNo = journal.BatchNumber,
                        BatchNumber = $"Batch Number: {journal.BatchNumber}",
                        Date = journal.TransactionDate.ToString("dd-MMM-yyyy"),
                        Description = $"UNBALANCED JOURNAL - Difference: {journal.Difference:N2}",
                        AccountName = "MULTIPLE ACCOUNTS",
                        OuName = journal.OuName,
                        OrganizationalUnit = journal.OuName,
                        Source = "SYSTEM",
                        RefNo = "",
                        Debit = journal.TotalDebits,
                        Credit = journal.TotalCredits,
                        Difference = journal.Difference,
                        TransactionCount = journal.TransactionCount,
                        Year = journal.TransactionDate.Year.ToString(),
                        MonthIndex = journal.TransactionDate.Month,
                        Month = journal.TransactionDate.ToString("MMMM"),
                        IsUnbalancedSummary = true
                    });

                    // Add individual transaction details for this unbalanced journal
                    foreach (var detail in journal.JournalDetails.OrderBy(d => d.AccountName))
                    {
                        unbalancedTransactionList.Add(new TransactionReportItem
                        {
                            BatchNo = detail.BatchNumber,
                            Date = detail.TransactionDate.ToString("dd-MMM-yyyy"),
                            Description = detail.Description,
                            AccountId = detail.AccountId,
                            AccountName = detail.AccountName,
                            OuName = detail.OuName,
                            Source = detail.TransactionSource,
                            OrganizationalUnit = detail.OuName,
                            CreatedAt = detail.CreationTime.ToString("dd-MMM-yyyy"),
                            RefNo = !string.IsNullOrEmpty(detail.ChequeNo) ? detail.ChequeNo : detail.ReferenceNumber,
                            Debit = (dto.JournalEntryType == "foreign" && detail.BuyRate > 0 ? detail.DebitAmount / detail.BuyRate : detail.DebitAmount),
                            Credit = (dto.JournalEntryType == "foreign" && detail.BuyRate > 0 ? detail.CreditAmount / detail.BuyRate : detail.CreditAmount),
                            Year = detail.TransactionDate.Year.ToString(),
                            MonthIndex = detail.TransactionDate.Month,
                            Month = detail.TransactionDate.ToString("MMMM"),
                        });
                    }
                }

                return new
                {
                    Summary = new
                    {
                        TotalUnbalancedJournals = unbalancedJournals.Count,
                        TotalDifferenceAmount = unbalancedJournals.Sum(j => Math.Abs(j.Difference)),
                        ReportType = "Unbalanced Transactions Report"
                    },
                    Transactions = unbalancedTransactionList
                };
            }
            
            
            if (dto.ReportType.Equals("unmatched-ous"))
            {
                // Find journals where transactions within the same batch have different or missing OUs
                var unmatchedOuJournals = await _repositoryJournalDetail.GetAll()
                    .Where(predicate)
                    .GroupBy(jd => new { jd.BatchNumber, jd.TransactionDate })
                    .Select(g => new
                    {
                        g.Key.BatchNumber,
                        g.Key.TransactionDate,
                        UniqueOus = g.Select(x => x.OuId).Distinct().Count(),
                        OuDetails = g.GroupBy(x => new { x.OuId, x.OuName })
                            .Select(ou => new
                            {
                                ou.Key.OuId,
                                ou.Key.OuName,
                                TransactionCount = ou.Count(),
                                TotalDebits = ou.Sum(x => (dto.JournalEntryType == "foreign" && x.BuyRate > 0 ? x.DebitAmount / x.BuyRate : x.DebitAmount)),
                                TotalCredits = ou.Sum(x => (dto.JournalEntryType == "foreign" && x.BuyRate > 0 ? x.CreditAmount / x.BuyRate : x.CreditAmount))
                            }).ToList(),
                        AllTransactions = g.ToList(),
                        HasNullOu = g.Any(x => x.OuId == Guid.Empty || string.IsNullOrEmpty(x.OuName)),
                        TotalTransactions = g.Count()
                    })
                    .Where(g => g.UniqueOus > 1 || g.HasNullOu) // Multiple OUs in same journal OR has null OU
                    .OrderBy(g => g.TransactionDate)
                    .ThenBy(g => g.BatchNumber)
                    .ToListAsync();

                var unmatchedOuTransactionList = new List<object>();
    
                foreach (var journal in unmatchedOuJournals)
                {
                    // Determine the issue type
                    string issueType = "";
                    if (journal.HasNullOu && journal.UniqueOus > 1)
                        issueType = "MIXED OUs WITH NULL VALUES";
                    else if (journal.HasNullOu)
                        issueType = "MISSING OU ASSIGNMENTS";
                    else if (journal.UniqueOus > 1)
                        issueType = "MULTIPLE OUs IN SAME JOURNAL";

                    // Add summary record for the unmatched OU journal
                    unmatchedOuTransactionList.Add(new
                    {
                        BatchNo = journal.BatchNumber,
                        BatchNumber = $"Batch Number: {journal.BatchNumber}",
                        Date = journal.TransactionDate.ToString("dd-MMM-yyyy"),
                        Description = $"{issueType} - {journal.UniqueOus} different OU(s) found",
                        AccountName = "MULTIPLE ACCOUNTS",
                        OuName = "MIXED OUs",
                        OrganizationalUnit = "MIXED OUs",
                        Source = "SYSTEM",
                        RefNo = "",
                        Debit = journal.AllTransactions.Sum(t => (dto.JournalEntryType == "foreign" && t.BuyRate > 0 ? t.DebitAmount / t.BuyRate : t.DebitAmount)),
                        Credit = journal.AllTransactions.Sum(t => (dto.JournalEntryType == "foreign" && t.BuyRate > 0 ? t.CreditAmount / t.BuyRate : t.CreditAmount)),
                        UniqueOuCount = journal.UniqueOus,
                        TransactionCount = journal.TotalTransactions,
                        IssueType = issueType,
                        Year = journal.TransactionDate.Year.ToString(),
                        MonthIndex = journal.TransactionDate.Month,
                        Month = journal.TransactionDate.ToString("MMMM"),
                        IsUnmatchedOuSummary = true
                    });

                    // Add OU breakdown summary
                    foreach (var ouDetail in journal.OuDetails.OrderBy(ou => ou.OuName))
                    {
                        string ouDisplayName = string.IsNullOrEmpty(ouDetail.OuName) ? "** NO OU ASSIGNED **" : ouDetail.OuName;
                        
                        unmatchedOuTransactionList.Add(new
                        {
                            BatchNo = journal.BatchNumber,
                            BatchNumber = $"OU: {ouDisplayName}",
                            Date = journal.TransactionDate.ToString("dd-MMM-yyyy"),
                            Description = $"Transactions for OU: {ouDisplayName} (Count: {ouDetail.TransactionCount})",
                            AccountName = "",
                            OuName = ouDetail.OuName,
                            OrganizationalUnit = ouDetail.OuName,
                            Source = "",
                            RefNo = "",
                            Debit = ouDetail.TotalDebits,
                            Credit = ouDetail.TotalCredits,
                            TransactionCount = ouDetail.TransactionCount,
                            Year = journal.TransactionDate.Year.ToString(),
                            MonthIndex = journal.TransactionDate.Month,
                            Month = journal.TransactionDate.ToString("MMMM"),
                            IsOuBreakdown = true
                        });
                    }

                    // Add individual transaction details
                    foreach (var transaction in journal.AllTransactions.OrderBy(t => t.OuName).ThenBy(t => t.AccountName))
                    {
                        string ouDisplayName = string.IsNullOrEmpty(transaction.OuName) ? "** NO OU **" : transaction.OuName;
                        
                        unmatchedOuTransactionList.Add(new TransactionReportItem
                        {
                            BatchNo = transaction.BatchNumber,
                            BatchNumber = $"{transaction.AccountName}",
                            Date = transaction.TransactionDate.ToString("dd-MMM-yyyy"),
                            Description = transaction.Description,
                            AccountId = transaction.AccountId,
                            AccountName = transaction.AccountName,
                            OuName = ouDisplayName,
                            Source = transaction.TransactionSource,
                            OrganizationalUnit = ouDisplayName,
                            CreatedAt = transaction.CreationTime.ToString("dd-MMM-yyyy"),
                            RefNo = !string.IsNullOrEmpty(transaction.ChequeNo) ? transaction.ChequeNo : transaction.ReferenceNumber,
                            Debit = (dto.JournalEntryType == "foreign" && transaction.BuyRate > 0 ? transaction.DebitAmount / transaction.BuyRate : transaction.DebitAmount),
                            Credit = (dto.JournalEntryType == "foreign" && transaction.BuyRate > 0 ? transaction.CreditAmount / transaction.BuyRate : transaction.CreditAmount),
                            Year = transaction.TransactionDate.Year.ToString(),
                            MonthIndex = transaction.TransactionDate.Month,
                            Month = transaction.TransactionDate.ToString("MMMM"),
                        });
                    }
                }

                return new
                {
                    Summary = new
                    {
                        TotalUnmatchedOuJournals = unmatchedOuJournals.Count,
                        TotalTransactionsAffected = unmatchedOuJournals.Sum(j => j.TotalTransactions),
                        IssueBreakdown = unmatchedOuJournals
                            .GroupBy(j => j.HasNullOu && j.UniqueOus > 1 ? "Mixed OUs with Nulls" :
                                        j.HasNullOu ? "Missing OU Assignments" : "Multiple OUs")
                            .Select(g => new { IssueType = g.Key, Count = g.Count() })
                            .ToList(),
                        ReportType = "Unmatched Organizational Units Report"
                    },
                    Transactions = unmatchedOuTransactionList
                };
            }
            
            
            if (dto.ReportType.Equals("account-details"))
            {
                
                
            }
            
            
            
            if (dto.ReportType.Equals("no-balance-accounts"))
            {
                // Build date filter for balance calculation
                var balanceQuery = _repositoryJournalDetail.GetAll()
                    .Where(jd => !jd.IsDeleted && jd.IsPosted);

                // Apply date filters if provided
                if (dto.StartDate.HasValue)
                {
                    balanceQuery = balanceQuery.Where(jd => jd.BatchDate >= dto.StartDate.Value);
                }
                
                if (dto.EndDate.HasValue)
                {
                    balanceQuery = balanceQuery.Where(jd => jd.BatchDate <= dto.EndDate.Value);
                }

                // Apply OU filter if provided
                if (dto.OuId != Guid.Empty)
                {
                    balanceQuery = balanceQuery.Where(jd => jd.OuId == dto.OuId);
                }

                // Find accounts with zero balance that have had transactions
                var noBalanceAccounts = await balanceQuery
                    .GroupBy(jd => new { jd.AccountId, jd.AccountName })
                    .Select(g => new
                    {
                        g.Key.AccountId,
                        g.Key.AccountName,
                        TotalDebits = g.Sum(jd => (dto.JournalEntryType == "foreign" && jd.BuyRate > 0 ? jd.DebitAmount / jd.BuyRate : jd.DebitAmount)),
                        TotalCredits = g.Sum(jd => (dto.JournalEntryType == "foreign" && jd.BuyRate > 0 ? jd.CreditAmount / jd.BuyRate : jd.CreditAmount)),
                        Balance = g.Sum(jd => (dto.JournalEntryType == "foreign" && jd.BuyRate > 0 ? jd.DebitAmount / jd.BuyRate : jd.DebitAmount))
                                  - g.Sum(jd => (dto.JournalEntryType == "foreign" && jd.BuyRate > 0 ? jd.CreditAmount / jd.BuyRate : jd.CreditAmount)),
                        TransactionCount = g.Count(),
                        FirstTransactionDate = g.Min(jd => jd.TransactionDate),
                        LastTransactionDate = g.Max(jd => jd.TransactionDate),
                        // Get sample transactions for this account
                        SampleTransactions = g.OrderByDescending(jd => jd.TransactionDate)
                            .Take(5)
                            .Select(jd => new
                            {
                                jd.BatchNumber,
                                jd.TransactionDate,
                                jd.Description,
                                DebitAmount = (dto.JournalEntryType == "foreign" && jd.BuyRate > 0 ? jd.DebitAmount / jd.BuyRate : jd.DebitAmount),
                                CreditAmount = (dto.JournalEntryType == "foreign" && jd.BuyRate > 0 ? jd.CreditAmount / jd.BuyRate : jd.CreditAmount),
                                jd.OuName
                            }).ToList()
                    })
                    .Where(g => Math.Abs(g.Balance) < 0.01m) // Zero balance (allowing for rounding)
                    .OrderBy(g => g.AccountName)
                    .ToListAsync();

                var noBalanceAccountsList = new List<object>();

                foreach (var account in noBalanceAccounts)
                {
                    // Add account summary
                    noBalanceAccountsList.Add(new
                    {
                        AccountId = account.AccountId,
                        AccountName = account.AccountName,
                        BatchNo = "SUMMARY",
                        BatchNumber = $"Account: {account.AccountName}",
                        Date = account.LastTransactionDate.ToString("dd-MMM-yyyy"),
                        Description = $"Zero Balance Account - Last Activity: {account.LastTransactionDate:dd-MMM-yyyy}",
                        OuName = "MULTIPLE",
                        OrganizationalUnit = "MULTIPLE",
                        Source = "SYSTEM",
                        RefNo = "",
                        Debit = account.TotalDebits,
                        Credit = account.TotalCredits,
                        Balance = account.Balance,
                        TransactionCount = account.TransactionCount,
                        FirstTransactionDate = account.FirstTransactionDate.ToString("dd-MMM-yyyy"),
                        LastTransactionDate = account.LastTransactionDate.ToString("dd-MMM-yyyy"),
                        ActivityPeriod = $"{account.FirstTransactionDate:dd-MMM-yyyy} to {account.LastTransactionDate:dd-MMM-yyyy}",
                        Year = account.LastTransactionDate.Year.ToString(),
                        MonthIndex = account.LastTransactionDate.Month,
                        Month = account.LastTransactionDate.ToString("MMMM"),
                        IsAccountSummary = true
                    });

                    // Add recent transaction samples
                    foreach (var transaction in account.SampleTransactions)
                    {
                        noBalanceAccountsList.Add(new TransactionReportItem
                        {
                            AccountId = account.AccountId,
                            AccountName = account.AccountName,
                            BatchNo = transaction.BatchNumber,
                            BatchNumber = $"  └─ {transaction.BatchNumber}",
                            Date = transaction.TransactionDate.ToString("dd-MMM-yyyy"),
                            Description = transaction.Description,
                            OuName = transaction.OuName,
                            Source = "SAMPLE",
                            OrganizationalUnit = transaction.OuName,
                            RefNo = "",
                            Debit =  transaction.DebitAmount,
                            Credit =  transaction.CreditAmount,
                            Year = transaction.TransactionDate.Year.ToString(),
                            MonthIndex = transaction.TransactionDate.Month,
                            Month = transaction.TransactionDate.ToString("MMMM"),
                        });
                    }
                }

                // Calculate summary statistics
                var totalDebitActivity = noBalanceAccounts.Sum(a => a.TotalDebits);
                var totalCreditActivity = noBalanceAccounts.Sum(a => a.TotalCredits);
                var totalTransactions = noBalanceAccounts.Sum(a => a.TransactionCount);

                return new
                {
                    Summary = new
                    {
                        TotalNoBalanceAccounts = noBalanceAccounts.Count,
                        TotalTransactionActivity = totalTransactions,
                        TotalDebitActivity = totalDebitActivity,
                        TotalCreditActivity = totalCreditActivity,
                        ReportPeriod = dto.StartDate.HasValue && dto.EndDate.HasValue 
                            ? $"{dto.StartDate.Value:dd-MMM-yyyy} to {dto.EndDate.Value:dd-MMM-yyyy}"
                            : "All Periods",
                        ReportType = "No Balance Accounts Report",
                        Note = "Showing accounts with zero balance that have had transaction activity"
                    },
                    Accounts = noBalanceAccountsList
                };
            }
            
            
            // For other report types, use the original logic
            var itransactionList = transactions
                .OrderBy(t => t.TransactionDate)
                .ThenBy(t => t.BatchNumber)
                .Select(t => new TransactionReportItem
                {
                    BatchNo = t.BatchNumber,
                    BatchNumber = $"Batch Number: {t.BatchNumber}",
                    Date = t.TransactionDate.ToString("dd-MMM-yyyy"),
                    Description = t.Description,
                    AccountId = t.AccountId,
                    AccountName = t.AccountName,
                    OuName = t.OuName,
                    Source = t.TransactionSource,
                    OrganizationalUnit = t.OuName,
                    CreatedAt = t.CreationTime.ToString("dd-MMM-yyyy"),
                    RefNo = !string.IsNullOrEmpty(t.ChequeNo) ? t.ChequeNo : t.ReferenceNumber,
                    Debit = (dto.JournalEntryType == "foreign" && t.BuyRate > 0 ? t.DebitAmount / t.BuyRate : t.DebitAmount),
                    Credit = (dto.JournalEntryType == "foreign" && t.BuyRate > 0 ? t.CreditAmount / t.BuyRate : t.CreditAmount),
                    EndingBalance = openingBalance - Math.Abs(
                        (dto.JournalEntryType == "foreign" && t.BuyRate > 0 ? t.DebitAmount / t.BuyRate : t.DebitAmount)
                        -
                        (dto.JournalEntryType == "foreign" && t.BuyRate > 0 ? t.CreditAmount / t.BuyRate : t.CreditAmount)
                    ),
                    Year = $"{t.TransactionDate.Year}",
                    MonthIndex = t.TransactionDate.Month,
                    Month = t.TransactionDate.ToString("MMMM"),
                })
                .ToList();

            return itransactionList;

             
            
        }
        
        public async Task<object> GetDeletedTransactions()
        {
            return await _repositoryDeletedJournal.GetAllListAsync();
        }
        
        public async Task<object> GetBalancedSheet(BalanceSheetDto dto)
        {
                
            var accountBalances = await _repositoryJournalDetail.GetAll()
                .Where(jd => jd.IsPosted == true && jd.BatchDate <= dto.EndDate)
                .GroupBy(jd => new { jd.AccountId, jd.AccountName, })
                .Select(g => new
                {
                    g.Key.AccountId,
                    g.Key.AccountName,
                    Balance = g.Sum(jd => jd.DebitAmount) - g.Sum(jd => jd.CreditAmount)
                    
                }).Where(b => b.Balance != 0).ToListAsync();

            return accountBalances;
             
        }
        
        
        

    }
}
