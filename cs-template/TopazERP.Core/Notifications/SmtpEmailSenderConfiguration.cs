using System;
using Abp.Configuration;
using Abp.Net.Mail;
using Abp.Net.Mail.Smtp;
using Microsoft.Extensions.Configuration;

namespace TopazERP.Notifications;

public class SmtpEmailSenderConfiguration : ISmtpEmailSenderConfiguration
{
    private readonly IConfiguration _configuration;

    public SmtpEmailSenderConfiguration(IConfiguration configuration)
    {
        _configuration = configuration;
    }
    

    public string Host => _configuration["SmtpConfig:Host"];
    public int Port => int.Parse(_configuration["SmtpConfig:Port"]);
    public string UserName => _configuration["SmtpConfig:UserName"];
    public string Password => _configuration["SmtpConfig:Password"];
    public string Domain => _configuration["SmtpConfig:Domain"];
    public bool EnableSsl => Convert.ToBoolean(_configuration["SmtpConfig:EnableSsl"]);
    public bool UseDefaultCredentials => Convert.ToBoolean(_configuration["SmtpConfig:UseDefaultCredentials"]);
    public string DefaultFromAddress => _configuration["SmtpConfig:DefaultFromAddress"];
    public string DefaultFromDisplayName => _configuration["SmtpConfig:DefaultFromDisplayName"];
    
}