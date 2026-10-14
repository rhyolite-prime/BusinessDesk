using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Mail;
using System.Threading.Tasks;
using Abp.Domain.Repositories;
using Microsoft.EntityFrameworkCore;
using TopazERP.Actors.MessageModels;
using TopazERP.DomainServices.Ap.EmailInvoices;
using TopazERP.DomainServices.Ap.Reports;
using TopazERP.DomainServices.Ap.Reports.Dto;
using TopazERP.Models.Ap;
using TopazERP.Models.Shared;
using TopazERP.Notifications.Dto;
using ReportHeader = TopazERP.DomainServices.Ap.Reports.Dto.ReportHeader;
using SmtpCredentials = TopazERP.Notifications.Dto.SmtpCredentials;

namespace TopazERP.Services.Ap.EmailInvoices;

public class EmailInvoicesAppService: TopazERPAppServiceBase, IEmailInvoicesAppService
{
    private readonly IApReportManager _apReportManager;
    private readonly IEmailInvoicesManager _emailInvoicesManager;
    
    
    public EmailInvoicesAppService(IApReportManager apReportManager, IEmailInvoicesManager emailInvoicesManager)
    {
        _apReportManager = apReportManager;
        _emailInvoicesManager = emailInvoicesManager;
    }
    
    public async Task<object> DispatchInvoice(EmailApInvoiceDto dto)
    {
       return await  _emailInvoicesManager.DispatchInvoice(dto);
    }
}