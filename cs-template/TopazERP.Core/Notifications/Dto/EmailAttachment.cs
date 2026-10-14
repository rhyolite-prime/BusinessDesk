using System.IO;

namespace TopazERP.Notifications.Dto;

public class EmailAttachment
{
    public string FileName { get; set; }
    public Stream Content { get; set; }
    public string MimeType { get; set; } // Optional: to specify the MIME type
}