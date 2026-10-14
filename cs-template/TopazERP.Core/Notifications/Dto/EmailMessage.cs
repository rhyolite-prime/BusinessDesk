using System.Collections.Generic;

namespace TopazERP.Notifications.Dto;

public class EmailMessage
{
    public List<string> To { get; set; } = new();
    public string Subject { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public List<(byte[] Content, string FileName, string MimeType)> Attachments { get; set; } = new();
}
