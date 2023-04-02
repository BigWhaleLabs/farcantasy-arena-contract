import { ethers } from 'hardhat'
import { expect } from 'chai'
import { version } from '../package.json'
import Proof from '../utils/models/Proof'
import getSolidityCallProof from '../utils/getSolidityCallProof'

describe.only('Verifier contracts', function () {
  const verifiers = [
    ['CardSelectionVerifier', 'card-selection'],
    ['CardRevealVerifier', 'card-reveal'],
  ]
  for (const [verifier, name] of verifiers) {
    describe(verifier, function () {
      before(async function () {
        const factory = await ethers.getContractFactory(verifier)
        this.contract = await factory.deploy(version)
        await this.contract.deployed()
        this.proof = await getSolidityCallProof(name)
      })
      describe('Constructor', function () {
        it('should deploy the contract with the correct fields', async function () {
          expect(await this.contract.version()).to.equal(version)
        })
      })
      it('should successfully verify correct proof', async function () {
        const { a, b, c, input } = this.proof
        const params = [a, b, c, input]
        expect(await this.contract.verifyProof(...params)).to.be.equal(true)
      })
      it('should fail to verify incorrect proof', async function () {
        const { a, b, c, input } = {
          ...this.proof,
          c: [
            '0x184b074c1fac82c2dda436071d098edb4a2955343721ef642e6b844e40a50cc0',
            '0x1e11078629c2031c0eb203d84f745e423440ed52091d06ece6020cd5674fda5f',
          ],
        } as Proof
        expect(await this.contract.verifyProof(a, b, c, input)).to.be.equal(
          false
        )
      })
    })
  }
})
