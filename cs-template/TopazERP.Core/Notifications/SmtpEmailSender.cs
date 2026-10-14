using System;
using System.Net;
using System.Net.Mail;
using System.Threading.Tasks;
using Abp.Domain.Repositories;
using Abp.Net.Mail;
using Abp.Net.Mail.Smtp;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using TopazERP.Models.Shared;

namespace TopazERP.Notifications;

public class SmtpEmailSender: EmailSenderBase
{
    private readonly ISmtpEmailSenderConfiguration _configuration;
    private readonly ILogger<SmtpEmailSender> _logger;
    private readonly IRepository<CompanyProfile, Guid> _repositoryCompanyProfile;

    public SmtpEmailSender(ISmtpEmailSenderConfiguration configuration, ILogger<SmtpEmailSender> logger, IRepository<CompanyProfile, Guid> repositoryCompanyProfile)
        : base(configuration)
    {
        _configuration = configuration;
        _logger = logger;
        _repositoryCompanyProfile = repositoryCompanyProfile;
    }

    protected override async Task SendEmailAsync(MailMessage mail)
    {
        var companyProfile = await _repositoryCompanyProfile.GetAll().FirstOrDefaultAsync();
        
        var host = companyProfile == null ? _configuration.Host : companyProfile.MailHostName;
        var port = companyProfile?.PortNumber ?? _configuration.Port;
        var enableSsl = companyProfile?.IsSSLEnabled ?? _configuration.EnableSsl;
        var userName = companyProfile?.PrimaryEmailAddress ?? _configuration.UserName;
        var password = companyProfile?.EmailPassword ?? _configuration.Password;
        
        try
        {
            await Task.Delay(1);
            using var client = new SmtpClient(host, port);
            client.EnableSsl = enableSsl;
            client.UseDefaultCredentials = false;
            if (!client.UseDefaultCredentials)
            {
                client.Credentials = new NetworkCredential(userName, password);
            }

            client.Send(mail);
        }
        catch (Exception e)
        {
            _logger.LogError(e, "Error sending email");
             _logger.LogError("Message: {0}", e.Message);
        }
         
    }
    
    protected override void SendEmail(MailMessage mail)
    {
        try
        {
            using var client = new SmtpClient(_configuration.Host, _configuration.Port);
            client.EnableSsl = _configuration.EnableSsl;
            client.UseDefaultCredentials = _configuration.UseDefaultCredentials;
            if (!client.UseDefaultCredentials)
            {
                client.Credentials = new NetworkCredential(_configuration.UserName, _configuration.Password);
            }

            client.Send(mail);
        }
        catch (Exception e)
        {
            _logger.LogError(e, "Error sending email");
            _logger.LogError("Message: {0}", e.Message);
        }
        
        
    }
}