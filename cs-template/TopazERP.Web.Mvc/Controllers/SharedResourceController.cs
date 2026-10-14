using Abp.Web.Models;
using Microsoft.AspNetCore.Mvc;
using TopazERP.DomainServices.Shared.Banks.Dto;
using TopazERP.Services.Shared.Banks;
using TopazERP.Services.Shared.Banks.Dto;
using TopazERP.Services.Shared.CostCenters;
using TopazERP.Services.Shared.CostCenters.Dto;
using TopazERP.Services.Shared.CountryStates;
using TopazERP.Services.Shared.CountryStates.Dto;
using TopazERP.Services.Shared.Cties;
using TopazERP.Services.Shared.Cties.Dto;
using TopazERP.Services.Shared.Currencies;
using TopazERP.Services.Shared.Currencies.Dto;
using TopazERP.Services.Shared.CustomerGroups;
using TopazERP.Services.Shared.CustomerGroups.Dto;
using TopazERP.Services.Shared.Customers;
using TopazERP.Services.Shared.Customers.Dto;
using TopazERP.Services.Shared.Departments;
using TopazERP.Services.Shared.Departments.Dto;
using TopazERP.Services.Shared.Relationships;
using TopazERP.Services.Shared.Relationships.Dto;
using TopazERP.Services.Shared.Religions;
using TopazERP.Services.Shared.Religions.Dto;
using TopazERP.Services.Shared.SupplierGroups;
using TopazERP.Services.Shared.SupplierGroups.Dto;
using TopazERP.Services.Shared.Suppliers;
using TopazERP.Services.Shared.Suppliers.Dto;
using TopazERP.Services.Shared.SystemNumbers;
using TopazERP.Services.Shared.SystemNumbers.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using TopazERP.Services.Shared.Countries.Dto;
using TopazERP.Services.Shared.Countries;
using TopazERP.Services.Shared.CompanyProfiles.Dto;
using TopazERP.Services.Shared.CompanyProfiles;
using TopazERP.Services.Shared.Statuses.Dto;
using TopazERP.Services.Shared.Statuses;
using TopazERP.Services.Shared.TaxLevies.Dto;
using TopazERP.Services.Shared.TaxLevies;


namespace TopazERP.Web.Controllers
{
    [Abp.AspNetCore.Mvc.Authorization.AbpMvcAuthorize]
    public class SharedResourceController : TopazERP.Controllers.TopazERPControllerBase
    {
        private readonly IRelationshipAppService _relationshipAppService;
        private readonly IReligionAppService _religionAppService;
        private readonly ICountryAppService  _countryAppService;
        private readonly ICurrencyAppService _currencyAppService;
        private readonly ISystemNumberAppService _systemNumberAppService;
        private readonly ISupplierGroupAppService _supplierGroupAppService;
        private readonly ICustomerGroupAppService _customerGroupAppService;
        private readonly IBankAppService _bankAppService;
        private readonly ICostCenterAppService _costCenterAppService;
        private readonly IDepartmentAppService _departmentAppService;
        private readonly ICustomerAppService _customerAppService;
        private readonly ISupplierAppService _supplierAppService;
        private readonly ICountryStateAppService _countryStateAppService;
        private readonly ICityAppService _cityAppService;
        private readonly ICompanyProfileAppService _companyProfileAppService;
        private readonly ITaxLevyAppService _taxLevyAppService; 
         
        
        private readonly IStatusAppService _statusAppService;
       
        
        public SharedResourceController(IReligionAppService religionAppService, IRelationshipAppService relationshipAppService, ICountryAppService countryAppService, ICurrencyAppService currencyAppService, ISystemNumberAppService systemNumberAppService, ISupplierGroupAppService supplierGroupAppService, ICustomerGroupAppService customerGroupAppService, IBankAppService bankAppService, ICostCenterAppService costCenterAppService, IDepartmentAppService departmentAppService, ICustomerAppService customerAppService, ISupplierAppService supplierAppService, ICountryStateAppService countryStateAppService, ICityAppService cityAppService, ICompanyProfileAppService companyProfileAppService, IStatusAppService statusAppService, ITaxLevyAppService taxLevyAppService)
        {
            _religionAppService = religionAppService;
            _relationshipAppService = relationshipAppService;
            _currencyAppService = currencyAppService;
            _systemNumberAppService = systemNumberAppService;
            _supplierGroupAppService = supplierGroupAppService;
            _customerGroupAppService = customerGroupAppService;
            _bankAppService = bankAppService;
            _costCenterAppService = costCenterAppService;
            _departmentAppService = departmentAppService;
            _customerAppService = customerAppService;
            _supplierAppService = supplierAppService;
            _countryAppService = countryAppService;
            _countryStateAppService = countryStateAppService;
            _cityAppService = cityAppService;
            _companyProfileAppService = companyProfileAppService;
            _taxLevyAppService = taxLevyAppService;
             
            _statusAppService = statusAppService;
            
        }

        //business profile...

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> CreateBusinessProfile([FromBody] CreateCompanyProfileInput input)
        {
            await _companyProfileAppService.Create(input);
            return Json(200);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> UpdateBusinessProfile([FromBody] UpdateCompanyProfileInput input)
        {
            await _companyProfileAppService.Update(input);
            return Json(200);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetBusinessProfile()
        {
            var result = await _companyProfileAppService.GetProfile();
            return Json(result);

        }
        //tax levies
        
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetTaxLevies([FromQuery]string type)
        {
            var result = await _taxLevyAppService.ListAll(type);
            return Json(result);
        }
         
        
         
        
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> CreateTaxLevy([FromBody] CreateTaxLevyInput input)
        {
            await _taxLevyAppService.Create(input);
            return Json(200);

        }
        
        public async Task<ActionResult> UpdateTaxLevy([FromBody] UpdateTaxLevyInput input)
        {
            await _taxLevyAppService.Update(input);
            return Json(200);
        }
        
        public async Task<ActionResult> DelTaxLevy([FromQuery] Guid id)
        {
            await _taxLevyAppService.Delete(id);
            return Json(200);
        }
        
            
        
        //countries

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetCountries()
        {
            var result = await _countryAppService.ListAll();
            return Json(result);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> CreateCountry([FromBody] CreateCountryInput input)
        {
            var result = await _countryAppService.Create(input);
            return Json(result);

        }

        public async Task<ActionResult> UpdateCountry([FromBody] UpdateCountryInput input)
        {
            await _countryAppService.Update(input);
            return Json(200);

        }

        public async Task<ActionResult> DelCountry([FromQuery] Guid id)
        {
            await _countryAppService.Delete(id);
            return Json(200);
        }

        //country states

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetCountryStates()
        {
            var result = await _countryStateAppService.ListAll();
            return Json(result);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> CreateCountryState([FromBody] CreateCountryStateInput input)
        {
            var result = await _countryStateAppService.Create(input);
            return Json(result);
        }

        public async Task<ActionResult> UpdateCountryState([FromBody] UpdateCountryStateInput input)
        {
            await _countryStateAppService.Update(input);
            return Json(200);

        }

        public async Task<ActionResult> DelCountryState([FromQuery] Guid id)
        {
            await _countryStateAppService.Delete(id);
            return Json(200);
        }

        //cities

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetCities()
        {
            var result = await _cityAppService.ListAll();
            return Json(result);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> CreateCity([FromBody] CreateCityInput input)
        {
            var result = await _cityAppService.Create(input);
            return Json(result);

        }

        public async Task<ActionResult> UpdateCity([FromBody] UpdateCityInput input)
        {
            await _cityAppService.Update(input);
            return Json(200);

        }

        public async Task<ActionResult> DelCity([FromQuery] Guid id)
        {
            await _cityAppService.Delete(id);
            return Json(200);
        }


        //RELIGION
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetReligions()
        {
            var result = await _religionAppService.ListAll();
            return Json(result);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> CreateReligion([FromBody] CreateReligionInput input)
        {
            var result = await _religionAppService.Create(input);
            return Json(result);

        }

        public async Task<ActionResult> UpdateReligion([FromBody] UpdateReligionInput input)
        {
            await _religionAppService.Update(input);
            return Json(200);

        }

        public async Task<ActionResult> DelReligion([FromQuery] Guid id)
        {
            await _religionAppService.Delete(id);
            return Json(200);
        }


        //relationsships
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetRelationships()
        {
            var result = await _relationshipAppService.ListAll();
            return Json(result);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> CreateRelationship([FromBody] CreateRelationshipInput input)
        {
            var result = await _relationshipAppService.Create(input);
            return Json(result);

        }

        public async Task<ActionResult> UpdateRelationship([FromBody] UpdateRelationshipInput input)
        {
            await _relationshipAppService.Update(input);
            return Json(200);

        }

        public async Task<ActionResult> DelRelationship([FromQuery] Guid id)
        {
            await _relationshipAppService.Delete(id);
            return Json(200);
        }


        //currency
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetCurrencys()
        {
            var result = await _currencyAppService.ListAll();
            return Json(result);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> CreateCurrency([FromBody] CreateCurrencyInput input)
        {
            var result = await _currencyAppService.Create(input);
            return Json(result);

        }

        public async Task<ActionResult> UpdateCurrency([FromBody] UpdateCurrencyInput input)
        {
            await _currencyAppService.Update(input);
            return Json(200);

        }

        public async Task<ActionResult> DelCurrency([FromQuery] Guid id)
        {
            await _currencyAppService.Delete(id);
            return Json(200);
        }

        //system numbers

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetSystemNumbers()
        {
            var result = await _systemNumberAppService.ListAll();
            return Json(result);
        }
        
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetSystemNumberInfo(string systemName)
        {
            var result = await _systemNumberAppService.GetInfoBySystemName(systemName);
            return Json(result);
        }
        
        

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> CreateSystemNumber([FromBody] CreateSystemNumberInput input)
        {
            var result = await _systemNumberAppService.Create(input);
            return Json(result);

        }

        public async Task<ActionResult> UpdateSystemNumber([FromBody] UpdateSystemNumberInput input)
        {
            await _systemNumberAppService.Update(input);
            return Json(200);

        }

        public async Task<ActionResult> DelSystemNumber([FromQuery] Guid id)
        {
            await _systemNumberAppService.Delete(id);
            return Json(200);
        }

        //supplier group...

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetSupplierGroups()
        {
            var result = await _supplierGroupAppService.ListAll();
            return Json(result);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> CreateSupplierGroup([FromBody] CreateSupplierGroupInput input)
        {
            var result = await _supplierGroupAppService.Create(input);
            return Json(result);

        }

        public async Task<ActionResult> UpdateSupplierGroup([FromBody] UpdateSupplierGroupInput input)
        {
            await _supplierGroupAppService.Update(input);
            return Json(200);

        }

        public async Task<ActionResult> DelSupplierGroup([FromQuery] Guid id)
        {
            await _supplierGroupAppService.Delete(id);
            return Json(200);
        }


        //customer groups...

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetCustomerGroups()
        {
            var result = await _customerGroupAppService.ListAll();
            return Json(result);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> CreateCustomerGroup([FromBody] CreateCustomerGroupInput input)
        {
            var result = await _customerGroupAppService.Create(input);
            return Json(result);

        }

        public async Task<ActionResult> UpdateCustomerGroup([FromBody] UpdateCustomerGroupInput input)
        {
            await _customerGroupAppService.Update(input);
            return Json(200);

        }

        public async Task<ActionResult> DelCustomerGroup([FromQuery] Guid id)
        {
            await _customerGroupAppService.Delete(id);
            return Json(200);
        }


        //banks...
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetBanks()
        {
            var result = await _bankAppService.ListAll();
            return Json(result);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> CreateBank([FromBody] CreateBankInput input)
        {
            var result = await _bankAppService.Create(input);
            return Json(result);
        }

        public async Task<ActionResult> UpdateBank([FromBody] UpdateBankInput input)
        {
            await _bankAppService.Update(input);
            return Json(200);

        }

        public async Task<ActionResult> DelBank([FromQuery] Guid id)
        {
            await _bankAppService.Delete(id);
            return Json(200);

        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> CreateBankBranch([FromBody] BranchInput input)
        {
            var result = await _bankAppService.CreateBranch(input);
            return Json(result);
        }

        public async Task<ActionResult> UpdateBankBranch([FromBody] BranchInput input)
        {
            await _bankAppService.UpdateBranch(input);
            return Json(200);

        }

        public async Task<ActionResult> DelBankBranch([FromBody] BranchInput input)
        {
            await _bankAppService.DeleteBranch(input);
            return Json(200);
        }

        //cost centers
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetCostCenters()
        {
            var result = await _costCenterAppService.ListAll();
            return Json(result);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> CreateCostCenter([FromBody] CreateCostCenterInput input)
        {
            var result = await _costCenterAppService.Create(input);
            return Json(result);
        }

        public async Task<ActionResult> UpdateCostCenter([FromBody] UpdateCostCenterInput input)
        {
            await _costCenterAppService.Update(input);
            return Json(200);

        }

        public async Task<ActionResult> DelCostCenter([FromQuery] Guid id)
        {
            await _costCenterAppService.Delete(id);
            return Json(200);
        }

        //department...
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetDepartments()
        {
            var result = await _departmentAppService.ListAll();
            return Json(result);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> CreateDepartment([FromBody] CreateDepartmentInput input)
        {
            var result = await _departmentAppService.Create(input);
            return Json(result);
        }

        public async Task<ActionResult> UpdateDepartment([FromBody] UpdateDepartmentInput input)
        {
            await _departmentAppService.Update(input);
            return Json(200);

        }

        public async Task<ActionResult> DelDepartment([FromQuery] Guid id)
        {
            await _departmentAppService.Delete(id);
            return Json(200);
        }

        //customers...

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetCustomers()
        {
            var result = await _customerAppService.ListAll();
            return Json(result);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetCustomersByGroup([FromQuery] Guid groupId)
        {
            var result = await _customerAppService.ListAllByGroup(groupId);
            return Json(result);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> CreateCustomer([FromBody] CreateCustomerInput input)
        {
            var result = await _customerAppService.Create(input);
            return Json(result);
        }

        public async Task<ActionResult> UpdateCustomer([FromBody] UpdateCustomerInput input)
        {
            await _customerAppService.Update(input);
            return Json(200);

        }

        public async Task<ActionResult> DelCustomer([FromQuery] Guid id)
        {
            await _customerAppService.Delete(id);
            return Json(200);
        }

        //suppliers

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetSuppliers()
        {
            var result = await _supplierAppService.ListAll();
            return Json(result);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetSuppliersByGroup([FromQuery] Guid groupId)
        {
            var result = await _supplierAppService.ListAllByGroup(groupId);
            return Json(result);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> CreateSupplier([FromBody] CreateSupplierInput input)
        {
            var result = await _supplierAppService.Create(input);
            return Json(result);
        }

        public async Task<ActionResult> UpdateSupplier([FromBody] UpdateSupplierInput input)
        {
            await _supplierAppService.Update(input);
            return Json(200);

        }

        public async Task<ActionResult> DelSupplier([FromQuery] Guid id)
        {
            await _supplierAppService.Delete(id);
            return Json(200);
        }

        
        //statuses
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetStatuses()
        {
            var result = await _statusAppService.ListAll();
            return Json(result);
        }
        
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> CreateStatus([FromBody] CreateStatusInput input)
        {
            var result = await _statusAppService.Create(input);
            return Json(result);

        }
        
        public async Task<ActionResult> UpdateStatus([FromBody] UpdateStatusInput input)
        {
            await _statusAppService.Update(input);
            return Json(200);
        }

        public async Task<ActionResult> DelStatus([FromQuery] Guid id)
        {
            await _statusAppService.Delete(id);
            return Json(200);
        }
        

    }
}
