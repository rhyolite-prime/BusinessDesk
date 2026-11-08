/** Older employee drafts used isWithhold for the Imprest checkbox. */
export function employeeLineFlags(line: { isWithhold: boolean; isImprest?: boolean }) {
  return {
    isImprest: line.isImprest ?? line.isWithhold,
    isWithhold: line.isImprest === undefined ? false : line.isWithhold,
  }
}
