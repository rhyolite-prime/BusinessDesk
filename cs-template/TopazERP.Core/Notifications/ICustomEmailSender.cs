using System.Collections.Generic;
using System.Threading.Tasks;
using Abp.Net.Mail;
using TopazERP.Notifications.Dto;

namespace TopazERP.Notifications;

public interface ICustomEmailSender : IEmailSender
{
    Task SendEmailWithAttachmentsAsync(
        string to,
        string subject,
        string body,
        List<EmailAttachment> attachments,string host , int port , bool enableSsl , string userName , string password, string defaultFromDisplayName,
        bool isBodyHtml = true);
}