# BusinessDesk frontend — local Journal testing

## Start the mock-backed app

From this directory, install dependencies and run the development server:

```sh
pnpm install --frozen-lockfile
unset LEDGER_API_BASE_URL AUTH_API_BASE_URL
npm run dev
```

Leaving the upstream URLs unset makes the Nuxt server use its seeded, in-memory ledger mock data. Sign in with `a.mensah` / `demo1234`; the current demo authenticator code is shown on the 2FA screen. The Journal mock accounts and sample entries are in `server/utils/ledger-demo.ts`.

## Validate the Add line behavior

Open **General Ledger → Journal entries → New**. In development, the **Local journal test data** panel loads mock scenarios into the draft. Load a scenario, then click **Add line**:

| Scenario | Starting totals (GHS) | Expected new line |
| --- | ---: | --- |
| GHS debit ahead | Debit 1,250; credit 500 | Credit 750 |
| GHS credit ahead | Debit 500; credit 1,250 | Debit 750 |
| Balanced GHS | Debit 1,250; credit 1,250 | Debit and credit stay empty |
| USD / GHS FX | USD debit 100 × 12.5; GHS credit 400 | GHS credit 850 at rate 1 |

The test panel is only rendered by the development build; it does not create a journal until you save. Drafts and sequence changes are kept in server memory and reset when the dev server restarts.

The active Nuxt Journal editor and its Add line implementation are in `app/pages/ledger/journals/new.vue`. `cs-template/GeneralLedger/js/journal.js` is a legacy MVC reference, not the runtime script for the Nuxt app.
