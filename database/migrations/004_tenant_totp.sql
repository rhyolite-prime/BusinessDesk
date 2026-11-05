-- Apply before enabling tenant TOTP. Secrets are AES-256-GCM encrypted by the app.
BEGIN;
CREATE TABLE auth_totp_credentials (
    user_id uuid PRIMARY KEY REFERENCES users(id),
    tenant_id uuid NOT NULL REFERENCES tenants(id),
    encrypted_secret text NOT NULL,
    last_counter bigint NOT NULL CHECK (last_counter >= 0),
    enrolled_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE auth_totp_challenges (
    token_hash char(64) PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id),
    tenant_id uuid NOT NULL REFERENCES tenants(id),
    encrypted_secret text NOT NULL,
    enrolling boolean NOT NULL,
    password_fingerprint char(64) NOT NULL,
    attempts integer NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5),
    expires_at timestamptz NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '5 minutes'),
    consumed_at timestamptz
);
CREATE INDEX auth_totp_challenges_expiry ON auth_totp_challenges(expires_at);
CREATE TABLE auth_totp_rate_limits (
    user_id uuid NOT NULL REFERENCES users(id),
    purpose text NOT NULL CHECK (purpose IN ('begin', 'verify')),
    window_start timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    attempts integer NOT NULL DEFAULT 1,
    PRIMARY KEY (user_id, purpose)
);
COMMIT;
