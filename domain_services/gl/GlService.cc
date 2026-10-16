//
// Created by Emmanuel Addo-Odame on 15/10/2026.
//

#include "dto/BaseApiResponse.h"
#include "GlService.h"

#include "GlAccountGroups.h"

using namespace drogon::orm;
using drogon_model::BusinessDesk::GlAccountGroups;

namespace business_desk::services {

    drogon::Task<dto::BaseApiResponse> GlService::getAllAccountHeads(int pageNo, int pageSize, const std::string &query) {

    auto dbClient = drogon::app().getDbClient();
    auto mp = drogon::orm::CoroMapper<GlAccountGroups>(dbClient);

    // 1. Build the search criteria
    drogon::orm::Criteria searchCriteria ;
    if (!query.empty()) {
      std::string likeQuery = "%" + query + "%";
      searchCriteria = searchCriteria && Criteria(GlAccountGroups::Cols::_name, CompareOperator::Like, likeQuery);
    }

    dto::BaseApiResponse response;

    try {
      // 2. Get the total count matching the criteria
      size_t totalCount = co_await mp.count(searchCriteria);
      if (totalCount == 0) {
        response.success = true;
        response.result["data"] = Json::arrayValue;
        response.result["totalCount"] = 0;
        response.result["totalPages"] = 0;
        response.result["pageNo"] = pageNo;
        response.result["pageSize"] = pageSize;
        co_return response;
      }

    // 3. Find the paginated data
    int offset = (pageNo - 1) * pageSize;
    auto accountGroups = co_await mp.limit(pageSize).offset(offset).findBy(searchCriteria);

    auto totalPages = (totalCount + pageSize - 1) / pageSize;

    // 4. Build the final response
    response.success = true;
    response.result["totalCount"] = (Json::UInt64)totalCount;
    response.result["pageNo"] = pageNo;
    response.result["pageSize"] = pageSize;
    response.result["totalPages"] = (int)((totalCount + pageSize - 1) / pageSize);
    response.result["lowerBound"] = pageSize * (pageNo - 1) + 1;
    response.result["upperBound"] = (int)totalPages == pageNo ? (Json::UInt64)totalCount  : (Json::UInt64)(pageNo * pageSize);

    Json::Value data = Json::arrayValue;

    for (const auto &accountGroup : accountGroups) {

      Json::Value accountGroupJson = accountGroup.toJson();
      Json::Value camelCaseAccountGroup;

      camelCaseAccountGroup["id"] = accountGroupJson["id"];
      camelCaseAccountGroup["name"] = accountGroupJson["name"];
      camelCaseAccountGroup["isActive"] = accountGroupJson["is_active"];
      camelCaseAccountGroup["accountType"] = accountGroupJson["standard_account_type"];
      camelCaseAccountGroup["parentGroupId"] = accountGroupJson["parent_group_id"];
      camelCaseAccountGroup["createdAt"] = accountGroupJson["created_at"];
      camelCaseAccountGroup["updatedAt"] = accountGroupJson["updated_at"];
      data.append(camelCaseAccountGroup);
    }
    response.result["data"] = data;

    } catch (const drogon::orm::DrogonDbException &e) {
      response.success = false;
      response.error["message"] = "Database error while fetching account heads.";
      response.error["detail"] = e.base().what();
    }
    co_return response;


    }

    drogon::Task<dto::BaseApiResponse> GlService::createAccountHead(const dto::AccountHeadDto &dto) {


      auto dbClient = drogon::app().getDbClient();
      auto mp = CoroMapper<GlAccountGroups>(dbClient);

      dto::BaseApiResponse response;
      try {
        GlAccountGroups newAccountGroup;
        newAccountGroup.setName(dto.getAccountHeadName());
        newAccountGroup.setIsActive(dto.getIsActive());
        newAccountGroup.setParentGroupId(dto.getParentHeadId());
        newAccountGroup.setStandardAccountType(dto.getIsActive());

        auto result = co_await mp.insert(newAccountGroup);
        response.success = true;
        response.result = result.toJson();

      } catch (const DrogonDbException &e) {
        response.success = false;
        response.error["message"] = "Database error while creating role.";
        response.error["detail"] = e.base().what();
      }
      co_return response;

    }

    drogon::Task<dto::BaseApiResponse> GlService::updateAccountHead(const dto::AccountHeadDto &dto, const std::string &id) {



    }

    drogon::Task<dto::BaseApiResponse> GlService::deleteAccountHead(const std::string &id) {




    }

    drogon::Task<dto::BaseApiResponse> GlService::getAllBankAccounts(int pageNo, int pageSize, const std::string &query) {




    }


    drogon::Task<dto::BaseApiResponse> GlService::createBankAccount(const dto::BankAccountDto &dto) {



    }

    drogon::Task<dto::BaseApiResponse> GlService::updateBankAccount(const dto::BankAccountDto &dto, const std::string &id) {




    }

    drogon::Task<dto::BaseApiResponse> GlService::deleteBankAccount(const std::string &id) {




    }

    drogon::Task<dto::BaseApiResponse> GlService::getAllCoaControls(int pageNo, int pageSize, const std::string &query) {



    }



    drogon::Task<dto::BaseApiResponse> GlService::createCoaControl(const dto::ChartOfAccountControlDto &dto) {




    }


    drogon::Task<dto::BaseApiResponse> GlService::updateCoaControl(const dto::ChartOfAccountControlDto &dto, const std::string &id) {




    }

    drogon::Task<dto::BaseApiResponse> GlService::deleteCoaControl(const std::string &id) {




    }


    drogon::Task<dto::BaseApiResponse> GlService::getAllCoaDetails(int pageNo, int pageSize, const std::string &query) {



    }

    drogon::Task<dto::BaseApiResponse> GlService::createCoaDetail(const dto::ChartOfAccountDetailDto &dto) {




    }

    drogon::Task<dto::BaseApiResponse> GlService::updateCoaDetail(const dto::ChartOfAccountDetailDto &dto, const std::string &id) {



    }

    drogon::Task<dto::BaseApiResponse> GlService::deleteCoaDetail(const std::string &id) {




    }

}
