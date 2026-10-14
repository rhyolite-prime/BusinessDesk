using System.ComponentModel.DataAnnotations;

namespace TopazERP.Users.Dto
{
    public class ChangeUserLanguageDto
    {
        [Required]
        public string LanguageName { get; set; }
    }
}