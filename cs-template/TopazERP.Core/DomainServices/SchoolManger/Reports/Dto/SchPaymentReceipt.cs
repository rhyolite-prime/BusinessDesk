namespace TopazERP.DomainServices.SchoolManger.Reports.Dto;

public class SchPaymentReceipt
{
        public string StudentName { get; set; }
        public string RegNo { get; set; }
        public string ClassName { get; set; }
        public string UserName { get; set; }
        public decimal PaidAmount { get; set; }
        public decimal Balance { get; set; }
        public string PaymentDate { get; set; }
        public string AmountInWords { get; set; }
        public string ModeOfPayment { get; set; }
        public string ChequeNo { get; set; }
        public string CurrencyName { get; set; }
        public string CurrencyCode { get; set; }
        public string ReceiptNo { get; set; }
        public string BankDetail { get; set; }
        public string Period { get; set; }
        public string Description { get; set; }
  
}