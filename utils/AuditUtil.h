/**
 * Audit utility for populating row auditing fields.
 *
 * The JWT authentication filters (TenantJwtAuthFilter and
 * HostJwtAuthFilter) verify the bearer token and publish the
 * caller's identity on the request attributes. The utilities
 * below extract that identity and stamp the auditing columns
 * (tenant, actor, timestamps) onto domain models so that
 * create, update, and delete operations record who did what
 * without every service method repeating the plumbing.
 */

#pragma once

#include <drogon/HttpRequest.h>
#include <trantor/utils/Date.h>

#include <string>

namespace business_desk {
namespace utils {

/**
 * The calling identity extracted from a request that has passed
 * a JWT authentication filter. Either field may be empty when
 * the attribute is absent, for example on internal or unauthenticated
 * calls; auditors skip empty values.
 */
struct AuditIdentity {
    std::string tenantId;
    std::string userId;

    [[nodiscard]] bool hasTenant() const { return !tenantId.empty(); }
    [[nodiscard]] bool hasUser() const { return !userId.empty(); }
};

/**
 * Reads the identity claims that the JWT filters attached to the
 * request. TenantJwtAuthFilter publishes "tenantId" and
 * "tenantUserId"; HostJwtAuthFilter publishes "hostUserId".
 */
inline AuditIdentity extractAuditIdentity(const drogon::HttpRequestPtr &request)
{
    AuditIdentity identity;
    const auto &attributes = request->attributes();
    if (attributes->find("tenantId")) {
        identity.tenantId = attributes->get<std::string>("tenantId");
    }
    if (attributes->find("tenantUserId")) {
        identity.userId = attributes->get<std::string>("tenantUserId");
    } else if (attributes->find("hostUserId")) {
        identity.userId = attributes->get<std::string>("hostUserId");
    }
    return identity;
}

// Setter detection so the auditors work with every generated model
// and simply skip columns a table does not carry.
template <typename Model>
concept HasTenantId = requires(Model &model, const std::string &value) {
    model.setTenantId(value);
};
template <typename Model>
concept HasCreatedByUserId = requires(Model &model, const std::string &value) {
    model.setCreatedByUserId(value);
};
template <typename Model>
concept HasLastModifiedByUserId = requires(Model &model, const std::string &value) {
    model.setLastModifiedByUserId(value);
};
template <typename Model>
concept HasDeletedByUserId = requires(Model &model, const std::string &value) {
    model.setDeletedByUserId(value);
};
template <typename Model>
concept HasCreatedAt = requires(Model &model, const trantor::Date &value) {
    model.setCreatedAt(value);
};
template <typename Model>
concept HasLastModifiedAt = requires(Model &model, const trantor::Date &value) {
    model.setLastModifiedAt(value);
};
template <typename Model>
concept HasDeletedAt = requires(Model &model, const trantor::Date &value) {
    model.setDeletedAt(value);
};

/** Stamps the fields recorded when a row is created. */
template <typename Model>
void applyCreateAudit(Model &model, const AuditIdentity &identity)
{
    if constexpr (HasTenantId<Model>) {
        if (identity.hasTenant()) {
            model.setTenantId(identity.tenantId);
        }
    }
    if constexpr (HasCreatedByUserId<Model>) {
        if (identity.hasUser()) {
            model.setCreatedByUserId(identity.userId);
        }
    }
    if constexpr (HasCreatedAt<Model>) {
        model.setCreatedAt(trantor::Date::now());
    }
    if constexpr (requires { model.setCreationTime(trantor::Date::now()); }) {
        model.setCreationTime(trantor::Date::now());
    }
    if constexpr (requires { model.setCreatorUserId(identity.userId); }) {
        if (identity.hasUser()) model.setCreatorUserId(identity.userId);
    }
    if constexpr (HasLastModifiedByUserId<Model>) {
        if (identity.hasUser()) {
            model.setLastModifiedByUserId(identity.userId);
        }
    }
    if constexpr (HasLastModifiedAt<Model>) {
        model.setLastModifiedAt(trantor::Date::now());
    }
    if constexpr (requires { model.setLastModificationTime(trantor::Date::now()); }) {
        model.setLastModificationTime(trantor::Date::now());
    }
    if constexpr (requires { model.setLastModifierUserId(identity.userId); }) {
        if (identity.hasUser()) model.setLastModifierUserId(identity.userId);
    }
}

/** Stamps the fields recorded when a row is modified. */
template <typename Model>
void applyUpdateAudit(Model &model, const AuditIdentity &identity)
{
    if constexpr (HasLastModifiedByUserId<Model>) {
        if (identity.hasUser()) {
            model.setLastModifiedByUserId(identity.userId);
        }
    }
    if constexpr (HasLastModifiedAt<Model>) {
        model.setLastModifiedAt(trantor::Date::now());
    }
    if constexpr (requires { model.setLastModificationTime(trantor::Date::now()); }) {
        model.setLastModificationTime(trantor::Date::now());
    }
    if constexpr (requires { model.setLastModifierUserId(identity.userId); }) {
        if (identity.hasUser()) model.setLastModifierUserId(identity.userId);
    }
}

/** Stamps the fields recorded when a row is soft-deleted. */
template <typename Model>
void applyDeleteAudit(Model &model, const AuditIdentity &identity)
{
    if constexpr (HasDeletedByUserId<Model>) {
        if (identity.hasUser()) {
            model.setDeletedByUserId(identity.userId);
        }
    }
    if constexpr (HasDeletedAt<Model>) {
        model.setDeletedAt(trantor::Date::now());
    }
    if constexpr (requires { model.setDeletionTime(trantor::Date::now()); }) {
        model.setDeletionTime(trantor::Date::now());
    }
    if constexpr (requires { model.setDeleterUserId(identity.userId); }) {
        if (identity.hasUser()) model.setDeleterUserId(identity.userId);
    }
}

} // namespace utils
} // namespace business_desk
