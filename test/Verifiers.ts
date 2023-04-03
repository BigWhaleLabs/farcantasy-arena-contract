import { ethers } from 'hardhat'
import { expect } from 'chai'
import { version } from '../package.json'
import Proof from '../utils/models/Proof'
import getSolidityCallProof from '../utils/getSolidityCallProof'

describe('Verifier contracts', function () {
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
      it('should fail to verify when only one of the proof elements (a, b, or c) is incorrect, while the others are correct', async function () {
        const incorrectProof = {
          a: [
            '0x0dc79ab661694f84dd3bd43d0affa62a12a97c11d465e7c6de6104dbc1b515ee',
            '0x232a8198e020c5bd305196468cbc0c7d7015f502cb7fa23bcff13ce517563004',
          ],
          b: [
            [
              '0x125993838c9ce9cc5fbd1e7062e7ccdc83c53d788197f27ff2bbef508b8caf44',
              '0x263ade4214c8ebe440fa8cb5e55b8c383ce4d2a0d3c4a203d1e6ad24e2718bfd',
            ],
            [
              '0x0fe57d60c54a624f6931e6c8daec01bde9686f3bccc9574afb610f3e68371c47',
              '0x1b82c718eeb4b68bd015dc229c26506ed205fe93bf3b9dcf4d47d12dc3e437a2',
            ],
          ],
          c: [
            '0x245c1a8b926f6d9f90a88e1384c22e28a3466b43be81cea4d5b4542aa5b7f46b',
            '0x05822b627a761495fd7415a9f5059f454ae46851f7b530585da50e21a17271b7',
          ],
        }

        for (const key of Object.keys(incorrectProof)) {
          const wrongProof = { ...this.proof, [key]: incorrectProof[key] }
          expect(
            await this.contract.verifyProof(
              wrongProof.a,
              wrongProof.b,
              wrongProof.c,
              wrongProof.input
            )
          ).to.be.equal(false)
        }
      })
      it('should fail to verify when the input is incorrect, while the proof elements (a, b, and c) are correct', async function () {
        // Input but the last number is 0x1
        const wrongInput = [...this.proof.input]
          .slice(0, -1)
          .concat([
            '0x0000000000000000000000000000000000000000000000000000000000000001',
          ])
        expect(
          await this.contract.verifyProof(
            this.proof.a,
            this.proof.b,
            this.proof.c,
            wrongInput
          )
        ).to.be.equal(false)
      })
      it('should revert when provided with an incorrect length for an array', async function () {
        const testCases = [
          { a: this.proof.a.slice(0, 1) },
          { b: this.proof.b.slice(0, 1) },
          { c: this.proof.c.slice(0, 1) },
          { input: this.proof.input.slice(0, -1) },
        ]
        for (const testCase of testCases) {
          const args = { ...this.proof, ...testCase }
          await expect(
            this.contract.verifyProof(args.a, args.b, args.c, args.input)
          ).to.be.reverted
        }
      })
      it('should revert when provided with an invalid data type or format', async function () {
        const wrongAFormat = ['0x123'] // Incorrect length for 'a' array
        await expect(
          this.contract.verifyProof(
            wrongAFormat,
            this.proof.b,
            this.proof.c,
            this.proof.input
          )
        ).to.be.reverted

        const wrongBFormat = [['0x123', '0x456'], ['0x789']] // Incorrect length for 'b' array
        await expect(
          this.contract.verifyProof(
            this.proof.a,
            wrongBFormat,
            this.proof.c,
            this.proof.input
          )
        ).to.be.reverted

        const wrongCFormat = ['0x123'] // Incorrect length for 'c' array
        await expect(
          this.contract.verifyProof(
            this.proof.a,
            this.proof.b,
            wrongCFormat,
            this.proof.input
          )
        ).to.be.reverted

        const wrongInputFormat = {
          // Object instead of an array for 'input'
          '0': '0x123',
          '1': '0x456',
          '2': '0x789',
        }
        await expect(
          this.contract.verifyProof(
            this.proof.a,
            this.proof.b,
            this.proof.c,
            wrongInputFormat
          )
        ).to.be.reverted
      })
    })
  }
})
