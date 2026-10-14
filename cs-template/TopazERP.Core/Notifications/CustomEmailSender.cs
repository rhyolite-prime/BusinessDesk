using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Mail;
using System.Threading.Tasks;
using Abp.Net.Mail.Smtp;
using Microsoft.Extensions.Logging;
using TopazERP.Notifications.Dto;

namespace TopazERP.Notifications;

public class CustomEmailSender:  ICustomEmailSender
{
    private readonly ILogger<CustomEmailSender> _logger;

    public CustomEmailSender(ILogger<CustomEmailSender> logger)
    {
        _logger = logger;
    }

    public async Task SendEmailWithAttachmentsAsync(
        string to,
        string subject,
        string body,
        List<EmailAttachment> attachments, string host , int port , bool enableSsl , string userName , string password, string defaultFromDisplayName,
        bool isBodyHtml = true)
    {
        try
        {
            var mailMessage = new MailMessage
            {
                Subject = subject,
                Body = body,
                IsBodyHtml = isBodyHtml,
                From = new MailAddress(userName, defaultFromDisplayName)
            };

            mailMessage.To.Add(to);

            // Add attachments to the email
            foreach (var attachment in attachments)
            {
                mailMessage.Attachments.Add(new Attachment(attachment.Content, attachment.FileName, attachment.MimeType));
            }

            using var smtpClient = new SmtpClient(host, port);
            smtpClient.Credentials = new NetworkCredential(userName, password);
            smtpClient.EnableSsl = enableSsl;

            await smtpClient.SendMailAsync(mailMessage);
        }
        catch (Exception e)
        {
            _logger.LogError($"sending mail with attachments failed: {e.Message}");
            
            _logger.LogError($"sending mail with attachments failed: {e.StackTrace}");
        }
        
        
    }
    
    public void Send(string to, string subject, string body, bool isBodyHtml = true)
    {
         
    }
    
    public void Send(string to, string subject, string body, string something,bool isBodyHtml = true)
    {
         
    }
    
    public void Send(MailMessage msg, bool isBodyHtml = true)
    {
         
    }
    
    public async Task SendAsync(MailMessage msg, bool isBodyHtml = true)
    {
        await Task.Delay(1);
    }
    
    public async Task SendAsync(string to, string subject, string body, bool isBodyHtml = true)
    {
        await Task.Delay(1);
    }
    
    public async Task SendAsync(string to, string subject, string body, string something,bool isBodyHtml = true)
    {
        await Task.Delay(1);
    }
     
    
}