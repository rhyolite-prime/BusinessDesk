namespace TopazERP.Services.SchoolManager.Subjects.Dto;

public class CreateSubjectInput
{
    public string Name { get; set; }
    public string Abbreviation { get; set; }
    public bool IsCore { get; set; }
    public bool IsBestSubject { get; set; }
}