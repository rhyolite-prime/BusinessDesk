#pragma once
namespace business_desk::domain_services::totp_sql {
inline constexpr const char *rate = R"SQL(
INSERT INTO auth_totp_rate_limits (user_id, purpose) VALUES ($1::uuid, $2)
ON CONFLICT (user_id, purpose) DO UPDATE SET
 attempts = CASE WHEN auth_totp_rate_limits.window_start <= CURRENT_TIMESTAMP - INTERVAL '5 minutes'
                 THEN 1 ELSE LEAST(auth_totp_rate_limits.attempts + 1, 100) END,
 window_start = CASE WHEN auth_totp_rate_limits.window_start <= CURRENT_TIMESTAMP - INTERVAL '5 minutes'
                     THEN CURRENT_TIMESTAMP ELSE auth_totp_rate_limits.window_start END
RETURNING attempts
)SQL";
inline constexpr const char *attempt = R"SQL(
UPDATE auth_totp_challenges SET attempts = attempts + 1
WHERE token_hash = $1 AND consumed_at IS NULL AND expires_at > CURRENT_TIMESTAMP AND attempts < 5
RETURNING user_id::text, tenant_id::text, encrypted_secret, enrolling
)SQL";
// Claim the challenge and advance the counter/enroll atomically. Only a returned
// credential grants login. A losing race may consume its challenge but grants nothing.
inline constexpr const char *complete = R"SQL(
WITH claimed AS (
 UPDATE auth_totp_challenges c SET consumed_at = CURRENT_TIMESTAMP
 WHERE c.token_hash = $1 AND c.consumed_at IS NULL AND c.expires_at > CURRENT_TIMESTAMP
 AND EXISTS (SELECT 1 FROM users u JOIN tenants t ON t.id = u.tenant_id
             WHERE u.id = c.user_id AND u.tenant_id = c.tenant_id
             AND u.is_deleted = false AND u.is_active = true AND u.is_locked_out = false
             AND c.password_fingerprint = encode(sha256(convert_to(u.password_hash, 'UTF8')), 'hex')
             AND u.is_host_admin_user = false AND t.is_deleted = false AND t.is_active = true
             AND t.require_two_factor_auth = true
             AND t.id <> '00000000-0000-4000-8000-000000000001'::uuid)
 RETURNING c.user_id, c.tenant_id, c.encrypted_secret, c.enrolling
)
INSERT INTO auth_totp_credentials AS existing (user_id, tenant_id, encrypted_secret, last_counter)
 SELECT c.user_id, c.tenant_id, c.encrypted_secret, $2::bigint FROM claimed c
 WHERE c.enrolling OR EXISTS (SELECT 1 FROM auth_totp_credentials e
                             WHERE e.user_id = c.user_id AND e.tenant_id = c.tenant_id)
ON CONFLICT (user_id) DO UPDATE SET last_counter = EXCLUDED.last_counter
 WHERE existing.tenant_id = EXCLUDED.tenant_id AND existing.encrypted_secret = EXCLUDED.encrypted_secret
 AND existing.last_counter < EXCLUDED.last_counter
RETURNING user_id::text, tenant_id::text
)SQL";
}
