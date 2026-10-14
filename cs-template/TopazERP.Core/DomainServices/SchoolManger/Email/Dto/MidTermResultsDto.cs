using System;
using System.Collections.Generic;

namespace TopazERP.DomainServices.SchoolManger.Email.Dto;

public class MidTermResultsDto
{
    /* ===============================
            SCHOOL HEADER INFO
         =============================== */
    public string CompanyLogo { get; set; }
    public string SchoolName { get; set; }
    public string Address { get; set; }
    public string PhoneNo { get; set; }
    public string Email { get; set; }

    /* ===============================
       STUDENT BASIC INFO
    =============================== */
    public string StudentName { get; set; }
    public string StudentIdentifier { get; set; }
    public string Year { get; set; }
    public string ClassName { get; set; }
    public string Term { get; set; }
    public int TotalStudents { get; set; }
   
        

    /* ===============================
       SUBJECT RESULTS
    =============================== */
    public List<MidTermResult> MidTermResults { get; set; }
        
    public string TeacherName { get; set; }
    public string ClassTeacherRemarks { get; set; }
    public string HeadTeacherRemarks { get; set; }
    public IEnumerable<MidTermAssessmentsDto> MidTermAssessments { get; set; }  
}
    
    public class MidTermResult
    {
        public Guid SubjectId { get; set; }
        public string SubjectName { get; set; }
        public decimal ScoredMark { get; set; }
        public string SubjectRemark { get; set; }
        public decimal Average { get; set;}
   
    }

    public class MidTermAssessmentsDto
    {
        public string AssessmentHeader { get; set; }
        public string AssessmentRemark { get; set; }
    }

