using System;
using System.Threading.Tasks;
using Abp.Authorization;
using Abp.Web.Models;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using TopazERP.Authorization;
using TopazERP.Controllers;
using TopazERP.Services.SchoolManager.Assignments;
using TopazERP.Services.SchoolManager.Assignments.Dto;
using TopazERP.Services.SchoolManager.BehavioralAssessments;
using TopazERP.Services.SchoolManager.BehavioralAssessments.Dto;
using TopazERP.Services.SchoolManager.ClassAttendances;
using TopazERP.Services.SchoolManager.ClassAttendances.Dto;
using TopazERP.Services.SchoolManager.Excursions;
using TopazERP.Services.SchoolManager.Excursions.Dto;
using TopazERP.Services.SchoolManager.PerformanceAreas;
using TopazERP.Services.SchoolManager.PerformanceAreas.Dto;
using TopazERP.Services.SchoolManager.RemarkByTeachers;
using TopazERP.Services.SchoolManager.RemarkByTeachers.Dto;
using TopazERP.Services.SchoolManager.StContactRelationships;
using TopazERP.Services.SchoolManager.StudentBios;
using TopazERP.Services.SchoolManager.StudentPromotions;
using TopazERP.Services.SchoolManager.StudentPromotions.Dto;


namespace TopazERP.Web.Controllers
{
    [AbpAuthorize(PermissionNames.Sm_PromotionsAndResults)]
    public class SmResultsPromotionsController : TopazERPControllerBase
    {
        private readonly IWebHostEnvironment _env;
        private readonly IAssignmentAppService _assignmentAppService;
        private readonly IStudentBioAppService _studentBioAppService;
        private readonly IBehavioralAssessmentAppService _behavioralAssessmentAppService;
        private readonly IStContactRelationshipAppService _stContactRelationshipAppService;
        private readonly IRemarkByTeacherAppService _remarkByTeacherAppService;
        private readonly IAttendanceAppService _attendanceAppService;
        private readonly IPerformanceAreaAppService _performanceAreaAppService;
        private readonly IStudentPromotionAppService _studentPromotionAppService;

        public SmResultsPromotionsController(
            IWebHostEnvironment env,
            IAssignmentAppService assignmentAppService,
            IStudentBioAppService studentBioAppService,
            IBehavioralAssessmentAppService behavioralAssessmentAppService,
            IStContactRelationshipAppService stContactRelationshipAppService,
            IRemarkByTeacherAppService remarkByTeacherAppService, IAttendanceAppService attendanceAppService, IPerformanceAreaAppService performanceAreaAppService, IStudentPromotionAppService studentPromotionAppService)
        {
            _env = env;
            _assignmentAppService = assignmentAppService;
            _studentBioAppService = studentBioAppService;
            _behavioralAssessmentAppService = behavioralAssessmentAppService;
            _stContactRelationshipAppService = stContactRelationshipAppService;
            _remarkByTeacherAppService = remarkByTeacherAppService;
            _attendanceAppService = attendanceAppService;
            _performanceAreaAppService = performanceAreaAppService;
            _studentPromotionAppService = studentPromotionAppService;
        }

        /* ================= RESULT SETUP ================= */
        [AbpAuthorize(PermissionNames.Sm_PromotionsAndResults)]
        public IActionResult SetResultPeriod()
        {
            return View();
        }
        /* ================= PROMOTIONS ================= */

        [AbpAuthorize(PermissionNames.Sm_PromotionsAndResults_PromoteStudents)]
        public IActionResult StudentPromotionClass()
        {
            return View();
        }
        [AbpAuthorize(PermissionNames.Sm_PromotionsAndResults_PromoteStudents)]
        public IActionResult StudentPromotionLevel()
        {
            return View();
        }

        [AbpAuthorize(PermissionNames.Sm_PromotionsAndResults_PromoteStudents)]
        public IActionResult AlumniPromotion()
        {
            return View();
        }

        [AbpAuthorize(PermissionNames.Sm_PromotionsAndResults_PromoteStudents)]
        public IActionResult PreClassStudentPromotion()
        {
            return View();
        }

        /* ================= ASSIGNMENTS ================= */
        [AbpAuthorize(PermissionNames.Sm_PromotionsAndResults_AddResults)]
        public IActionResult ClassAssignment1()
        {
            return View();
        }
        [AbpAuthorize(PermissionNames.Sm_PromotionsAndResults_AddResults)]
        public IActionResult ClassAssignment2()
        {
            return View();
        }
        [AbpAuthorize(PermissionNames.Sm_PromotionsAndResults_AddResults)]
        public IActionResult ClassAssignment3()
        {
            return View();
        }
        [AbpAuthorize(PermissionNames.Sm_PromotionsAndResults_AddResults)]
        public IActionResult ClassAssignment4()
        {
            return View();
        }

      
        /* ================= EXAMS ================= */
        [AbpAuthorize(PermissionNames.Sm_PromotionsAndResults_AddResults)]
        public IActionResult Exam()
        {
            return View();
        }

       
        [AbpAuthorize(PermissionNames.Sm_PromotionsAndResults_AddResults)]
        public IActionResult MidTerm()
        {
            return View();
        }

      

        /* ================= BEHAVIOR & SKILLS ================= */

        [AbpAuthorize(PermissionNames.Sm_PromotionsAndResults_BehaviorialRemarks)]
        public IActionResult Attitude()
        {
            return View();
        }

        [AbpAuthorize(PermissionNames.Sm_PromotionsAndResults_BehaviorialRemarks)]
        public IActionResult Conduct()
        {
            return View();
        }

        [AbpAuthorize(PermissionNames.Sm_PromotionsAndResults_BehaviorialRemarks)]
        public IActionResult Interest()
        {
            return View();
        }

        /* ================= REMARKS ================= */
        [AbpAuthorize(PermissionNames.Sm_PromotionsAndResults_TeacherRemarks)]
        public IActionResult HeadTeacherRemark()
        {
            return View();
        }

        [AbpAuthorize(PermissionNames.Sm_PromotionsAndResults_TeacherRemarks)]
        public IActionResult ClassTeacherRemark()
        {
            return View();
        }

        /* ================= ATTENDANCE ================= */
        [AbpAuthorize(PermissionNames.Sm_PromotionsAndResults_Attendance)]
        public IActionResult Attendance()
        {
            return View();
        }
        
        /* =============== PERFOMANCE SKILLS ============ */
        [AbpAuthorize(PermissionNames.Sm_PromotionsAndResults_PerformanceSkills)]
        public IActionResult PerformanceSkills()
        {
            return View();
        }
        
        //results
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<IActionResult> GetNextAssignmentNumber(
            Guid academicYearId,
            Guid termId,
            Guid classId,
            Guid subjectId,
            string type)
        {
            var nextNo = await _assignmentAppService.GetNextAssignmentNumber(
                academicYearId, termId, classId, subjectId, type
            );

            return Json(new { nextNumber = nextNo });
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<IActionResult> GetAllResults(string type)
        {
            var result = await _assignmentAppService.ListAllByType(type);
            return Json(result);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> CreateResult([FromBody] CreateAssignmentInput input)
        {
            var result = await _assignmentAppService.Create(input);
            return Json(result);
        }
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> UpdateResult([FromBody] UpdateAssignmentInput input)
        {
            await _assignmentAppService.Update(input);
            return Json(200);
        }
        
        // result period
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<IActionResult> GetAllPeriods()
        {
            var result = await _assignmentAppService.ListAllPeriods();
            return Json(result);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<IActionResult> CreatePeriod([FromBody] CreateResultPeriodInput input)
        {
            var result = await _assignmentAppService.CreatePeriod(input);
            return Json(result);
        }
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<IActionResult> UpdatePeriod([FromBody] UpdateResultPeriodInput input)
        {
             await _assignmentAppService.UpdatePeriod(input);
            return Json(200);
        }
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> DeletePeriod([FromQuery] Guid id)
        {
            await _assignmentAppService.DeletePeriod(id);
            return Json(200);
        }
        //behavioral assessments
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<IActionResult> GetAllAssessments(string assessmentType)
        {
            var result = await _behavioralAssessmentAppService.ListAllByType(assessmentType);
            return Json(result);
        }
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<IActionResult> GetAllBAssessments()
        {
            var result = await _behavioralAssessmentAppService.ListAll();
            return Json(result);
        }
        
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> CreateAssessment([FromBody] CreateBehavioralAssessmentInput input)
        {
            var result = await _behavioralAssessmentAppService.Create(input);
            return Json(result);
        }
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> UpdateAssessment([FromBody] UpdateBehavioralAssessmentInput input)
        {
            await _behavioralAssessmentAppService.Update(input);
            return Json(200);
        }
        
        //remarksByTeachers
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<IActionResult> GetAllRemarks()
        {
            var result = await _remarkByTeacherAppService.ListAll();
            return Json(result);
        }
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> CreateRemark([FromBody] ImportRemarksDto input)
        {
            var result = await _remarkByTeacherAppService.Create(input);
            return Json(result);
        }
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> UpdateRemark([FromBody] UpdateRemarksInput input)
        {
            await _remarkByTeacherAppService.Update(input);
            return Json(200);
        }
        
        //attendance
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<IActionResult> GetAllAttendance()
        {
            var result = await _attendanceAppService.ListAllCumulativeAttendance();
            return Json(result);
        }
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> CreateAttendance([FromBody] CreateCumulativeAttendanceInput input)
        {
            var result = await _attendanceAppService.CreateAttendance(input);
            return Json(result);
        }
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> UpdateAttendance([FromBody] UpdateCumulativeAttendanceInput input)
        {
            await _attendanceAppService.UpdateAttendance(input);
            return Json(200);
        }
        
        //performance skill
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<IActionResult> GetAllSkills()
        {
            var result = await _performanceAreaAppService.ListAllStudentPerformanceSkills();
            return Json(result);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<IActionResult> CreateSkill([FromBody] CreateStudentPerformanceSkill input)
        {
            var result = await _performanceAreaAppService.CreateStudentPerformanceSkill(input);
            return Json(result);
        }
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<IActionResult> UpdateSkill([FromBody] UpdateStudentPerfomanceSkill input)
        {
            await _performanceAreaAppService.UpdateStudentPerformanceSkill(input);
            return Json(200);
        }
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> DeleteSkill([FromQuery] Guid id)
        {
            await _performanceAreaAppService.DeleteStudentPerformanceSkill(id);
            return Json(200);
        }
        
        //student promotion
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<IActionResult> GetAllPromotions()
        {
            var result = await _studentPromotionAppService.ListAll();
            return Json(result);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<IActionResult> CreatePromotion([FromBody] CreateStudentPromotionInput input)
        {
            var result = await _studentPromotionAppService.Create(input);
            return Json(result);
        }
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<IActionResult> UpdatePromotion([FromBody] UpdateStudentPromotionInput input)
        {
            await _studentPromotionAppService.Update(input);
            return Json(200);
        }
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<IActionResult> GetAllPreClassPromotions()
        {
            var result = await _studentPromotionAppService.ListAllPreClass();
            return Json(result);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<IActionResult> CreatePreClassPromotion([FromBody] CreatePreClassPromotionInput input)
        {
            var result = await _studentPromotionAppService.CreatePreClass(input);
            return Json(result);
        }
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<IActionResult> UpdatePreClass([FromBody] UpdatePreClassPromotionInput input)
        {
            await _studentPromotionAppService.UpdatePreClass(input);
            return Json(200);
        }
        
        
        
    }
}
