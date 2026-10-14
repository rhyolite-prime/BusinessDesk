using System;
using System.Collections.Generic;

namespace TopazERP.DomainServices.SchoolManger.Email.Dto
{
    public class TerminalReportDto
    {
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

    public string HouseName { get; set; }

    public string Year { get; set; }

    public string ClassName { get; set; }

    public string Term { get; set; }

    public int TotalStudents { get; set; }

    public string TermEndDate { get; set; }

    public int ClassPosition { get; set; }
    public int PositionPerSubject { get; set; }

    public int OverallClassPosition { get; set; }

    public string TermBeginDate { get; set; }

    public string PromotedClassName { get; set; }

    /* ===============================
       SUBJECT TABLE PERCENTAGES
    =============================== */
    public decimal ClassPercentage { get; set; }

    public decimal ExamPercentage { get; set; }

    public decimal OverallTotalScore { get; set; }

    public int Aggregate { get; set; }

    public decimal RawScore { get; set; }
    
    public decimal TotalMarksExpected { get; set; }
    public decimal HighestClassMarks { get; set; }
    public decimal LowestClassMarks { get; set; }
    public decimal CurrentTermsAverage { get; set; }
    public decimal PreviousTermsAverage { get; set; }
    public string Stage { get; set; }
   

    /* ===============================
       SUBJECT RESULTS
    =============================== */
    public List<TerminalReportSubjectDto> TerminalReport { get; set; } = new();

    /* ===============================
       ATTENDANCE
    =============================== */
    public int Attendance { get; set; }

    public int SchoolDays { get; set; }

    /* ===============================
       GENERAL REMARKS
    =============================== */
    public string Attitude { get; set; }

    public string Conduct { get; set; }

    public string TeacherName { get; set; }

    public string ClassTeacherRemarks { get; set; }

    public string HeadTeacherRemarks { get; set; }

    /* ===============================
       SIGNATURE
    =============================== */
    public string SignatureImage { get; set; }

    /* ===============================
       DISPLAY SETTINGS
    =============================== */
    public bool IsClassSplitting { get; set; }

    public bool IsSubjectSplitting { get; set; }

    public bool DisplaySignature { get; set; }

    /* ===============================
       GRADE MAPPING
    =============================== */
    public IEnumerable<StageRemarkDto> StageRemarks { get; set; } =
        new List<StageRemarkDto>();
        
    }
    
    public class TerminalReportSubjectDto
    {
       public Guid SubjectId { get; set; }

       public string SubjectName { get; set; }

       public string SubjectTeacher { get; set; }

       /* ===============================
          RAW SCORES
       =============================== */
       public decimal ClassScoreObtained { get; set; }

       public decimal ClassScoreOverall { get; set; }

       public decimal ExamScoreObtained { get; set; }

       public decimal ExamScoreOverall { get; set; }

       /* ===============================
          WEIGHTED SCORES
       =============================== */
       public decimal PercentageClassScore { get; set; }

       public decimal PercentageExam { get; set; }

       public decimal TotalScore { get; set; }

       /* ===============================
          GRADING
       =============================== */
       public string GradeNumber { get; set; }

       public string SubjectRemark { get; set; }

       /* ===============================
          POSITIONS
       =============================== */
       public int PositionPerSubject { get; set; }

       public int OverallSubjectPosition { get; set; }

       /* ===============================
          CLASS PERFORMANCE
       =============================== */
       public decimal ClassAveragePerSubject { get; set; }
       
       public string Stage {get; set;}
    }
    
    
    public class SubjectRemarkDto
    {
       public string GradeNumber { get; set; } = string.Empty;

       public string Remark { get; set; } = string.Empty;

       public decimal MinMark { get; set; }

       public decimal MaxMark { get; set; }
    }

    
    public class StageRemarkDto
    {
       public decimal MinMark { get; set; }

       public decimal MaxMark { get; set; }

       public string GradeNumber { get; set; } = string.Empty;

       public string Remark { get; set; } = string.Empty;

       // Example:
       // 80 - 100 - 1 - Excellent
       public string Name { get; set; } = string.Empty;
    }
    public class RankingItem
    {
       public string StudentIdentifier { get; set; }

       public decimal Total { get; set; }

       public int Position { get; set; }
    }

    public class SubjectScoreDto
    {
       public decimal ClassScoreObtained { get; set; }

       public decimal ClassScoreOverall { get; set; }

       public decimal ExamScoreObtained { get; set; }

       public decimal ExamScoreOverall { get; set; }
    }
}
