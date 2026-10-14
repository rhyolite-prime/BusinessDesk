/**
 * Login page – modern vanilla JS (no jQuery dependency for form logic).
 * The ABP framework (abp.ajax / abp.ui) is still used for the AJAX call and
 * busy-state because it handles the ABP-specific anti-forgery token and the
 * standard JSON error envelope automatically.
 *
 * Account ID persistence:
 *   - On load  : the previously saved Account ID is restored from localStorage.
 *   - On login : the Account ID typed by the user is saved to localStorage so
 *                returning users don't have to retype it.
 */
(function () {
    'use strict';

    // ── localStorage key ────────────────────────────────────────────────────
    const ACCOUNT_ID_STORAGE_KEY = 'topazErp_lastAccountId';

    // ── Element references ──────────────────────────────────────────────────
    const form          = document.getElementById('LoginForm');
    const accountIdEl   = document.getElementById('AccountId');
    const usernameEl    = document.getElementById('UsernameOrEmailAddress');
    const passwordEl    = document.getElementById('Password');
    const rememberMeEl  = document.getElementById('RememberMe');
    const returnUrlEl   = document.getElementById('ReturnUrl');
    const returnHashEl  = document.getElementById('ReturnUrlHash');
    const loginBtn      = document.getElementById('LoginBtn');
    const loginBtnText  = document.getElementById('LoginBtnText');
    const loginBtnSpinner = document.getElementById('LoginBtnSpinner');
    const errorBanner   = document.getElementById('LoginError');
    const togglePwdBtn  = document.getElementById('TogglePassword');
    const togglePwdIcon = document.getElementById('TogglePasswordIcon');

    // ── Restore saved Account ID ─────────────────────────────────────────────
    (function restoreSavedAccountId() {
        try {
            const saved = localStorage.getItem(ACCOUNT_ID_STORAGE_KEY);
            if (saved && accountIdEl) {
                accountIdEl.value = saved;
            }
        } catch (_) { /* localStorage may be blocked in private/incognito mode */ }
    })();

    // Populate the URL hash (e.g. #/some/path) so the server can redirect back correctly.
    if (returnHashEl) {
        returnHashEl.value = window.location.hash;
    }

    // ── Password visibility toggle ──────────────────────────────────────────
    if (togglePwdBtn && passwordEl) {
        togglePwdBtn.addEventListener('click', function () {
            const isPassword = passwordEl.type === 'password';
            passwordEl.type = isPassword ? 'text' : 'password';
            togglePwdIcon.classList.toggle('la-eye',      !isPassword);
            togglePwdIcon.classList.toggle('la-eye-slash', isPassword);
            passwordEl.focus();
        });
    }

    // ── Inline validation helpers ───────────────────────────────────────────
    function showFieldError(inputEl, errorElId, message) {
        const errorEl = document.getElementById(errorElId);
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.style.color = '#f55';
        }
        inputEl.classList.add('is-invalid');
    }

    function clearFieldError(inputEl, errorElId) {
        const errorEl = document.getElementById(errorElId);
        if (errorEl) errorEl.textContent = '';
        inputEl.classList.remove('is-invalid');
    }

    function clearAllErrors() {
        clearFieldError(accountIdEl,  'AccountId-error');
        clearFieldError(usernameEl,   'UsernameOrEmailAddress-error');
        clearFieldError(passwordEl,   'Password-error');
        hideErrorBanner();
    }

    function showErrorBanner(message) {
        errorBanner.textContent = message;
        errorBanner.style.display = 'block';
        errorBanner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function hideErrorBanner() {
        errorBanner.style.display = 'none';
        errorBanner.textContent   = '';
    }

    function validate() {
        let valid = true;

        if (!accountIdEl.value.trim()) {
            showFieldError(accountIdEl, 'AccountId-error', 'Account ID is required.');
            valid = false;
        } else {
            clearFieldError(accountIdEl, 'AccountId-error');
        }

        if (!usernameEl.value.trim()) {
            showFieldError(usernameEl, 'UsernameOrEmailAddress-error', 'Username is required.');
            valid = false;
        } else {
            clearFieldError(usernameEl, 'UsernameOrEmailAddress-error');
        }

        if (!passwordEl.value) {
            showFieldError(passwordEl, 'Password-error', 'Password is required.');
            valid = false;
        } else {
            clearFieldError(passwordEl, 'Password-error');
        }

        return valid;
    }

    // ── Loading state helpers ───────────────────────────────────────────────
    function setLoading(loading) {
        loginBtn.disabled           = loading;
        loginBtnText.style.display  = loading ? 'none'   : '';
        loginBtnSpinner.style.display = loading ? ''     : 'none';
    }

    // ── Build URL-encoded form data ─────────────────────────────────────────
    function buildFormData() {
        const params = new URLSearchParams();
        params.append('accountId',              accountIdEl.value.trim());
        params.append('usernameOrEmailAddress', usernameEl.value.trim());
        params.append('Password',               passwordEl.value);
        params.append('RememberMe',             rememberMeEl ? rememberMeEl.checked : false);
        params.append('returnUrl',              returnUrlEl  ? returnUrlEl.value    : '');
        params.append('returnUrlHash',          returnHashEl ? returnHashEl.value   : '');
        return params.toString();
    }

    // ── Form submit ─────────────────────────────────────────────────────────
    form.addEventListener('submit', function (e) {
        e.preventDefault();
        clearAllErrors();

        if (!validate()) return;

        setLoading(true);

        // abp.ajax handles the ABP request-verification-token header, standard
        // JSON error envelope unwrapping, and toastr notifications automatically.
        abp.ajax({
            contentType: 'application/x-www-form-urlencoded',
            url: form.action,
            data: buildFormData()
        }).done(function (result) {
            // Persist the Account ID so it is pre-filled on the next visit.
            try {
                if (accountIdEl && accountIdEl.value.trim()) {
                    localStorage.setItem(ACCOUNT_ID_STORAGE_KEY, accountIdEl.value.trim());
                }
            } catch (_) { /* ignore – localStorage may be unavailable */ }

            // The controller returns { targetUrl: '...' } on success.
            const target = (result && result.targetUrl) ? result.targetUrl : '/';
            window.location.href = target;
        }).fail(function (jqXHR) {
            setLoading(false);

            // Try to extract an ABP-formatted error message from the response.
            let message = 'Login failed. Please check your credentials and try again.';
            try {
                const response = JSON.parse(jqXHR.responseText);
                if (response && response.error && response.error.message) {
                    message = response.error.message;
                }
            } catch (_) { /* keep default message */ }

            showErrorBanner(message);
        });
    });

    // Clear field errors on user input to give instant feedback.
    accountIdEl && accountIdEl.addEventListener('input', function () { clearFieldError(accountIdEl,  'AccountId-error'); });
    usernameEl  && usernameEl.addEventListener('input',  function () { clearFieldError(usernameEl,   'UsernameOrEmailAddress-error'); });
    passwordEl  && passwordEl.addEventListener('input',  function () { clearFieldError(passwordEl,   'Password-error'); });

})();
