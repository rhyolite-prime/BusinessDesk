using System;
using System.Threading.Tasks;
using Abp.Authorization;
using Abp.UI;
using Abp.Web.Models;
using Microsoft.AspNetCore.Mvc;
using TopazERP.Authorization;
using TopazERP.DomainServices.SchoolManger.StudentStatuses;
using TopazERP.Services.SchoolManager.ChangeStudentStatuses;
using TopazERP.Services.SchoolManager.ChangeStudentStatuses.Dto;
using TopazERP.Services.SchoolManager.Houses;
using TopazERP.Services.SchoolManager.Houses.Dto;
using TopazERP.Services.SchoolManager.StContactRelationships;
using TopazERP.Services.SchoolManager.StContactRelationships.Dto;
using TopazERP.Services.SchoolManager.StudentAllergies;
using TopazERP.Services.SchoolManager.StudentAllergies.Dto;
using TopazERP.Services.SchoolManager.StudentBios;
using TopazERP.Services.SchoolManager.StudentBios.Dto;
using TopazERP.Services.SchoolManager.StudentDisabilities;
using TopazERP.Services.SchoolManager.StudentDisabilities.Dto;
using TopazERP.Services.SchoolManager.StudentImmunizations;
using TopazERP.Services.SchoolManager.StudentImmunizations.Dto;
using TopazERP.Services.SchoolManager.StudentMedicals;
using TopazERP.Services.SchoolManager.StudentMedicals.Dto;
using TopazERP.Services.SchoolManager.StudentPositions;
using TopazERP.Services.SchoolManager.StudentPositions.Dto;
using TopazERP.Services.SchoolManager.StudentStatuses;
using TopazERP.Services.SchoolManager.StudentStatuses.Dto;

namespace TopazERP.Web.Controllers;

[AbpAuthorize(PermissionNames.Sm_StudentSetUps)]
public class SmStudentSetupsController : TopazERP.Controllers.TopazERPControllerBase
{
    private readonly IStContactRelationshipAppService _stContactRelationshipAppService;
    private readonly IStudentAllergyAppService _studentAllergyAppService;
    private readonly IStudentDisabilityAppService _studentDisabilityAppService;
    private readonly IStudentImmunizationAppService _studentImmunizationAppService;
    private readonly IStudentPositionAppService _studentPositionAppService;
    private readonly IStudentBioAppService _studentBioAppService;
    private readonly IStudentStatusAppService _studentStatusAppService;
    private readonly IStudentMedicalAppService _studentMedicalAppService;
    private readonly IChangeStudentStatusAppService _changeStudentStatusAppService;
    private readonly IHouseAppService _houseAppService;

    public SmStudentSetupsController(IStContactRelationshipAppService stContactRelationshipAppService, IStudentAllergyAppService studentAllergyAppService, IStudentDisabilityAppService studentDisabilityAppService, IStudentImmunizationAppService studentImmunizationAppService, IStudentPositionAppService studentPositionAppService, IStudentBioAppService studentBioAppService, IStudentStatusAppService studentStatusAppService, IStudentMedicalAppService studentMedicalAppService, IChangeStudentStatusAppService changeStudentStatusAppService, IHouseAppService houseAppService)
    {
        _stContactRelationshipAppService = stContactRelationshipAppService;
        _studentAllergyAppService = studentAllergyAppService;
        _studentDisabilityAppService = studentDisabilityAppService;
        _studentImmunizationAppService = studentImmunizationAppService;
        _studentPositionAppService = studentPositionAppService;
        _studentBioAppService = studentBioAppService;
        _studentStatusAppService = studentStatusAppService;
        _studentMedicalAppService = studentMedicalAppService;
        _changeStudentStatusAppService = changeStudentStatusAppService;
        _houseAppService = houseAppService;
    }
    
    public ActionResult Allergies()
    {
        return View();
    }
    
    public ActionResult Disabilities()
    {
        return View();
    }
    
    public ActionResult Immunizations()
    {
        return View();
    }
    
    public ActionResult Positions()
    {
        return View();
    }
    
    public ActionResult ContactRelationships(Guid studentId)
    {
        ViewBag.StudentId = studentId;
        return View();
    }
    public ActionResult StudentBio()
    {
        return View();
    }
    public ActionResult PreClassStudents()
    {
        return View();
    }
    public ActionResult StudentStatus()
    {
        return View();
    }
    public ActionResult AddStudent()
    {
        return View();
    }
    public ActionResult AddPreClassStudents()
    {
        return View();
    }
    public ActionResult EditStudent(Guid id)
    {
        ViewBag.StudentId = id;
        return View();
    }
    public ActionResult EditPreClassStudents(Guid id)
    {
        ViewBag.StudentId = id;
        return View();
    }
    public ActionResult StudentAllergy(Guid studentId)
    {
        ViewBag.StudentId = studentId;
        return View();
    }
    public ActionResult StudentDisability(Guid studentId)
    {
        ViewBag.StudentId = studentId;
        return View();
    }
    public ActionResult StudentPosition(Guid studentId)
    {
        ViewBag.StudentId = studentId;
        return View();
    }
    public ActionResult StudentMedicals(Guid studentId)
    {
        ViewBag.StudentId = studentId;
        return View();
    }
    public ActionResult ChangeStatus(Guid studentId)
    {
        ViewBag.StudentId = studentId;
        return View();
    }
    public ActionResult Houses()
    {
        return View();
    }
    
    // apis 
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> ListAllStContactRelationship()
    {
        var result = await _stContactRelationshipAppService.ListAll();
        return Json(result);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> CreateStContactRelationship([FromBody] CreateStContactRelationshipInput input)
    {
        var result = await _stContactRelationshipAppService.Create(input);
        return Json(result);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> UpdateStContactRelationship([FromBody] UpdateStContactRelationshipInput input)
    {
        await _stContactRelationshipAppService.Update(input);
        return Json(200);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> DeleteStContactRelationship([FromQuery] Guid id)
    {
        await _stContactRelationshipAppService.Delete(id);
        return Json(200);
    }
    
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> ListAllAllergy()
    {
        var result = await _studentAllergyAppService.ListAll();
        return Json(result);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> CreateAllergy([FromBody] CreateAllergyInput input)
    {
        var result = await _studentAllergyAppService.Create(input);
        return Json(result);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> UpdateAllergy([FromBody] UpdateAllergyInput input)
    {
        await _studentAllergyAppService.Update(input);
        return Json(200);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> DeleteAllergy([FromQuery] Guid id)
    {
        await _studentAllergyAppService.Delete(id);
        return Json(200);
    }
    // student specific allergy apis
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> ListStudentAllergy([FromQuery] Guid studentId)
    {
        var result = await _studentAllergyAppService.ListByStudentId(studentId);
        return Json(result);
    }
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> CreateStudentAllergy([FromBody] CreateStudentAllergyInput input)
    {
        var result = await _studentAllergyAppService.CreateStudentAllergy(input);
        return Json(result);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> UpdateStudentAllergy([FromBody] UpdateStudentAllergyInput input)
    {
        await _studentAllergyAppService.UpdateStudentAllergy(input);
        return Json(200);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> DeleteStudentAllergy([FromQuery] Guid id)
    {
        await _studentAllergyAppService.DeleteStudentAllergy(id);
        return Json(200);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> ListAllDisability()
    {
        var result = await _studentDisabilityAppService.ListAll();
        return Json(result);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> CreateDisability([FromBody] CreateDisabilityInput input)
    {
        var result = await _studentDisabilityAppService.Create(input);
        return Json(result);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> UpdateDisability([FromBody] UpdateDisabilityInput input)
    {
        await _studentDisabilityAppService.Update(input);
        return Json(200);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> DeleteDisability([FromQuery] Guid id)
    {
        await _studentDisabilityAppService.Delete(id);
        return Json(200);
    }
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> ListStudentDisability([FromQuery] Guid studentId)
    {
        var result = await _studentDisabilityAppService.ListByStudentId(studentId);
        return Json(result);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> CreateStudentDisability([FromBody] CreateStudentDisabilityInput input)
    {
        var result = await _studentDisabilityAppService.CreateForStudent(input);
        return Json(result);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> UpdateStudentDisability([FromBody] UpdateStudentDisabilityInput input)
    {
        await _studentDisabilityAppService.UpdateForStudent(input);
        return Json(200);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> DeleteStudentDisability([FromQuery] Guid id)
    {
        await _studentDisabilityAppService.DeleteForStudent(id);
        return Json(200);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> ListAllImmunization()
    {
        var result = await _studentImmunizationAppService.ListAll();
        return Json(result);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> CreateImmunization([FromBody] CreateImmunizationInput input)
    {
        var result = await _studentImmunizationAppService.Create(input);
        return Json(result);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> UpdateImmunization([FromBody] UpdateImmunizationInput input)
    {
        await _studentImmunizationAppService.Update(input);
        return Json(200);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> DeleteImmunization([FromQuery] Guid id)
    {
        await _studentImmunizationAppService.Delete(id);
        return Json(200);
    }
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> ListStudentImmunization([FromQuery] Guid studentId)
    {
        var result = await _studentImmunizationAppService.ListAllForStudent(studentId);
        return Json(result);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> CreateStudentImmunization([FromBody] CreateStudentImmunizationInput input)
    {
        var result = await _studentImmunizationAppService.CreateForStudent(input);
        return Json(result);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> UpdateStudentImmunization([FromBody] UpdateStudentImmunizationInput input)
    {
        await _studentImmunizationAppService.UpdateForStudent(input);
        return Json(200);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> DeleteStudentImmunization([FromQuery] Guid id)
    {
        await _studentImmunizationAppService.DeleteForStudent(id);
        return Json(200);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> ListAllPosition()
    {
        var result = await _studentPositionAppService.ListAll();
        return Json(result);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> CreatePosition([FromBody] CreatePositionInput input)
    {
        var result = await _studentPositionAppService.Create(input);
        return Json(result);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> UpdatePosition([FromBody] UpdatePositionInput input)
    {
        await _studentPositionAppService.Update(input);
        return Json(200);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> DeletePosition([FromQuery] Guid id)
    {
        await _studentPositionAppService.Delete(id);
        return Json(200);
    }
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> ListStudentPosition([FromQuery] Guid studentId)
    {
        var result = await _studentPositionAppService.ListByStudentId(studentId);
        return Json(result);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> CreateStudentPosition([FromBody] CreateStudentPositionInput input)
    {
        var result = await _studentPositionAppService.CreateForStudent(input);
        return Json(result);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> UpdateStudentPosition([FromBody] UpdateStudentPositionInput input)
    {
        await _studentPositionAppService.UpdateForStudent(input);
        return Json(200);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> DeleteStudentPosition([FromQuery] Guid id)
    {
        await _studentPositionAppService.DeleteForStudent(id);
        return Json(200);
    }
    
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> ListAllStudents()
    {
        var result = await _studentBioAppService.ListAll();
        return Json(result);
    }

    [HttpPost]
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> CreateStudent([FromBody] CreateStudentBioInput input)
    {
        try
        {
            var result = await _studentBioAppService.Create(input);
            return Json(result);
        }
        catch (UserFriendlyException ex)
        {
            return Json(new { code = 400, message = ex.Message });
        }
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> UpdateStudent([FromBody] UpdateStudentBioInput input)
    {
        await _studentBioAppService.Update(input);
        return Json(200);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> DeleteStudent([FromQuery] Guid id)
    {
        await _studentBioAppService.Delete(id);
        return Json(200);
    }
    
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> GetStudentById([FromQuery] Guid id)
    {
        var result = await _studentBioAppService.GetById(id);
        return Json(result);
    }
    
    // student status
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> ListAllStudentStatuses()
    {
        var result = await _studentStatusAppService.ListAll();
        return Json(result);
    }
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> CreateStudentStaus([FromBody] CreateStudentStatusInput input)
    {
        var result = await _studentStatusAppService.Create(input);
        return Json(result);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> UpdateStudentStatus([FromBody] UpdateStudentStatusInput input)
    {
        await _studentStatusAppService.Update(input);
        return Json(200);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> DeleteStudentStatus([FromQuery] Guid id)
    {
        await _studentStatusAppService.Delete(id);
        return Json(200);
    }
    
    // student medicals
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> ListStudentMedicals([FromQuery] Guid studentId)
    {
        var result = await _studentMedicalAppService.ListByStudentId(studentId);
        return Json(result);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> CreateStudentMedical([FromBody] CreateStudentMedicalInput input)
    {
        var result = await _studentMedicalAppService.Create(input);
        return Json(result);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> UpdateStudentMedical([FromBody] UpdateStudentMedicalInput input)
    {
        await _studentMedicalAppService.Update(input);
        return Json(200);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> DeleteStudentMedical([FromQuery] Guid id)
    {
        await _studentMedicalAppService.Delete(id);
        return Json(200);
    }
    
    //change student status
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> ChangeStudentStatus([FromBody] CreateChangeStudentStatusInput input)
    {
        await _changeStudentStatusAppService.Create(input);
        return Json(200);
    }
    
    //houses
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> ListAllHouses()
    {
        var result = await _houseAppService.ListAll();
        return Json(result);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> CreateHouse([FromBody] CreateHouseInput input)
    {
        var result = await _houseAppService.Create(input);
        return Json(result);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> UpdateHouse([FromBody] UpdateHouseInput input)
    {
        await _houseAppService.Update(input);
        return Json(200);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> DeleteHouse([FromQuery] Guid id)
    {
        await _houseAppService.Delete(id);
        return Json(200);
    }
}