namespace TopazERP.Notifications.Dto;

public class SmtpCredentials
{
    public string PrimaryEmailAddress { get; set; }
    public string DefaultFromDisplayName { get; set; }
    public string EmailPassword { get; set; }
    public string MailHostName { get; set; }
    public int PortNumber { get; set; }
    public bool IsSSLEnabled { get; set; }
}