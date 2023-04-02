import { Inputs } from './models/Inputs'
import { expect } from 'chai'
import Poseidon from './Poseidon'

export default function checkCommitment(
  poseidon: Poseidon,
  inputs: Inputs,
  outputHash: number
) {
  const hash = poseidon.hash([inputs.entropy, ...inputs.cardIndexes])
  expect(hash).to.equal(outputHash)
}
