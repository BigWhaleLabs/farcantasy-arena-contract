import { wasm as wasmTester } from 'circom_tester'
import Poseidon from '../utils/Poseidon'
import checkHash from '../utils/checkHash'
import getCardSelectionInputs from '../utils/getCardSelectionInputs'

describe('CardReveal circuit', function () {
  before(async function () {
    this.poseidon = await new Poseidon().prepare()
    this.circuit = await wasmTester('circuits/CardReveal.circom')
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
})
