//
// Created by Emmanuel Addo-Odame on 15/10/2026.
//

#ifndef BUSINESSDESKAPI_GLSERVICE_H
#define BUSINESSDESKAPI_GLSERVICE_H
#include <drogon/drogon.h>
#include "dto/BaseApiResponse.h"
#include "dto/BaseGlDto.h"

namespace business_desk::domain_services {

    class GlService {
    public:
        //account head
        drogon::Task<dto::BaseApiResponse> getAllAccountHeads(int pageNo, int pageSize, const std::string &query);
        drogon::Task<dto::BaseApiResponse> createAccountHead(const dto::AccountHeadDto &dto);
        drogon::Task<dto::BaseApiResponse> updateAccountHead(const dto::AccountHeadDto &dto, const std::string &id);
        drogon::Task<dto::BaseApiResponse> deleteAccountHead(const std::string &id);

        //bank account
        drogon::Task<dto::BaseApiResponse> getAllBankAccounts(int pageNo, int pageSize, const std::string &query);
        drogon::Task<dto::BaseApiResponse> createBankAccount(const dto::BankAccountDto &dto);
        drogon::Task<dto::BaseApiResponse> updateBankAccount(const dto::BankAccountDto &dto, const std::string &id);
        drogon::Task<dto::BaseApiResponse> deleteBankAccount(const std::string &id);

        // chart of account control
        drogon::Task<dto::BaseApiResponse> getAllCoaControls(int pageNo, int pageSize, const std::string &query);
        drogon::Task<dto::BaseApiResponse> createCoaControl(const dto::ChartOfAccountControlDto &dto);
        drogon::Task<dto::BaseApiResponse> updateCoaControl(const dto::ChartOfAccountControlDto &dto, const std::string &id);
        drogon::Task<dto::BaseApiResponse> deleteCoaControl(const std::string &id);

        //chart of account detail
        drogon::Task<dto::BaseApiResponse> getAllCoaDetails(int pageNo, int pageSize, const std::string &query);
        drogon::Task<dto::BaseApiResponse> createCoaDetail(const dto::ChartOfAccountDetailDto &dto);
        drogon::Task<dto::BaseApiResponse> updateCoaDetail(const dto::ChartOfAccountDetailDto &dto, const std::string &id);
        drogon::Task<dto::BaseApiResponse> deleteCoaDetail(const std::string &id);

        //accounting unit
        drogon::Task<dto::BaseApiResponse> getAllAccountingUnits(int pageNo, int pageSize, const std::string &query);
        drogon::Task<dto::BaseApiResponse> createAccountingUnit(const dto::AccountingUnitDto &dto);
        drogon::Task<dto::BaseApiResponse> updateAccountingUnit(const dto::AccountingUnitDto &dto, const std::string &id);
        drogon::Task<dto::BaseApiResponse> deleteAccountingUnit(const std::string &id);

    };

}
#endif //BUSINESSDESKAPI_GLSERVICE_H
