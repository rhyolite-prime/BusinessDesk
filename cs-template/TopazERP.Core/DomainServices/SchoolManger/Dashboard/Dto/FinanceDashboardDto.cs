namespace TopazERP.DomainServices.SchoolManger.Dashboard.Dto;

public class FinanceDashboardDto
{
    public string CurrencyCode { get; set; }

    public decimal BillsRaised { get; set; }

    public decimal PaymentsReceived { get; set; }

    public decimal OutstandingDebt { get; set; }

    public decimal CollectionRate { get; set; }

    public decimal TodaysCollections { get; set; }

    public decimal MonthlyCollections { get; set; }
}