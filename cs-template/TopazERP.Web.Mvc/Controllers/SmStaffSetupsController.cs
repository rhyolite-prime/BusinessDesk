using System;
using System.Threading.Tasks;
using Abp.Authorization;
using Abp.UI;
using Abp.Web.Models;
using Microsoft.AspNetCore.Mvc;
using TopazERP.Authorization;
using TopazERP.Services.SchoolManager.AcademicYears;
using TopazERP.Services.SchoolManager.Certificates;
using TopazERP.Services.SchoolManager.Certificates.Dto;
using TopazERP.Services.SchoolManager.StaffBios;
using TopazERP.Services.SchoolManager.StaffBios.Dto;
using TopazERP.Services.SchoolManager.StaffDesignations;
using TopazERP.Services.SchoolManager.StaffDesignations.Dto;
using TopazERP.Services.SchoolManager.StaffGrades;
using TopazERP.Services.SchoolManager.StaffGrades.Dto;
using TopazERP.Services.SchoolManager.StaffPastEmployments;
using TopazERP.Services.SchoolManager.StaffPastEmployments.Dto;
using TopazERP.Services.SchoolManager.StaffPastPositions;
using TopazERP.Services.SchoolManager.StaffPastPositions.Dto;
using TopazERP.Services.SchoolManager.StaffQualifications;
using TopazERP.Services.SchoolManager.StaffQualifications.Dto;
using TopazERP.Services.SchoolManager.StaffRelationships;
using TopazERP.Services.SchoolManager.StaffRelationships.Dto;
using TopazERP.Services.SchoolManager.TeacherClasses;
using TopazERP.Services.SchoolManager.TeacherClasses.Dto;
using TopazERP.Services.SchoolManager.TeacherSubjects;
using TopazERP.Services.SchoolManager.TeacherSubjects.Dto;

namespace TopazERP.Web.Controllers;

[AbpAuthorize(PermissionNames.Sm_StaffSetUps)]
public class SmStaffSetupsController: TopazERP.Controllers.TopazERPControllerBase
{
    private readonly IStaffDesignationAppService _staffDesignationAppService;
    private readonly IStaffBioAppService _staffBioAppService;
    private readonly IStaffGradeAppService _staffGradeAppService;
    private readonly IStaffPastEmploymentAppService _staffPastEmploymentAppService;
    private readonly IStaffPastPositionAppService _staffPastPositionAppService;
    private readonly IStaffQualificationAppService _staffQualificationAppService;
    private readonly IStaffRelationshipAppService _staffRelationshipAppService;
    private readonly ICertificateAppService _certificateAppService;
    private readonly ITeacherClassAppService _teacherClassAppService;
   private readonly ITeacherSubjectAppService _teacherSubjectAppService;

    public SmStaffSetupsController(IStaffDesignationAppService staffDesignationAppService, IStaffBioAppService staffBioAppService, IStaffGradeAppService staffGradeAppService, IStaffPastEmploymentAppService staffPastEmploymentAppService, IStaffPastPositionAppService staffPastPositionAppService, IStaffQualificationAppService staffQualificationAppService, IStaffRelationshipAppService staffRelationshipAppService, ICertificateAppService certificateAppService, ITeacherClassAppService teacherClassAppService, ITeacherSubjectAppService teacherSubjectAppService)
    {
        _staffDesignationAppService = staffDesignationAppService;
        _staffBioAppService = staffBioAppService;
        _staffGradeAppService = staffGradeAppService;
        _staffPastEmploymentAppService = staffPastEmploymentAppService;
        _staffPastPositionAppService = staffPastPositionAppService;
        _staffQualificationAppService = staffQualificationAppService;
        _staffRelationshipAppService = staffRelationshipAppService;
        _certificateAppService = certificateAppService;
        _teacherClassAppService = teacherClassAppService;
        _teacherSubjectAppService = teacherSubjectAppService;
    }
    public ActionResult StaffBio()
    {
        return View();
    }
    public ActionResult Certificates()
    {
        return View();
    }
    public ActionResult Designation()
    {
        return View();
    }
    public ActionResult Grades()
    {
        return View();
    }
    public ActionResult TeacherClasses()
    {
        return View();
    }
    public ActionResult TeacherSubjects()
    {
        return View();
    }
    public ActionResult CreateStaff()
    {
        return View();
    }
    public IActionResult UpdateStaff(Guid id)
    {
        ViewBag.StaffId = id;
        return View();
    }
    public IActionResult Qualification(Guid staffId)
    {
        ViewBag.StaffId = staffId;
        return View();
    }
    public IActionResult Relations(Guid staffId)
    {
        ViewBag.StaffId = staffId;
        return View();
    }
    public IActionResult PastEmployments(Guid staffId)
    {
        ViewBag.StaffId = staffId;
        return View();
    }
    public IActionResult PastPositions(Guid staffId)
    {
        ViewBag.StaffId = staffId;
        return View();
    }

     // ===== Certificates =====
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> ListAllCertificates()
        {
            var result = await _certificateAppService.ListAll();
            return Json(result);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> CreateCertificate([FromBody] CreateCertificateInput input)
        {
            var result = await _certificateAppService.Create(input);
            return Json(result);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> UpdateCertificate([FromBody] UpdateCertificateInput input)
        {
            await _certificateAppService.Update(input);
            return Json(200);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> DeleteCertificate([FromQuery] Guid id)
        {
            await _certificateAppService.Delete(id);
            return Json(200);
        }


        // ===== Staff Designations =====
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> ListAllStaffDesignations()
        {
            var result = await _staffDesignationAppService.ListAll();
            return Json(result);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> CreateStaffDesignation([FromBody] CreateStaffDesignationInput input)
        {
            var result = await _staffDesignationAppService.Create(input);
            return Json(result);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> UpdateStaffDesignation([FromBody] UpdateStaffDesignationInput input)
        {
            await _staffDesignationAppService.Update(input);
            return Json(200);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> DeleteStaffDesignation([FromQuery] Guid id)
        {
            await _staffDesignationAppService.Delete(id);
            return Json(200);
        }


        // ===== Staff Grades =====
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> ListAllStaffGrades()
        {
            var result = await _staffGradeAppService.ListAll();
            return Json(result);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> CreateStaffGrade([FromBody] CreateStaffGradeInput input)
        {
            var result = await _staffGradeAppService.Create(input);
            return Json(result);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> UpdateStaffGrade([FromBody] UpdateStaffGradeInput input)
        {
            await _staffGradeAppService.Update(input);
            return Json(200);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> DeleteStaffGrade([FromQuery] Guid id)
        {
            await _staffGradeAppService.Delete(id);
            return Json(200);
        }


        // ===== Staff Past Employment =====
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> ListAllStaffPastEmployments()
        {
            var result = await _staffPastEmploymentAppService.ListAll();
            return Json(result);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> CreateStaffPastEmployment([FromBody] CreateStaffPastEmploymentInput input)
        {
            var result = await _staffPastEmploymentAppService.Create(input);
            return Json(result);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> UpdateStaffPastEmployment([FromBody] UpdateStaffPastEmploymentInput input)
        {
            await _staffPastEmploymentAppService.Update(input);
            return Json(200);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> DeleteStaffPastEmployment([FromQuery] Guid id)
        {
            await _staffPastEmploymentAppService.Delete(id);
            return Json(200);
        }


        // ===== Staff Past Positions =====
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> ListAllStaffPastPositions()
        {
            var result = await _staffPastPositionAppService.ListAll();
            return Json(result);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> CreateStaffPastPosition([FromBody] CreateStaffPastPositionInput input)
        {
            var result = await _staffPastPositionAppService.Create(input);
            return Json(result);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> UpdateStaffPastPosition([FromBody] UpdateStaffPastPositionInput input)
        {
            await _staffPastPositionAppService.Update(input);
            return Json(200);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> DeleteStaffPastPosition([FromQuery] Guid id)
        {
            await _staffPastPositionAppService.Delete(id);
            return Json(200);
        }
        
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> ListAllStaffQualifications()
        {
            var result = await _staffQualificationAppService.ListAll();
            return Json(result);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> CreateStaffQualification([FromBody] CreateStaffQualificationInput input)
        {
            var result = await _staffQualificationAppService.Create(input);
            return Json(result);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> UpdateStaffQualification([FromBody] UpdateStaffQualificationInput input)
        {
            await _staffQualificationAppService.Update(input);
            return Json(200);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> DeleteStaffQualification([FromQuery] Guid id)
        {
            await _staffQualificationAppService.Delete(id);
            return Json(200);
        }


        // ===== Staff Relationships =====
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> ListAllStaffRelationships()
        {
            var result = await _staffRelationshipAppService.ListAll();
            return Json(result);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> CreateStaffRelationship([FromBody] CreateStaffRelationshipInput input)
        {
            var result = await _staffRelationshipAppService.Create(input);
            return Json(result);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> UpdateStaffRelationship([FromBody] UpdateStaffRelationshipInput input)
        {
            await _staffRelationshipAppService.Update(input);
            return Json(200);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> DeleteStaffRelationship([FromQuery] Guid id)
        {
            await _staffRelationshipAppService.Delete(id);
            return Json(200);
        }


        // ===== Teacher Classes =====
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> ListAllTeacherClasses()
        {
            var result = await _teacherClassAppService.ListAll();
            return Json(result);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> CreateTeacherClass([FromBody] CreateTeacherClassInput input)
        {
            var result = await _teacherClassAppService.Create(input);
            return Json(result);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> UpdateTeacherClass([FromBody] UpdateTeacherClassInput input)
        {
            await _teacherClassAppService.Update(input);
            return Json(200);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> DeleteTeacherClass([FromQuery] Guid id)
        {
            await _teacherClassAppService.Delete(id);
            return Json(200);
        }


        // ===== Teacher Subjects =====
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> ListAllTeacherSubjects()
        {
            var result = await _teacherSubjectAppService.ListAll();
            return Json(result);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> CreateTeacherSubject([FromBody] CreateTeacherSubjectInput input)
        {
            var result = await _teacherSubjectAppService.Create(input);
            return Json(result);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> UpdateTeacherSubject([FromBody] UpdateTeacherSubjectInput input)
        {
            await _teacherSubjectAppService.Update(input);
            return Json(200);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> DeleteTeacherSubject([FromQuery] Guid id)
        {
            await _teacherSubjectAppService.Delete(id);
            return Json(200);
        }
        
        // staffBio
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> ListAllStaffBios()
        {
            var result = await _staffBioAppService.ListAll();
            return Json(result);
        }

        [HttpPost]
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> CreateStaffBio([FromBody] CreateStaffBioInput input)
        {
            try
            {
                var result = await _staffBioAppService.Create(input);
                return Json(result);
            }
            catch (UserFriendlyException ex)
            {
                return Json(new { code = 400, message = ex.Message });
            }
        }
       
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> UpdateStaffBio([FromBody] UpdateStaffBioInput input)
        {
            await _staffBioAppService.Update(input);
            return Json(200);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> DeleteStaffBio([FromQuery] Guid id)
        {
            await _staffBioAppService.Delete(id);
            return Json(200);
        }
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetStaffBioById([FromQuery] Guid id)
        {
            var result = await _staffBioAppService.GetById(id);
            return Json(result);
        }
        
}