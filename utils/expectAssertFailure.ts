import { assert } from 'chai'

export default async function expectAssertFailure(
  f: () => void | Promise<unknown>,
  errorMessage = 'Assert Failed'
) {
  let hasFailed = false
  try {
    await f()
  } catch (err) {
    hasFailed = err instanceof Error && err.message.includes(errorMessage)
  }
  assert.isTrue(
    hasFailed,
    `Expected an error with message containing "${errorMessage}", but no error was thrown or the message did not match.`
  )
}
