import { wasm as wasmTester } from 'circom_tester'
import Poseidon from '../utils/Poseidon'
import checkHash from '../utils/checkHash'
import expectAssertFailure from '../utils/expectAssertFailure'
import getCardSelectionInputs from '../utils/getCardSelectionInputs'

describe('CardSelection circuit', function () {
  before(async function () {
    this.poseidon = await new Poseidon().prepare()
    this.circuit = await wasmTester('circuits/CardSelection.circom')
    this.baseInputs = await getCardSelectionInputs()
  })

  describe('Generating a witness successfully and returns the correct Poseidon hash for a valid card selection', () => {
    const inputs = [
      [undefined, 'base inputs'],
      [[1, 2, 3, 4, 0, 0, 6, 0, 0], 'different input'],
      [[10, 9, 8, 7, 0, 0, 6, 0, 0], 'top input'],
      [[10, 9, 8, 0, 0, 7, 0, 0, 6], 'input to the right'],
      [[10, 9, 8, 0, 7, 0, 0, 6, 0], 'input in the middle'],
    ]
    for (const [cardIndexes, description] of inputs) {
      it(`generates a witness successfully and returns the correct Poseidon hash for a valid card selection (${description})`, async function () {
        this.validInputs = {
          ...this.baseInputs,
          cardIndexes: cardIndexes || this.baseInputs.cardIndexes,
        }
        // Calculate witness using valid inputs
        const witness = await this.circuit.calculateWitness(this.validInputs)
        // Check the witness
        await this.circuit.checkConstraints(witness)
        // Check commitment using the helper function
        await checkHash(this.poseidon, this.validInputs, witness[1])
      })
    }
    const validEntropyValues = [
      0,
      42,
      123,
      256,
      1024,
      2048,
      -1,
      Number.MAX_SAFE_INTEGER,
    ]
    for (const entropy of validEntropyValues) {
      it(`generates a witness successfully with valid entropy values (${entropy})`, async function () {
        this.validInputs = {
          ...this.baseInputs,
          entropy: entropy,
        }
        // Calculate witness using valid inputs
        const witness = await this.circuit.calculateWitness(this.validInputs)
        // Check the witness
        await this.circuit.checkConstraints(witness)
        // Check commitment using the helper function
        await checkHash(this.poseidon, this.validInputs, witness[1])
      })
    }
  })

  describe('Fails to generate a witness for invalid inputs', () => {
    const inputs = [
      [[1, 2, 3, 4, 0, 0, 0, 0, 0], 'more than four 0s'],
      [[1, 2, 3, 4, 5, 0, 0, 0, 0], 'a line without selection'],
      [[1, 2, 3, 4, 5, 0, 6, 0, 0], 'less than four 0s'],
      [[1, 2, 3, 4, 0, 0, 11, 0, 0], 'card index out of range'],
      [[1, 2, 3, 4, 0, 0, 4, 0, 0], 'duplicate card indexes'],
      [[4, 4, 4, 4, 0, 0, 4, 0, 0], 'all card indexes are the same'],
    ]
    for (const [cardIndexes, description] of inputs) {
      it(`fails to generate a witness for invalid inputs (${description})`, async function () {
        this.invalidInputs = {
          ...this.baseInputs,
          cardIndexes: cardIndexes,
        }
        await expectAssertFailure(() =>
          this.circuit.calculateWitness(this.invalidInputs)
        )
      })
    }
  })
})
