import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from '../../frontend/node_modules/typescript/lib/typescript.js'

const page = readFileSync('frontend/app/pages/ledger/journals/new.vue', 'utf8')
const component = readFileSync('frontend/app/components/ScrollAddFab.vue', 'utf8')
const fab = page.match(/<ScrollAddFab[\s\S]*?\/>/)?.[0]
assert.ok(fab)
assert.match(page, /ref="addLineButton"/)
assert.match(fab, /:target="addLineButton"/)
assert.match(fab, /label="Add line"/)
assert.match(fab, /@click="addLine"/)
assert.match(fab, /:disabled="loading \|\| saving \|\| readonly \|\| !loaded \|\| lines.length >= 500"/)
assert.match(fab, /:hidden="readonly \|\| loading \|\| !loaded"/)
assert.match(page, /if \(saving.value \|\| readonly.value \|\| lines.value.length >= 500\) return/)
assert.match(page, /element.scrollIntoView/)
assert.match(component, /<Teleport[^>]*to="body"/)
assert.match(component, /:aria-label="label"/)

let unmount, changeTarget, observer, stopped = false
const target = {}, props = { target, label: 'Add line' }
const script = component.match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1].replace(/^import .*$/gm, '')
const context = {
  defineProps: () => props, defineEmits: () => {}, ref: value => ({ value }),
  onMounted: callback => callback(), onBeforeUnmount: callback => { unmount = callback },
  watch: (_, callback) => { changeTarget = callback; callback(props.target); return () => { stopped = true } },
  IntersectionObserver: class {
    constructor(callback) { this.callback = callback; observer = this }
    observe(value) { this.target = value }
    disconnect() { this.disconnected = true }
  },
}
vm.createContext(context)
vm.runInContext(ts.transpileModule(script + '\nglobalThis.state = scrolledPast', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context)
assert.equal(observer.target, target)
observer.callback([{ isIntersecting: false, boundingClientRect: { bottom: 1000 } }])
assert.equal(context.state.value, false, 'No FAB before reaching the original button')
observer.callback([{ isIntersecting: true, boundingClientRect: { bottom: 100 } }])
assert.equal(context.state.value, false, 'No duplicate FAB while original is visible')
observer.callback([{ isIntersecting: false, boundingClientRect: { bottom: -1 } }])
assert.equal(context.state.value, true, 'FAB appears after scrolling past the original')
observer.callback([{ isIntersecting: true, boundingClientRect: { bottom: 10 } }])
assert.equal(context.state.value, false, 'FAB hides when scrolling back')
const previous = observer
changeTarget(null)
assert.equal(previous.disconnected, true)
assert.equal(context.state.value, false, 'Removing original hides the FAB')
changeTarget(target)
unmount()
assert.equal(observer.disconnected, true)
assert.equal(stopped, true)
console.log('20 journal add-line FAB integration/visibility/lifecycle checks passed')
