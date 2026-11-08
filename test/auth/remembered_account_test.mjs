// Run with: node --experimental-strip-types test/auth/remembered_account_test.mjs
import assert from 'node:assert/strict'
import { loadRememberedAccountId, saveRememberedAccountId } from '../../frontend/layers/modules/auth/app/utils/rememberedAccount.ts'

assert.equal(loadRememberedAccountId(), '', 'SSR has no browser storage')
assert.doesNotThrow(() => saveRememberedAccountId('acme'), 'SSR writes are a no-op')
const entries = new Map()
globalThis.window = { localStorage: {
  getItem: key => entries.get(key) ?? null,
  setItem: (key, value) => entries.set(key, value),
  removeItem: key => entries.delete(key),
} }
try {
  assert.equal(loadRememberedAccountId(), '', 'new browser has no remembered account')
  saveRememberedAccountId('  acme  ')
  assert.equal(loadRememberedAccountId(), 'acme', 'account ID restored on subsequent visits')
  assert.equal(entries.size, 1, 'only one account-ID entry is persisted')
  saveRememberedAccountId('other-tenant')
  assert.equal(loadRememberedAccountId(), 'other-tenant', 'changing tenants replaces saved ID')
  saveRememberedAccountId('  ')
  assert.equal(entries.size, 0, 'clearing the field removes saved account')
  assert.equal(loadRememberedAccountId(), '', 'cleared account is not restored')
  Object.defineProperty(window, 'localStorage', { get() { throw new Error('Storage blocked') } })
  assert.equal(loadRememberedAccountId(), '', 'blocked reads do not break login')
  assert.doesNotThrow(() => saveRememberedAccountId('acme'), 'blocked writes do not break login')
} finally {
  delete globalThis.window
}
console.log('10 remembered-account checks passed')
