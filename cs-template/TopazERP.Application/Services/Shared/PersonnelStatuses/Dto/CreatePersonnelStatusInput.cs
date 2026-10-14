namespace TopazERP.Services.Shared.PersonnelStatus.Dto;

public class CreatePersonnelStatusInput
{
    public string Name { get; set; }
    public bool IsDefault { get; set; }
    public int TenantId { get; set; }
}