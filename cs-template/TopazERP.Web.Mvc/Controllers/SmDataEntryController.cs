using System;
using System.Threading.Tasks;
using Abp.Authorization;
using Abp.Web.Models;
using Microsoft.AspNetCore.Mvc;
using TopazERP.Authorization;
using TopazERP.Services.SchoolManager.AssignSubjects;
using TopazERP.Services.SchoolManager.AssignSubjects.Dto;
using TopazERP.Services.SchoolManager.AwardsAndPrizes;
using TopazERP.Services.SchoolManager.AwardsAndPrizes.Dto;
using TopazERP.Services.SchoolManager.CategoryPercentages;
using TopazERP.Services.SchoolManager.CategoryPercentages.Dto;
using TopazERP.Services.SchoolManager.ClassAttendances;
using TopazERP.Services.SchoolManager.ClassAttendances.Dto;
using TopazERP.Services.SchoolManager.ClassLevelPercentages;
using TopazERP.Services.SchoolManager.ClassLevelPercentages.Dto;
using TopazERP.Services.SchoolManager.ClassPromotions;
using TopazERP.Services.SchoolManager.ClassPromotions.Dto;
using TopazERP.Services.SchoolManager.DisciplinaryActions;
using TopazERP.Services.SchoolManager.DisciplinaryActions.Dto;
using TopazERP.Services.SchoolManager.Excursions;
using TopazERP.Services.SchoolManager.Excursions.Dto;
using TopazERP.Services.SchoolManager.MidTermAssessments;
using TopazERP.Services.SchoolManager.MidTermAssessments.Dto;
using TopazERP.Services.SchoolManager.PtaExecutives;
using TopazERP.Services.SchoolManager.PtaExecutives.Dto;
using TopazERP.Services.SchoolManager.RegisterClasses;
using TopazERP.Services.SchoolManager.RegisterClasses.Dto;
using TopazERP.Services.SchoolManager.SubjectRemarks;
using TopazERP.Services.SchoolManager.SubjectRemarks.Dto;
using TopazERP.Services.SchoolManager.TimeTables;
using TopazERP.Services.SchoolManager.TimeTables.Dto;

namespace TopazERP.Web.Controllers;

[AbpAuthorize(PermissionNames.Sm_DataEntry)]
public class SmDataEntryController: TopazERP.Controllers.TopazERPControllerBase
{
    private readonly IRegisterClassAppService _registerClassAppService;
    private readonly IAssignSubjectAppService _assignSubjectAppService;
    private readonly ITimeTableAppService _timeTableAppService;
    private readonly ISubjectRemarkAppService _subjectRemarkAppService;
    private readonly IClassLevelPercentageAppService _classLevelPercentageAppService;
    private readonly ICategoryPercentageAppService _categoryPercentageAppService;
    private readonly IAwardAndPrizeAppService _awardAndPrizeAppService;
    private readonly IDisciplinaryActionAppService _disciplinaryActionAppService;
    private readonly IPtaExecutiveAppService _ptaExecutiveAppService;
    private readonly IExcursionAppService _excursionAppService;
    private readonly IAttendanceAppService _attendanceAppService;
    private readonly IClassPromotionAppService _classPromotionAppService;
    private readonly IMidTermAssessmentAppService _midTermAssessmentAppService;

    public SmDataEntryController(IRegisterClassAppService registerClassAppService, IAssignSubjectAppService assignSubjectAppService, ITimeTableAppService timeTableAppService, ISubjectRemarkAppService subjectRemarkAppService, IClassLevelPercentageAppService classLevelPercentageAppService, ICategoryPercentageAppService categoryPercentageAppService, IAwardAndPrizeAppService awardAndPrizeAppService, IDisciplinaryActionAppService disciplinaryActionAppService, IPtaExecutiveAppService ptaExecutiveAppService, IExcursionAppService excursionAppService, IAttendanceAppService attendanceAppService, IClassPromotionAppService classPromotionAppService, IMidTermAssessmentAppService midTermAssessmentAppService)
    {
        _registerClassAppService = registerClassAppService;
        _assignSubjectAppService = assignSubjectAppService;
        _timeTableAppService = timeTableAppService;
        _subjectRemarkAppService = subjectRemarkAppService;
        _classLevelPercentageAppService = classLevelPercentageAppService;
        _categoryPercentageAppService = categoryPercentageAppService;
        _awardAndPrizeAppService = awardAndPrizeAppService;
        _disciplinaryActionAppService = disciplinaryActionAppService;
        _ptaExecutiveAppService = ptaExecutiveAppService;
        _excursionAppService = excursionAppService;
        _attendanceAppService = attendanceAppService;
        _classPromotionAppService = classPromotionAppService;
        _midTermAssessmentAppService = midTermAssessmentAppService;
    }

    [AbpAuthorize(PermissionNames.Sm_DataEntry_RegisterClass)]
    public IActionResult RegisterClass()
    {
        return View();
    }

    [AbpAuthorize(PermissionNames.Sm_DataEntry_AssignSubject)]
    public IActionResult AssignSubject()
    {
        return View();
    }

    [AbpAuthorize(PermissionNames.Sm_DataEntry_TimeTable)]
    public IActionResult TimeTable()
    {
        return View();
    }

    [AbpAuthorize(PermissionNames.Sm_DataEntry_SubjectRemark)]
    public IActionResult SubjectRemark()
    {
        return View();
    }

    [AbpAuthorize(PermissionNames.Sm_DataEntry_ClassLevelPercentage)]
    public IActionResult ClassLevelPercentage()
    {
        return View();
    }

    [AbpAuthorize(PermissionNames.Sm_DataEntry_CategoryPercentage)]
    public IActionResult CategoryPercentage()
    {
        return View();
    }

    [AbpAuthorize(PermissionNames.Sm_DataEntry_PrizeType)]
    public IActionResult PrizeType()
    {
        return View();
    }

    [AbpAuthorize(PermissionNames.Sm_DataEntry_AwardType)]
    public IActionResult AwardType()
    {
        return View();
    }

    [AbpAuthorize(PermissionNames.Sm_DataEntry_PrizeAward)]
    public IActionResult PrizeAward()
    {
        return View();
    }

    [AbpAuthorize(PermissionNames.Sm_DataEntry_LegalGuardian)]
    public IActionResult LegalGuardian()
    {
        return View();
    }

    [AbpAuthorize(PermissionNames.Sm_DataEntry_DisciplinaryAction)]
    public IActionResult DisciplinaryAction()
    {
        return View();
    }

    [AbpAuthorize(PermissionNames.Sm_DataEntry_PtaExecutive)]
    public IActionResult PtaExecutive()
    {
        return View();
    }

    [AbpAuthorize(PermissionNames.Sm_DataEntry_ClassTrip)]
    public IActionResult ClassTrip()
    {
        return View();
    }

    [AbpAuthorize(PermissionNames.Sm_DataEntry_EndOfYearProcedure)]
    public IActionResult EndOfYearProcedure()
    {
        return View();
    }

    [AbpAuthorize(PermissionNames.Sm_DataEntry_ClassAttendance)]
    public IActionResult ClassAttendance()
    {
        return View();
    }

    [AbpAuthorize(PermissionNames.Sm_DataEntry_MidTermAssessment)]
    public IActionResult MidTermAssessment()
    {
        return View();
    }

    [AbpAuthorize(PermissionNames.Sm_DataEntry_AssignSubject)]
    public IActionResult AssignSubToMultipleClasses()
    {
        return View();
    }
    
    //register class apis
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<IActionResult> GetAllRegisteredClasses()
    {
        var result = await _registerClassAppService.ListAll();
        return Json(result);
    }
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> CreateRegisteredClass([FromBody]CreateRegisterClassInput input)
    {
        var result = await _registerClassAppService.Create(input);
        return Json(result);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> UpdateRegisteredClass([FromBody] UpdateRegisterClassInput input)
    {
        await _registerClassAppService.Update(input);
        return Json(200);
    }
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> DeleteRegisteredClass([FromQuery] Guid id)
    {
        await _registerClassAppService.Delete(id);
        return Json(200);
    }
    
    //assign subject apis
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<IActionResult> GetAllAssignedSubjects()
    {
        var result = await _assignSubjectAppService.ListAll();
        return Json(result);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> CreateAssignedSubject([FromBody]CreateAssignSubjectInput input)
    {
        var result = await _assignSubjectAppService.Create(input);
        return Json(result);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> UpdateAssignedSubject([FromBody] UpdateAssignSubjectInput input)
    {
        await _assignSubjectAppService.Update(input);
        return Json(200);
    }
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> DeleteAssignedSubject([FromQuery] Guid id)
    {
        await _assignSubjectAppService.Delete(id);
        return Json(200);
    }
    
    //time table apis
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<IActionResult> GetAllTimeTables()
    {
        var result = await _timeTableAppService.ListAll();
        return Json(result);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> CreateTimeTable([FromBody] CreateTimeTableInput input)
    {
        var result = await _timeTableAppService.Create(input);
        return Json(result);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> UpdateTimeTable([FromBody] UpdateTimeTableInput input)
    {
        await _timeTableAppService.Update(input);
        return Json(200);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> DeleteTimeTable([FromQuery] Guid id)
    {
        await _timeTableAppService.Delete(id);
        return Json(200);
    }
    
    //subject remark apis
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<IActionResult> GetAllSubjectRemarks()
    {
        var result = await _subjectRemarkAppService.ListAll();
        return Json(result);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> CreateSubjectRemark([FromBody] CreateSubjectRemarkInput input)
    {
        var result = await _subjectRemarkAppService.Create(input);
        return Json(result);
    }
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> UpdateSubjectRemark([FromBody] UpdateSubjectRemarkInput input)
    {
        await _subjectRemarkAppService.Update(input);
        return Json(200);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> DeleteSubjectRemark([FromQuery] Guid id)
    {
        await _subjectRemarkAppService.Delete(id);
        return Json(200);
    }
    //class level percentage apis
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<IActionResult> GetAllClassLevelPercentages()
    {
        var result = await _classLevelPercentageAppService.ListAll();
        return Json(result);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> CreateClassLevelPercentage([FromBody] CreateClassLevelPercentageInput input)
    {
        var result = await _classLevelPercentageAppService.Create(input);
        return Json(result);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> UpdateClassLevelPercentage([FromBody] UpdateClassLevelPercentageInput input)
    {
        await _classLevelPercentageAppService.Update(input);
        return Json(200);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> DeleteClassLevelPercentage([FromQuery] Guid id)
    {
        await _classLevelPercentageAppService.Delete(id);
        return Json(200);
    }
    //category percentage apis
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<IActionResult> GetAllCategoryPercentages()
    {
        var result = await _categoryPercentageAppService.ListAll();
        return Json(result);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> CreateCategoryPercentage([FromBody] CreateCategoryPercentageInput input)
    {
        var result = await _categoryPercentageAppService.Create(input);
        return Json(result);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> UpdateCategoryPercentage([FromBody] UpdateCategoryPercentageInput input)
    {
        await _categoryPercentageAppService.Update(input);
        return Json(200);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> DeleteCategoryPercentage([FromQuery] Guid id)
    {
        await _categoryPercentageAppService.Delete(id);
        return Json(200);
    }

    //award and prize apis
    // prize type
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<IActionResult> GetAllPrizeTypes()
    {
        var result = await _awardAndPrizeAppService.ListAllPrizes();
        return Json(result);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> CreatePrizeType([FromBody] CreatePrizeTypeInput input)
    {
        var result = await _awardAndPrizeAppService.CreatePrizeType(input);
        return Json(result);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> UpdatePrizeType([FromBody] UpdatePrizeTypeInput input)
    {
        await _awardAndPrizeAppService.UpdatePrizeType(input);
        return Json(200);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> DeletePrizeType([FromQuery] Guid id)
    {
        await _awardAndPrizeAppService.DeletePrizeType(id);
        return Json(200);
    }
    // award type
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<IActionResult> GetAllAwardTypes()
    {
        var result = await _awardAndPrizeAppService.ListAllAwards();
        return Json(result);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> CreateAwardType([FromBody] CreateAwardTypeInput input)
    {
        var result = await _awardAndPrizeAppService.CreateAwardType(input);
        return Json(result);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> UpdateAwardType([FromBody] UpdateAwardTypeInput input)
    {
        await _awardAndPrizeAppService.UpdateAwardType(input);
        return Json(200);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> DeleteAwardType([FromQuery] Guid id)
    {
        await _awardAndPrizeAppService.DeleteAwardType(id);
        return Json(200);
    }
    // prize award
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<IActionResult> GetAllPrizeAwards()
    {
        var result = await _awardAndPrizeAppService.ListAllPrizeAwards();
        return Json(result);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> CreatePrizeAward([FromBody] CreatePrizeAwardedInput input)
    {
        var result = await _awardAndPrizeAppService.CreatePrizeAward(input);
        return Json(result);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> UpdatePrizeAward([FromBody] UpdatePrizeAwardedInput input)
    {
        await _awardAndPrizeAppService.UpdatePrizeAward(input);
        return Json(200);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> DeletePrizeAward([FromQuery] Guid id)
    {
        await _awardAndPrizeAppService.DeletePrizeAward(id);
        return Json(200);
    }
    
    // pta executive apis
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<IActionResult> GetAllPtaExecutives()
    {
        var result = await _ptaExecutiveAppService.ListAll();
        return Json(result);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> CreatePtaExecutive([FromBody] CreatePtaExecutiveInput input)
    {
        var result = await _ptaExecutiveAppService.Create(input);
        return Json(result);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> UpdatePtaExecutive([FromBody] UpdatePtaExecutiveInput input)
    {
        await _ptaExecutiveAppService.Update(input);
        return Json(200);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> DeletePtaExecutive([FromQuery] Guid id)
    {
        await _ptaExecutiveAppService.Delete(id);
        return Json(200);
    }
    
    // disciplinary action apis
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<IActionResult> GetAllDisciplinaryActions()
    {
        var result = await _disciplinaryActionAppService.ListAllActions();
        return Json(result);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> CreateDisciplinaryAction([FromBody] CreateStudentDiscActionInput input)
    {
        var result = await _disciplinaryActionAppService.CreateStudentDiscAction(input);
        return Json(result);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> UpdateDisciplinaryAction([FromBody] UpdateStudentDiscActionInput input)
    {
        await _disciplinaryActionAppService.UpdateStudentDiscAction(input);
        return Json(200);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> DeleteDisciplinaryAction([FromQuery] Guid id)
    {
        await _disciplinaryActionAppService.DeleteStudentDiscAction(id);
        return Json(200);
    }
    
    //excursions
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<IActionResult> GetAllExcursions()
    {
        var result = await _excursionAppService.ListAll();
        return Json(result);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> CreateExcursion([FromBody] CreateExcursionInput input)
    {
        var result = await _excursionAppService.Create(input);
        return Json(result);
    }
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> UpdateExcursion([FromBody] UpdateExcursionInput input)
    {
        await _excursionAppService.Update(input);
        return Json(200);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> DeleteExcursion([FromQuery] Guid id)
    {
        await _excursionAppService.Delete(id);
        return Json(200);
    }
    // class attendance
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<IActionResult> GetAllClassAttendances()
    {
        var result = await _attendanceAppService.ListAll();
        return Json(result);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> CreateClassAttendance([FromBody] CreateAttendanceInput input)
    {
        var result = await _attendanceAppService.Create(input);
        return Json(result);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> UpdateClassAttendance([FromBody] UpdateAttendanceInput input)
    {
        await _attendanceAppService.Update(input);
        return Json(200);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> DeleteClassAttendance([FromQuery] Guid id)
    {
        await _attendanceAppService.Delete(id);
        return Json(200);
    }
// class promotions
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<IActionResult> GetAllClassPromotions()
    {
        var result = await _classPromotionAppService.ListAll();
        return Json(result);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> CreateClassPromotion([FromBody] CreateClassPromotionInput input)
    {
        var result = await _classPromotionAppService.Create(input);
        return Json(result);
    }
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> UpdateClassPromotion([FromBody] UpdateClassPromotionInput input)
    {
        await _classPromotionAppService.Update(input);
        return Json(200);
    }
    
    // mid term assessments
    // header apis
    
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<IActionResult> GetAllAssessmentHeader()
    {
        var result = await _midTermAssessmentAppService.ListAllAssessmentHeaders();
        return Json(result);
    }
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> CreateAssessmentHeader([FromBody] CreateAssessmentHeaderInput input)
    {
        var result = await _midTermAssessmentAppService.CreateHeader(input);
        return Json(result);
    }
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> UpdateAssessmentHeader([FromBody] UpdateAssessmentHeaderInput input)
    {
        await _midTermAssessmentAppService.UpdateHeader(input);
        return Json(200);
    }
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> DeleteHeader([FromQuery] Guid id)
    {
        await _midTermAssessmentAppService.DeleteHeader(id);
        return Json(200);
    }
    // main assessment apis
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<IActionResult> GetAllMidTermAssessments()
    {
        var result = await _midTermAssessmentAppService.ListAllMidTermAssessments();
        return Json(result);
    }
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> CreateMidTermAssessment([FromBody] CreateMTAssessmentInput input)
    {
        var result = await _midTermAssessmentAppService.CreateMidTermAssessment(input);
        return Json(result);
    }
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> UpdateMidTermAssessment([FromBody] UpdateMTAssessmentInput input)
    {
        await _midTermAssessmentAppService.UpdateMidTermAssessment(input);
        return Json(200);
    }
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> DeleteMidTermAssessment([FromQuery] Guid id)
    {
        await _midTermAssessmentAppService.DeleteMidTermAssessment(id);
        return Json(200);
    }
    



}