using System;

namespace TopazERP.Services.SchoolManager.TeacherSubjects.Dto
{
    public class CreateTeacherSubjectInput
    {
        public Guid StaffId { get; set; }
        public string StaffName { get; set; }
        public Guid ClassId { get; set; }
        public string ClassName { get; set; }
        public Guid AcademicYearId { get; set; }
        public string AcademicYearName { get; set; }
        public Guid SubjectId { get; set; }
        public string SubjectName { get; set; }
    }
}