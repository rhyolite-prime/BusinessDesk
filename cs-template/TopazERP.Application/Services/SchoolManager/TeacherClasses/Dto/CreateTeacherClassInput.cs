using System;

namespace TopazERP.Services.SchoolManager.TeacherClasses.Dto
{
    public class CreateTeacherClassInput
    {
        public Guid StaffId { get; set; }
        public string StaffName { get; set; }
        public Guid ClassId { get; set; }
        public string ClassName { get; set; }
        public Guid AcademicYearId { get; set; }
        public string AcademicYearName { get; set; }
    }
}