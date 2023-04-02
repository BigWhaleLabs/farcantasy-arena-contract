/* eslint-disable @typescript-eslint/no-explicit-any */
import { buildPoseidon } from 'circomlibjs'

export default class {
  F: any
  private poseidon: any

  async prepare() {
    this.poseidon = await buildPoseidon()
    this.F = this.poseidon.F
    return this
  }
  hash(elements: any[] | Uint8Array) {
    return BigInt(this.F.toString(this.poseidon(elements)))
  }
}
