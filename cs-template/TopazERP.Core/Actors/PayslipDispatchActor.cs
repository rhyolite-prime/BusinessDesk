using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Abp.Net.Mail;
using Akka.Actor;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using TopazERP.Actors.MessageModels;
using TopazERP.DomainServices.Payroll.Reports.Dto;
using TopazERP.Notifications;
using TopazERP.Notifications.Dto;
using TopazERP.Pdf;


namespace TopazERP.Actors;

public class PayslipDispatchActor: ReceiveActor
{
    private readonly ICustomEmailSender _customEmailSender;
    private readonly IPayslipPdfGenerator _payslipPdfGenerator;
    private readonly ILogger<PayslipDispatchActor> _logger;
    private List<EmployeePayslip> _payslipQueue;
    private int _batchSize;
    private int _intervalCount;
    private string _intervalType;
    private ICancelable _schedule;

    public PayslipDispatchActor(IServiceProvider serviceProvider)
    {
      
        _customEmailSender = serviceProvider.GetRequiredService<ICustomEmailSender>();
        _payslipPdfGenerator = serviceProvider.GetRequiredService<IPayslipPdfGenerator>();
        _logger = serviceProvider.GetRequiredService<ILogger<PayslipDispatchActor>>();
        
        _payslipQueue = new List<EmployeePayslip>();
        
        // Handle incoming dispatch request
        Receive<PayslipDispatchDto>(HandlePayslipDispatch);
        
        // Handle the scheduled batch processing
        ReceiveAsync<ProcessBatch>(async _ => await ProcessBatchEmails());
        
    }
    
    private void HandlePayslipDispatch(PayslipDispatchDto msg)
    {
        // Update the configuration based on the received message
        _batchSize = msg.BatchSize;
        _intervalCount = msg.IntervalCount;
        _intervalType = msg.IntervalType.ToLower();

        // Add the payslip to the queue
        _payslipQueue.AddRange(msg.EmployeePayslip);

        // Process the first batch immediately
         
        Task.Run(async () => await DispatchInitialBatch());

        // Schedule the remaining batches
        StartScheduler();
    }
    
    private async Task DispatchInitialBatch()
    {
        var batchToSend = _payslipQueue.Take(_batchSize).ToList();
        
        _payslipQueue = _payslipQueue.Skip(_batchSize).ToList();

        foreach (var payslip in batchToSend)
        {
            var fileBytes = await _payslipPdfGenerator.RenderPdf(payslip);
            
            var attachments = new List<EmailAttachment>
            {
                new()
                {
                    FileName = $"Payslip_{payslip.CurrentDate}.pdf",
                    Content = new MemoryStream(fileBytes),
                    MimeType = "application/pdf"
                }
            };

          await  _customEmailSender.SendEmailWithAttachmentsAsync(
                to: payslip.PayslipBasicInfo.EmailAddress,
                subject: $"Payslip for {payslip.CurrentDate}",
                body: $"Please find attached a copy of payslip for {payslip.CurrentDate}.</b>",
                attachments: attachments, 
                payslip.SmtpCredentials.MailHostName,
                payslip.SmtpCredentials.PortNumber,
                payslip.SmtpCredentials.IsSSLEnabled, 
                payslip.SmtpCredentials.PrimaryEmailAddress,
                payslip.SmtpCredentials.EmailPassword, 
                payslip.SmtpCredentials.DefaultFromDisplayName,
                isBodyHtml: true
            );
        }

        _logger.LogInformation($"{batchToSend.Count} payslips dispatched immediately.");
    }

    private void StartScheduler()
    {
        // Cancel any existing schedule before starting a new one
        _schedule?.Cancel();

        var interval = GetInterval();

        // Schedule the task to run at the specified interval
        _schedule = Context.System.Scheduler.ScheduleTellRepeatedlyCancelable(
            initialDelay: interval, // Start after the first interval since the first batch is already sent
            interval: interval, // Repeat at the specified interval
            receiver: Self,
            message: new ProcessBatch(),
            sender: Self
        );
    }

    private TimeSpan GetInterval()
    {
        return _intervalType switch
        {
            "minute" => TimeSpan.FromMinutes(_intervalCount),
            "hour" => TimeSpan.FromHours(_intervalCount),
            "day" => TimeSpan.FromDays(_intervalCount),
            _ => TimeSpan.FromMinutes(1) // Default to 1 minute if interval type is invalid
        };
    }

    private async Task ProcessBatchEmails()
    {
        if (_payslipQueue.Any())
        {
           await DispatchPayslips();
        }
    }
    
    private async Task DispatchPayslips()
    {
        var batchToSend = _payslipQueue.Take(_batchSize).ToList();
        _payslipQueue = _payslipQueue.Skip(_batchSize).ToList();

        foreach (var payslip in batchToSend)
        {
            var fileBytes = await _payslipPdfGenerator.RenderPdf(payslip);
            
            var attachments = new List<EmailAttachment>
            {
                new()
                {
                    FileName = $"Payslip_{payslip.CurrentDate}.pdf",
                    Content = new MemoryStream(fileBytes), 
                    MimeType = "application/pdf"
                }
            };

           await _customEmailSender.SendEmailWithAttachmentsAsync(
                to: payslip.PayslipBasicInfo.EmailAddress,
                subject: $"Payslip for {payslip.CurrentDate}",
                body: $"Please find attached a copy of payslip for {payslip.CurrentDate}. GrossPay: <b>{payslip.GrossPay}</b>",
                attachments: attachments,payslip.SmtpCredentials.MailHostName,
                payslip.SmtpCredentials.PortNumber,
                payslip.SmtpCredentials.IsSSLEnabled, 
                payslip.SmtpCredentials.PrimaryEmailAddress, 
                payslip.SmtpCredentials.EmailPassword,
                payslip.SmtpCredentials.DefaultFromDisplayName,
                isBodyHtml: true
            );
            
        }

        _logger.LogInformation($"{batchToSend.Count} payslips dispatched in scheduled batch.");
    }

    protected override void PostStop()
    {
        _schedule?.Cancel(); // Stop the scheduler when the actor stops
        base.PostStop();
    }
    
    
    
}