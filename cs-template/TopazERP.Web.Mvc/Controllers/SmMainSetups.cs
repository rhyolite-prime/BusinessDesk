using System;
using System.Threading.Tasks;
using Abp.Web.Models;
using Microsoft.AspNetCore.Mvc;
using TopazERP.Controllers;
using TopazERP.DomainServices.SchoolManger.CutOffs;
using TopazERP.Services.SchoolManager.AcademicYears;
using TopazERP.Services.SchoolManager.AcademicYears.Dto;
using TopazERP.Services.SchoolManager.ActualLevels;
using TopazERP.Services.SchoolManager.ActualLevels.Dto;
using TopazERP.Services.SchoolManager.ClassesAndStreams;
using TopazERP.Services.SchoolManager.ClassesAndStreams.Dto;
using TopazERP.Services.SchoolManager.ClassRooms;
using TopazERP.Services.SchoolManager.ClassRooms.Dto;
using TopazERP.Services.SchoolManager.CutOffs;
using TopazERP.Services.SchoolManager.CutOffs.Dto;
using TopazERP.Services.SchoolManager.DisciplinaryActions;
using TopazERP.Services.SchoolManager.DisciplinaryActions.Dto;
using TopazERP.Services.SchoolManager.DistanceGroups;
using TopazERP.Services.SchoolManager.DistanceGroups.Dto;
using TopazERP.Services.SchoolManager.DistanceUnits;
using TopazERP.Services.SchoolManager.DistanceUnits.Dto;
using TopazERP.Services.SchoolManager.FeesDescriptions;
using TopazERP.Services.SchoolManager.FeesDescriptions.Dto;
using TopazERP.Services.SchoolManager.FeeSetUps;
using TopazERP.Services.SchoolManager.FeeSetUps.Dto;
using TopazERP.Services.SchoolManager.Healths;
using TopazERP.Services.SchoolManager.Healths.Dto;
using TopazERP.Services.SchoolManager.Hostels;
using TopazERP.Services.SchoolManager.Hostels.Dto;
using TopazERP.Services.SchoolManager.Languages;
using TopazERP.Services.SchoolManager.Languages.Dto;
using TopazERP.Services.SchoolManager.LevelsAndClasses;
using TopazERP.Services.SchoolManager.LevelsAndClasses.Dto;
using TopazERP.Services.SchoolManager.Locations;
using TopazERP.Services.SchoolManager.Locations.Dto;
using TopazERP.Services.SchoolManager.NurseryGradings;
using TopazERP.Services.SchoolManager.NurseryGradings.Dto;
using TopazERP.Services.SchoolManager.Offences;
using TopazERP.Services.SchoolManager.Offences.Dto;
using TopazERP.Services.SchoolManager.ParentProfessions;
using TopazERP.Services.SchoolManager.ParentProfessions.Dto;
using TopazERP.Services.SchoolManager.PaymentMethods;
using TopazERP.Services.SchoolManager.PaymentMethods.Dto;
using TopazERP.Services.SchoolManager.PerformanceAreas;
using TopazERP.Services.SchoolManager.PerformanceAreas.Dto;
using TopazERP.Services.SchoolManager.PtaPositions;
using TopazERP.Services.SchoolManager.PtaPositions.Dto;
using TopazERP.Services.SchoolManager.SchoolGroups;
using TopazERP.Services.SchoolManager.SchoolGroups.Dto;
using TopazERP.Services.SchoolManager.SchoolProfiles;
using TopazERP.Services.SchoolManager.SchoolProfiles.Dto;
using TopazERP.Services.SchoolManager.Subjects;
using TopazERP.Services.SchoolManager.Subjects.Dto;
using TopazERP.Services.SchoolManager.SupplementaryItems;
using TopazERP.Services.SchoolManager.SupplementaryItems.Dto;
using TopazERP.Services.SchoolManager.TerminalSubjects;
using TopazERP.Services.SchoolManager.TerminalSubjects.Dto;
using TopazERP.Services.SchoolManager.Terms;
using TopazERP.Services.SchoolManager.Terms.Dto;
using TopazERP.Services.SchoolManager.Titles;
using TopazERP.Services.SchoolManager.Titles.Dto;
using TopazERP.Services.SchoolManager.TransportationLocations;
using TopazERP.Services.SchoolManager.TransportationLocations.Dto;
using TopazERP.Services.SchoolManager.TransportationUnits;
using TopazERP.Services.SchoolManager.TransportationUnits.Dto;

namespace TopazERP.Web.Controllers;

[Abp.AspNetCore.Mvc.Authorization.AbpMvcAuthorize]
public class SmMainSetups : TopazERP.Controllers.TopazERPControllerBase
{
    private readonly ISchoolProfileAppService _schoolProfileAppService;
    private readonly IClassesAndStreamsAppService _classesAndStreamsAppService;
    private readonly IAcademicYearAppService _academicYearAppService;
    private readonly IActualLevelAppService _actualLevelAppService;
    private readonly ILevelAndClassAppService _levelAndClassAppService;
    private readonly ITermAppService _termAppService;
    private readonly ICutOffAppService _cutOffAppService;
    private readonly IDisciplinaryActionAppService _disciplinaryActionAppService;
    private readonly IDistanceUnitAppService _distanceUnitAppService;
    private readonly IHealthAppService _healthAppService;
    private readonly IDistanceGroupAppService _distanceGroupAppService;
    private readonly IFeesDescriptionAppService _feesDescriptionAppService;
    private readonly IParentProfessionAppService _parentProfessionAppService;
    private readonly ILanguageAppService _languageAppService;
    private readonly ILocationAppService _locationAppService;
    private readonly INurseryGradingAppService _nurseryGradingAppService;
    private readonly IOffenceAppService _offenceAppService;
    private readonly IPaymentMethodAppService _paymentMethodAppService;
    private readonly IPerformanceAreaAppService _performanceAreaAppService;
    private readonly IPtaPositionAppService _ptaPositionAppService;
    private readonly ISchoolGroupAppService _schoolGroupAppService;
    private readonly ISubjectAppService _subjectAppService;
    private readonly ISupplementaryItemAppService _supplementaryItemAppService;
    private readonly ITerminalSubjectAppService _terminalSubjectAppService;
    private readonly ITitleAppService _titleAppService;
    private readonly ITransportationLocationAppService _transportationLocationAppService;
    private readonly ITransportationUnitAppService _transportationUnitAppService;
    private readonly IHostelAppService _hostelAppService;
    private readonly IClassRoomAppService _classRoomAppService;
    private readonly IFeeSetUpAppService _feeSetUpAppService;
    

    public SmMainSetups(ISchoolProfileAppService schoolProfileAppService,
        IClassesAndStreamsAppService classesAndStreamsAppService, IAcademicYearAppService academicYearAppService,
        IActualLevelAppService actualLevelAppService, ILevelAndClassAppService levelAndClassAppService,
        ITermAppService termAppService, ICutOffAppService cutOffAppService,
        IDisciplinaryActionAppService disciplinaryActionAppService, IDistanceUnitAppService distanceUnitAppService,
        IHealthAppService healthAppService, IDistanceGroupAppService distanceGroupAppService,
        IFeesDescriptionAppService feesDescriptionAppService, IParentProfessionAppService parentProfessionAppService,
        ILanguageAppService languageAppService, ILocationAppService locationAppService,
        INurseryGradingAppService nurseryGradingAppService, IOffenceAppService offenceAppService,
        IPaymentMethodAppService paymentMethodAppService, IPerformanceAreaAppService performanceAreaAppService,
        IPtaPositionAppService ptaPositionAppService, ISchoolGroupAppService schoolGroupAppService,
        ISubjectAppService subjectAppService, ISupplementaryItemAppService supplementaryItemAppService,
        ITerminalSubjectAppService terminalSubjectAppService, ITitleAppService titleAppService,
        ITransportationLocationAppService transportationLocationAppService,
        ITransportationUnitAppService transportationUnitAppService, IHostelAppService hostelAppService, IClassRoomAppService classRoomAppService, IFeeSetUpAppService feeSetUpAppService)
    {
        _schoolProfileAppService = schoolProfileAppService;
        _classesAndStreamsAppService = classesAndStreamsAppService;
        _academicYearAppService = academicYearAppService;
        _actualLevelAppService = actualLevelAppService;
        _levelAndClassAppService = levelAndClassAppService;
        _termAppService = termAppService;
        _cutOffAppService = cutOffAppService;
        _disciplinaryActionAppService = disciplinaryActionAppService;
        _distanceUnitAppService = distanceUnitAppService;
        _healthAppService = healthAppService;
        _distanceGroupAppService = distanceGroupAppService;
        _feesDescriptionAppService = feesDescriptionAppService;
        _parentProfessionAppService = parentProfessionAppService;
        _languageAppService = languageAppService;
        _locationAppService = locationAppService;
        _nurseryGradingAppService = nurseryGradingAppService;
        _offenceAppService = offenceAppService;
        _paymentMethodAppService = paymentMethodAppService;
        _performanceAreaAppService = performanceAreaAppService;
        _ptaPositionAppService = ptaPositionAppService;
        _schoolGroupAppService = schoolGroupAppService;
        _subjectAppService = subjectAppService;
        _supplementaryItemAppService = supplementaryItemAppService;
        _terminalSubjectAppService = terminalSubjectAppService;
        _titleAppService = titleAppService;
        _transportationLocationAppService = transportationLocationAppService;
        _transportationUnitAppService = transportationUnitAppService;
        _hostelAppService = hostelAppService;
        _classRoomAppService = classRoomAppService;
        _feeSetUpAppService = feeSetUpAppService;
    }

    public IActionResult SchoolProfile()
    {
        return View();
    }

    public IActionResult CountriesCities()
    {
        return View();
    }

    public IActionResult Stream()
    {
        return View();
    }

    public IActionResult Class()
    {
        return View();
    }

    public IActionResult AcademicYear()
    {
        return View();
    }

    public IActionResult ActualLevel()
    {
        return View();
    }

    public IActionResult Term()
    {
        return View();
    }

    public IActionResult LevelClass()
    {
        return View();
    }

    public IActionResult ConductCutOff()
    {
        return View();
    }

    public IActionResult DisciplinaryAction()
    {
        return View();
    }

    public IActionResult DistanceUnit()
    {
        return View();
    }

    public IActionResult Language()
    {
        return View();
    }

    public IActionResult Offences()
    {
        return View();
    }

    public IActionResult PaymentMethods()
    {
        return View();
    }

    public IActionResult NurseryGrading()
    {
        return View();
    }

    public IActionResult PerformanceAreas()
    {
        return View();
    }

    public IActionResult PtaPosition()
    {
        return View();
    }

    public IActionResult ParentProfession()
    {
        return View();
    }

    public IActionResult Health()
    {
        return View();
    }

    public IActionResult FeesDescription()
    {
        return View();
    }

    public IActionResult TransportationUnit()
    {
        return View();
    }

    public IActionResult Location()
    {
        return View();
    }

    public IActionResult TransportationLocation()
    {
        return View();
    }

    public IActionResult DistanceGroups()
    {
        return View();
    }
    public IActionResult TerminalSubject()
    {
        return View();
    }
    public IActionResult SchoolGroup()
    {
        return View();
    }
    public IActionResult SupplementaryItem()
    {
        return View();
    }
    public IActionResult Subjects()
    {
        return View();
    }
    public IActionResult Titles()
    {
        return View();
    }
    public IActionResult Hostel()
    {
        return View();
    }
    public IActionResult ClassRooms()
    {
        return View();
    }
    public IActionResult BoardingItems()
    {
        return View();
    }

    // school profile
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> CreateSchoolProfile([FromBody] CreateSchoolProfileInput input)
    {
        await _schoolProfileAppService.Create(input);
        return Json(200);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> UpdateSchoolProfile([FromBody] UpdateSchoolProfileInput input)
    {
        await _schoolProfileAppService.Update(input);
        return Json(200);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> GetSchoolProfile()
    {
        var result = await _schoolProfileAppService.GetProfile();
        return Json(result);
    }

    //get current academic year from profile
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> GetCurrentAcademicYear()
    {
        var result = await _schoolProfileAppService.GetCurrentAcademicYear();
        return Json(result);
    }


    // academic year
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> ListAllAcademicYears()
    {
        var result = await _academicYearAppService.ListAll();
        return Json(result);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> CreateAcademicYear([FromBody] CreateAcademicYearInput input)
    {
        var result = await _academicYearAppService.Create(input);
        return Json(result);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> UpdateAcademicYear([FromBody] UpdateAcademicYearInput input)
    {
        await _academicYearAppService.Update(input);
        return Json(200);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> DeleteAcademicYear([FromQuery] Guid id)
    {
        await _academicYearAppService.Delete(id);
        return Json(200);
    }

    // academic year term
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> ListAllAcademicYearTerms()
    {
        var result = await _academicYearAppService.ListAllAcademicTerms();
        return Json(result);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> CreateAcademicYearTerm([FromBody] CreateAcademicYearTermInput input)
    {
        var result = await _academicYearAppService.CreateAcademicYearTerm(input);
        return Json(result);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> UpdateAcademicYearTerm([FromBody] UpdateAcademicYearTermInput input)
    {
        await _academicYearAppService.UpdateAcademicYearTerm(input);
        return Json(200);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> DeleteAcademicYearTerm([FromQuery] Guid id)
    {
        await _academicYearAppService.DeleteAcademicYearTerm(id);
        return Json(200);
    }

    // academic year term details
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> ListAllAcademicYearTermDetails()
    {
        var result = await _academicYearAppService.ListAllAcademicTermDetails();
        return Json(result);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> CreateAcademicYearTermDetail([FromBody] CreateAcademicYearTermDetailInput input)
    {
        var result = await _academicYearAppService.CreateAcademicYearTermDetail(input);
        return Json(result);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> UpdateAcademicYearTermDetail([FromBody] UpdateAcademicYearTermDetailInput input)
    {
        await _academicYearAppService.UpdateAcademicYearTermDetail(input);
        return Json(200);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> DeleteAcademicYearTermDetail([FromQuery] Guid id)
    {
        await _academicYearAppService.DeleteAcademicYearTermDetail(id);
        return Json(200);
    }

    // classes and streams
    //class
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> ListAllClasses()
    {
        var result = await _classesAndStreamsAppService.ListAllClasses();
        return Json(result);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> CreateClass([FromBody] CreateClassInput input)
    {
        var result = await _classesAndStreamsAppService.CreateClass(input);
        return Json(result);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> UpdateClass([FromBody] UpdateClassInput input)
    {
        await _classesAndStreamsAppService.UpdateClass(input);
        return Json(200);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> DeleteClass([FromQuery] Guid id)
    {
        await _classesAndStreamsAppService.DeleteClass(id);
        return Json(200);
    }

    //stream
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> ListAllStreams()
    {
        var result = await _classesAndStreamsAppService.ListAllStreams();
        return Json(result);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> CreateStream([FromBody] CreateStreamInput input)
    {
        var result = await _classesAndStreamsAppService.CreateStream(input);
        return Json(result);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> UpdateStream([FromBody] UpdateStreamInput input)
    {
        await _classesAndStreamsAppService.UpdateStream(input);
        return Json(200);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> DeleteStream([FromQuery] Guid id)
    {
        await _classesAndStreamsAppService.DeleteStream(id);
        return Json(200);
    }

    //level and levelclass
    // actual level
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> ListAllActualLevels()
    {
        var result = await _actualLevelAppService.ListAll();
        return Json(result);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> CreateActualLevel([FromBody] CreateActualLevelInput input)
    {
        var result = await _actualLevelAppService.Create(input);
        return Json(result);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> UpdateActualLevel([FromBody] UpdateActualLevelInput input)
    {
        await _actualLevelAppService.Update(input);
        return Json(200);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> DeleteActualLevel([FromQuery] Guid id)
    {
        await _actualLevelAppService.Delete(id);
        return Json(200);
    }

    //levelclass
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> ListAllLevelClasses()
    {
        var result = await _levelAndClassAppService.ListAllLevelClasses();
        return Json(result);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> CreateLevelClass([FromBody] CreateLevelClassInput input)
    {
        var result = await _levelAndClassAppService.CreateLevelClass(input);
        return Json(result);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> UpdateLevelClass([FromBody] UpdateLevelClassInput input)
    {
        await _levelAndClassAppService.UpdateLevelClass(input);
        return Json(200);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> DeleteLevelClass([FromQuery] Guid id)
    {
        await _levelAndClassAppService.DeleteLevelClass(id);
        return Json(200);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> ListAllLevels()
    {
        var result = await _levelAndClassAppService.ListAllLevels();
        return Json(result);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> CreateLevel([FromBody] CreateLevelInput input)
    {
        var result = await _levelAndClassAppService.CreateLevel(input);
        return Json(result);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> UpdateLevel([FromBody] UpdateLevelInput input)
    {
        await _levelAndClassAppService.UpdateLevel(input);
        return Json(200);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> DeleteLevel([FromQuery] Guid id)
    {
        await _levelAndClassAppService.DeleteLevel(id);
        return Json(200);
    }

    //term
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> ListAllTerms()
    {
        var result = await _termAppService.ListAll();
        return Json(result);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> CreateTerm([FromBody] CreateTermInput input)
    {
        var result = await _termAppService.Create(input);
        return Json(result);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> UpdateTerm([FromBody] UpdateTermInput input)
    {
        await _termAppService.Update(input);
        return Json(200);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> DeleteTerm([FromQuery] Guid id)
    {
        await _termAppService.Delete(id);
        return Json(200);
    }

    //cutoffs
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> ListAllCutOffs()
    {
        var result = await _cutOffAppService.ListAll();
        return Json(result);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> CreateCutOff([FromBody] CreateCutOffInput input)
    {
        var result = await _cutOffAppService.Create(input);
        return Json(result);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> UpdateCutOff([FromBody] UpdateCutOffInput input)
    {
        await _cutOffAppService.Update(input);
        return Json(200);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> DeleteCutOff([FromQuery] Guid id)
    {
        await _cutOffAppService.Delete(id);
        return Json(200);
    }

    // disciplinary actions
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> ListAllDisciplinaryActions()
    {
        var result = await _disciplinaryActionAppService.ListAll();
        return Json(result);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> CreateDisciplinaryAction([FromBody] CreateDisciplinaryActionInput input)
    {
        var result = await _disciplinaryActionAppService.Create(input);
        return Json(result);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> UpdateDisciplinaryAction([FromBody] UpdateDisciplinaryActionInput input)
    {
        await _disciplinaryActionAppService.Update(input);
        return Json(200);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> DeleteDisciplinaryAction([FromQuery] Guid id)
    {
        await _disciplinaryActionAppService.Delete(id);
        return Json(200);
    }

    //distance units
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> ListAllDistanceUnits()
    {
        var result = await _distanceUnitAppService.ListAll();
        return Json(result);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> CreateDistanceUnit([FromBody] CreateDistanceUnitInput input)
    {
        var result = await _distanceUnitAppService.Create(input);
        return Json(result);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> UpdateDistanceUnit([FromBody] UpdateDistanceUnitInput input)
    {
        await _distanceUnitAppService.Update(input);
        return Json(200);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> DeleteDistanceUnit([FromQuery] Guid id)
    {
        await _distanceUnitAppService.Delete(id);
        return Json(200);
    }

    //healths
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> ListAllHealths()
    {
        var result = await _healthAppService.ListAll();
        return Json(result);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> CreateHealth([FromBody] CreateHealthInput input)
    {
        var result = await _healthAppService.Create(input);
        return Json(result);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> UpdateHealth([FromBody] UpdateHealthInput input)
    {
        await _healthAppService.Update(input);
        return Json(200);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> DeleteHealth([FromQuery] Guid id)
    {
        await _healthAppService.Delete(id);
        return Json(200);
    }

    // === Distance Groups ===
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> ListAllDistanceGroups()
    {
        var result = await _distanceGroupAppService.ListAll();
        return Json(result);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> CreateDistanceGroup([FromBody] CreateDistanceGroupInput input)
    {
        var result = await _distanceGroupAppService.Create(input);
        return Json(result);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> UpdateDistanceGroup([FromBody] UpdateDistanceGroupInput input)
    {
        await _distanceGroupAppService.Update(input);
        return Json(200);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> DeleteDistanceGroup([FromQuery] Guid id)
    {
        await _distanceGroupAppService.Delete(id);
        return Json(200);
    }


// === Fees Descriptions ===
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> ListAllFeesDescriptions()
    {
        var result = await _feesDescriptionAppService.ListAll();
        return Json(result);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> CreateFeesDescription([FromBody] CreateFeesDescriptionInput input)
    {
        var result = await _feesDescriptionAppService.Create(input);
        return Json(result);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> UpdateFeesDescription([FromBody] UpdateFeesDescriptionInput input)
    {
        await _feesDescriptionAppService.Update(input);
        return Json(200);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> DeleteFeesDescription([FromQuery] Guid id)
    {
        await _feesDescriptionAppService.Delete(id);
        return Json(200);
    }


// === Parent Professions ===
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> ListAllParentProfessions()
    {
        var result = await _parentProfessionAppService.ListAll();
        return Json(result);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> CreateParentProfession([FromBody] CreateParentProfessionInput input)
    {
        var result = await _parentProfessionAppService.Create(input);
        return Json(result);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> UpdateParentProfession([FromBody] UpdateParentProfessionInput input)
    {
        await _parentProfessionAppService.Update(input);
        return Json(200);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> DeleteParentProfession([FromQuery] Guid id)
    {
        await _parentProfessionAppService.Delete(id);
        return Json(200);
    }


// === Languages ===
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> ListAllLanguages()
    {
        var result = await _languageAppService.ListAll();
        return Json(result);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> CreateLanguage([FromBody] CreateLanguageInput input)
    {
        var result = await _languageAppService.Create(input);
        return Json(result);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> UpdateLanguage([FromBody] UpdateLanguageInput input)
    {
        await _languageAppService.Update(input);
        return Json(200);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> DeleteLanguage([FromQuery] Guid id)
    {
        await _languageAppService.Delete(id);
        return Json(200);
    }


// === Locations ===
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> ListAllLocations()
    {
        var result = await _locationAppService.ListAll();
        return Json(result);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> CreateLocation([FromBody] CreateLocationInput input)
    {
        var result = await _locationAppService.Create(input);
        return Json(result);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> UpdateLocation([FromBody] UpdateLocationInput input)
    {
        await _locationAppService.Update(input);
        return Json(200);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> DeleteLocation([FromQuery] Guid id)
    {
        await _locationAppService.Delete(id);
        return Json(200);
    }
    
    // === Nursery Grading ===
[WrapResult(WrapOnSuccess = false, WrapOnError = false)]
public async Task<ActionResult> ListAllNurseryGradings()
{
    var result = await _nurseryGradingAppService.ListAll();
    return Json(result);
}

[WrapResult(WrapOnSuccess = false, WrapOnError = false)]
public async Task<ActionResult> CreateNurseryGrading([FromBody] CreateNurseryGradingInput input)
{
    var result = await _nurseryGradingAppService.Create(input);
    return Json(result);
}

[WrapResult(WrapOnSuccess = false, WrapOnError = false)]
public async Task<ActionResult> UpdateNurseryGrading([FromBody] UpdateNurseryGradingInput input)
{
    await _nurseryGradingAppService.Update(input);
    return Json(200);
}

[WrapResult(WrapOnSuccess = false, WrapOnError = false)]
public async Task<ActionResult> DeleteNurseryGrading([FromQuery] Guid id)
{
    await _nurseryGradingAppService.Delete(id);
    return Json(200);
}


// === Offences ===
[WrapResult(WrapOnSuccess = false, WrapOnError = false)]
public async Task<ActionResult> ListAllOffences()
{
    var result = await _offenceAppService.ListAll();
    return Json(result);
}

[WrapResult(WrapOnSuccess = false, WrapOnError = false)]
public async Task<ActionResult> CreateOffence([FromBody] CreateOffenceInput input)
{
    var result = await _offenceAppService.Create(input);
    return Json(result);
}

[WrapResult(WrapOnSuccess = false, WrapOnError = false)]
public async Task<ActionResult> UpdateOffence([FromBody] UpdateOffenceInput input)
{
    await _offenceAppService.Update(input);
    return Json(200);
}

[WrapResult(WrapOnSuccess = false, WrapOnError = false)]
public async Task<ActionResult> DeleteOffence([FromQuery] Guid id)
{
    await _offenceAppService.Delete(id);
    return Json(200);
}


// === Payment Methods ===
[WrapResult(WrapOnSuccess = false, WrapOnError = false)]
public async Task<ActionResult> ListAllPaymentMethods()
{
    var result = await _paymentMethodAppService.ListAll();
    return Json(result);
}

[WrapResult(WrapOnSuccess = false, WrapOnError = false)]
public async Task<ActionResult> CreatePaymentMethod([FromBody] CreatePaymentMethodInput input)
{
    var result = await _paymentMethodAppService.Create(input);
    return Json(result);
}

[WrapResult(WrapOnSuccess = false, WrapOnError = false)]
public async Task<ActionResult> UpdatePaymentMethod([FromBody] UpdatePaymentMethodInput input)
{
    await _paymentMethodAppService.Update(input);
    return Json(200);
}

[WrapResult(WrapOnSuccess = false, WrapOnError = false)]
public async Task<ActionResult> DeletePaymentMethod([FromQuery] Guid id)
{
    await _paymentMethodAppService.Delete(id);
    return Json(200);
}


// === PTA Positions ===
[WrapResult(WrapOnSuccess = false, WrapOnError = false)]
public async Task<ActionResult> ListAllPtaPositions()
{
    var result = await _ptaPositionAppService.ListAll();
    return Json(result);
}

[WrapResult(WrapOnSuccess = false, WrapOnError = false)]
public async Task<ActionResult> CreatePtaPosition([FromBody] CreatePtaPositionInput input)
{
    var result = await _ptaPositionAppService.Create(input);
    return Json(result);
}

[WrapResult(WrapOnSuccess = false, WrapOnError = false)]
public async Task<ActionResult> UpdatePtaPosition([FromBody] UpdatePtaPositionInput input)
{
    await _ptaPositionAppService.Update(input);
    return Json(200);
}

[WrapResult(WrapOnSuccess = false, WrapOnError = false)]
public async Task<ActionResult> DeletePtaPosition([FromQuery] Guid id)
{
    await _ptaPositionAppService.Delete(id);
    return Json(200);
}


// === Subjects ===
[WrapResult(WrapOnSuccess = false, WrapOnError = false)]
public async Task<ActionResult> ListAllSubjects()
{
    var result = await _subjectAppService.ListAll();
    return Json(result);
}

[WrapResult(WrapOnSuccess = false, WrapOnError = false)]
public async Task<ActionResult> CreateSubject([FromBody] CreateSubjectInput input)
{
    var result = await _subjectAppService.Create(input);
    return Json(result);
}

[WrapResult(WrapOnSuccess = false, WrapOnError = false)]
public async Task<ActionResult> UpdateSubject([FromBody] UpdateSubjectInput input)
{
    await _subjectAppService.Update(input);
    return Json(200);
}

[WrapResult(WrapOnSuccess = false, WrapOnError = false)]
public async Task<ActionResult> DeleteSubject([FromQuery] Guid id)
{
    await _subjectAppService.Delete(id);
    return Json(200);
}


// === Supplementary Items ===
[WrapResult(WrapOnSuccess = false, WrapOnError = false)]
public async Task<ActionResult> ListAllSupplementaryItems()
{
    var result = await _supplementaryItemAppService.ListAll();
    return Json(result);
}

[WrapResult(WrapOnSuccess = false, WrapOnError = false)]
public async Task<ActionResult> CreateSupplementaryItem([FromBody] CreateSupplementaryItemInput input)
{
    var result = await _supplementaryItemAppService.Create(input);
    return Json(result);
}

[WrapResult(WrapOnSuccess = false, WrapOnError = false)]
public async Task<ActionResult> UpdateSupplementaryItem([FromBody] UpdateSupplementaryItemInput input)
{
    await _supplementaryItemAppService.Update(input);
    return Json(200);
}

[WrapResult(WrapOnSuccess = false, WrapOnError = false)]
public async Task<ActionResult> DeleteSupplementaryItem([FromQuery] Guid id)
{
    await _supplementaryItemAppService.Delete(id);
    return Json(200);
}
// === Titles ===
[WrapResult(WrapOnSuccess = false, WrapOnError = false)]
public async Task<ActionResult> ListAllTitles()
{
    var result = await _titleAppService.ListAll();
    return Json(result);
}

[WrapResult(WrapOnSuccess = false, WrapOnError = false)]
public async Task<ActionResult> CreateTitle([FromBody] CreateTitleInput input)
{
    var result = await _titleAppService.Create(input);
    return Json(result);
}

[WrapResult(WrapOnSuccess = false, WrapOnError = false)]
public async Task<ActionResult> UpdateTitle([FromBody] UpdateTitleInput input)
{
    await _titleAppService.Update(input);
    return Json(200);
}

[WrapResult(WrapOnSuccess = false, WrapOnError = false)]
public async Task<ActionResult> DeleteTitle([FromQuery] Guid id)
{
    await _titleAppService.Delete(id);
    return Json(200);
}


// === Transportation Units ===
[WrapResult(WrapOnSuccess = false, WrapOnError = false)]
public async Task<ActionResult> ListAllTransportationUnits()
{
    var result = await _transportationUnitAppService.ListAll();
    return Json(result);
}

[WrapResult(WrapOnSuccess = false, WrapOnError = false)]
public async Task<ActionResult> CreateTransportationUnit([FromBody] CreateTransportationUnitInput input)
{
    var result = await _transportationUnitAppService.Create(input);
    return Json(result);
}

[WrapResult(WrapOnSuccess = false, WrapOnError = false)]
public async Task<ActionResult> UpdateTransportationUnit([FromBody] UpdateTransportationUnitInput input)
{
    await _transportationUnitAppService.Update(input);
    return Json(200);
}

[WrapResult(WrapOnSuccess = false, WrapOnError = false)]
public async Task<ActionResult> DeleteTransportationUnit([FromQuery] Guid id)
{
    await _transportationUnitAppService.Delete(id);
    return Json(200);
}


// === Transportation Locations ===
[WrapResult(WrapOnSuccess = false, WrapOnError = false)]
public async Task<ActionResult> ListAllTransportationLocations()
{
    var result = await _transportationLocationAppService.ListAll();
    return Json(result);
}

[WrapResult(WrapOnSuccess = false, WrapOnError = false)]
public async Task<ActionResult> CreateTransportationLocation([FromBody] CreateTransportationLocationInput input)
{
    var result = await _transportationLocationAppService.Create(input);
    return Json(result);
}

[WrapResult(WrapOnSuccess = false, WrapOnError = false)]
public async Task<ActionResult> UpdateTransportationLocation([FromBody] UpdateTransportationLocationInput input)
{
    await _transportationLocationAppService.Update(input);
    return Json(200);
}

[WrapResult(WrapOnSuccess = false, WrapOnError = false)]
public async Task<ActionResult> DeleteTransportationLocation([FromQuery] Guid id)
{
    await _transportationLocationAppService.Delete(id);
    return Json(200);
}


// === Performance Areas and skill===
[WrapResult(WrapOnSuccess = false, WrapOnError = false)]
public async Task<ActionResult> ListAllPerformanceAreas()
{
    var result = await _performanceAreaAppService.ListAll();
    return Json(result);
}

[WrapResult(WrapOnSuccess = false, WrapOnError = false)]
public async Task<ActionResult> CreatePerformanceArea([FromBody] CreatePerformanceAreaInput input)
{
    var result = await _performanceAreaAppService.Create(input);
    return Json(result);
}

[WrapResult(WrapOnSuccess = false, WrapOnError = false)]
public async Task<ActionResult> UpdatePerformanceArea([FromBody] UpdatePerformanceAreaInput input)
{
    await _performanceAreaAppService.Update(input);
    return Json(200);
}

[WrapResult(WrapOnSuccess = false, WrapOnError = false)]
public async Task<ActionResult> DeletePerformanceArea([FromQuery] Guid id)
{
    await _performanceAreaAppService.Delete(id);
    return Json(200);
}
[WrapResult(WrapOnSuccess = false, WrapOnError = false)]
public async Task<ActionResult> ListAllPerformanceSkills()
{
    var result = await _performanceAreaAppService.ListAllSkills();
    return Json(result);
}

[WrapResult(WrapOnSuccess = false, WrapOnError = false)]
public async Task<ActionResult> CreatePerformanceSkill([FromBody] CreatePerformanceSkillInput input)
{
    var result = await _performanceAreaAppService.CreateSkill(input);
    return Json(result);
}

[WrapResult(WrapOnSuccess = false, WrapOnError = false)]
public async Task<ActionResult> UpdatePerformanceSkill([FromBody] UpdatePerformanceSkillInput input)
{
    await _performanceAreaAppService.UpdateSkill(input);
    return Json(200);
}

[WrapResult(WrapOnSuccess = false, WrapOnError = false)]
public async Task<ActionResult> DeletePerformanceSkill([FromQuery] Guid id)
{
    await _performanceAreaAppService.DeleteSkill(id);
    return Json(200);
}

// === School Groups & positions===
[WrapResult(WrapOnSuccess = false, WrapOnError = false)]
public async Task<ActionResult> ListAllSchoolGroups()
{
    var result = await _schoolGroupAppService.ListAllGroups();
    return Json(result);
}

[WrapResult(WrapOnSuccess = false, WrapOnError = false)]
public async Task<ActionResult> CreateSchoolGroup([FromBody] CreateSchoolGroupInput input)
{
    var result = await _schoolGroupAppService.CreateGroup(input);
    return Json(result);
}

[WrapResult(WrapOnSuccess = false, WrapOnError = false)]
public async Task<ActionResult> UpdateSchoolGroup([FromBody] UpdateSchoolGroupInput input)
{
    await _schoolGroupAppService.UpdateGroup(input);
    return Json(200);
}

[WrapResult(WrapOnSuccess = false, WrapOnError = false)]
public async Task<ActionResult> DeleteSchoolGroup([FromQuery] Guid id)
{
    await _schoolGroupAppService.DeleteGroup(id);
    return Json(200);
}
[WrapResult(WrapOnSuccess = false, WrapOnError = false)]
public async Task<ActionResult> ListAllSchoolGroupPositions()
{
    var result = await _schoolGroupAppService.ListAllPositions();
    return Json(result);
}

[WrapResult(WrapOnSuccess = false, WrapOnError = false)]
public async Task<ActionResult> CreateSchoolGroupPosition([FromBody] CreateSchoolGroupPositionInput input)
{
    var result = await _schoolGroupAppService.CreatePosition(input);
    return Json(result);
}

[WrapResult(WrapOnSuccess = false, WrapOnError = false)]
public async Task<ActionResult> UpdateSchoolGroupPosition([FromBody] UpdateSchoolGroupPositionInput input)
{
    await _schoolGroupAppService.UpdatePosition(input);
    return Json(200);
}

[WrapResult(WrapOnSuccess = false, WrapOnError = false)]
public async Task<ActionResult> DeleteSchoolGroupPosition([FromQuery] Guid id)
{
    await _schoolGroupAppService.DeletePosition(id);
    return Json(200);
}


// === Terminal Subjects & sub subjects===
[WrapResult(WrapOnSuccess = false, WrapOnError = false)]
public async Task<ActionResult> ListAllTerminalSubjects()
{
    var result = await _terminalSubjectAppService.ListAll();
    return Json(result);
}

[WrapResult(WrapOnSuccess = false, WrapOnError = false)]
public async Task<ActionResult> CreateTerminalSubject([FromBody] CreateTerminalSubjectInput input)
{
    var result = await _terminalSubjectAppService.Create(input);
    return Json(result);
}

[WrapResult(WrapOnSuccess = false, WrapOnError = false)]
public async Task<ActionResult> UpdateTerminalSubject([FromBody] UpdateTerminalSubjectInput input)
{
    await _terminalSubjectAppService.Update(input);
    return Json(200);
}

[WrapResult(WrapOnSuccess = false, WrapOnError = false)]
public async Task<ActionResult> DeleteTerminalSubject([FromQuery] Guid id)
{
    await _terminalSubjectAppService.Delete(id);
    return Json(200);
}
[WrapResult(WrapOnSuccess = false, WrapOnError = false)]
public async Task<ActionResult> ListAllTerminalSubSubjects()
{
    var result = await _terminalSubjectAppService.ListAllSubSubjects();
    return Json(result);
}

[WrapResult(WrapOnSuccess = false, WrapOnError = false)]
public async Task<ActionResult> CreateTerminalSubSubject([FromBody] CreateTerminalSubSubjectInput input)
{
    var result = await _terminalSubjectAppService.CreateSubSubject(input);
    return Json(result);
}

[WrapResult(WrapOnSuccess = false, WrapOnError = false)]
public async Task<ActionResult> UpdateTerminalSubSubject([FromBody] UpdateTerminalSubSubjectInput input)
{
    await _terminalSubjectAppService.UpdateSubSubject(input);
    return Json(200);
}

[WrapResult(WrapOnSuccess = false, WrapOnError = false)]
public async Task<ActionResult> DeleteTerminalSubSubject([FromQuery] Guid id)
{
    await _terminalSubjectAppService.DeleteSubSubject(id);
    return Json(200);
}

    //Hostel
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> ListAllHostels()
    {
        var result = await _hostelAppService.ListAll();
        return Json(result);
    }
    
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> CreateHostel([FromBody] CreateHostelInput input)
    {
        var result = await _hostelAppService.Create(input);
        return Json(result);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> UpdateHostel([FromBody] UpdateHostelInput input)
    {
        await _hostelAppService.Update(input);
        return Json(200);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> DeleteHostel([FromQuery] Guid id)
    {
        await _hostelAppService.Delete(id);
        return Json(200);
    }
    
    // classrooms
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> ListAllClassrooms()
    {
        var result = await _classRoomAppService.ListAll();
        return Json(result);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> CreateClassroom([FromBody] CreateClassRoomInput input)
    {
        var result = await _classRoomAppService.Create(input);
        return Json(result);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> UpdateClassroom([FromBody] UpdateClassRoomInput input)
    {
        await _classRoomAppService.Update(input);
        return Json(200);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> DeleteClassroom([FromQuery] Guid id)
    {
        await _classRoomAppService.Delete(id);
        return Json(200);
    }

    
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<IActionResult> GetBoardingItems()
    {
        var result = await _feeSetUpAppService.ListAllBoardingItems();
        return Json(result);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> CreateBoardingItem([FromBody] CreateBoardingItemInput input)
    {
        var result = await _feeSetUpAppService.CreateBoardingItem(input);
        return Json(result);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> UpdateBoardingItem([FromBody] UpdateBoardingItemInput input)
    {
        await _feeSetUpAppService.UpdateBoardingItem(input);
        return Json(200);
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> DeleteBoardingItem([FromQuery] Guid id)
    {
        await _feeSetUpAppService.DeleteBoardingItem(id);
        return Json(200);
    }

}
