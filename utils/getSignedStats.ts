import { SignatureStruct } from '../typechain/contracts/Arena'
import { ethers } from 'hardhat'
import defaultCardSelection from './defaultCardSelection'

export const ecdsaWallet = ethers.Wallet.createRandom()

function ecdsaSigFromString(message: Uint8Array) {
  return ecdsaWallet.signMessage(message)
}

async function getStatsForTokenId(
  offence: number,
  defence: number,
  tokenId: number
) {
  // The data is:
  // 1. 32 bytes of token id (uint256)
  // 2. 2 bytes of offence stats (uint16)
  // 3. 2 bytes of defence stats (uint16)
  // 4. 32 bytes of timestamp (uint256)
  const tokenIdBytes = ethers.utils.arrayify(
    ethers.utils.hexZeroPad(ethers.BigNumber.from(tokenId).toHexString(), 32)
  )
  const offenceBytes = ethers.utils.arrayify(
    ethers.utils.hexZeroPad(ethers.BigNumber.from(offence).toHexString(), 2)
  )
  const defenseBytes = ethers.utils.arrayify(
    ethers.utils.hexZeroPad(ethers.BigNumber.from(defence).toHexString(), 2)
  )
  const timestampBytes = ethers.utils.arrayify(
    ethers.utils.hexZeroPad(
      ethers.BigNumber.from(Math.floor(Date.now() / 1000)).toHexString(),
      32
    )
  )

  // Ensure proper alignment of the data array
  const message = [
    ...tokenIdBytes,
    ...offenceBytes,
    ...defenseBytes,
    ...timestampBytes,
  ]
  const signature = await ecdsaSigFromString(new Uint8Array(message))
  const { r, _vs: vs } = ethers.utils.splitSignature(signature)
  return {
    data: message,
    r,
    vs,
  } as SignatureStruct
}

export default async function (
  tokenIds: number[],
  selection: number[][] = defaultCardSelection,
  stats: number[][][] = [
    [
      [1, 1],
      [1, 1],
      [1, 1],
    ],
    [
      [1, 1],
      [0, 0],
      [0, 0],
    ],
    [
      [1, 1],
      [0, 0],
      [0, 0],
    ],
  ]
) {
  const zeroSignature = await getStatsForTokenId(0, 0, 0)

  const signatures: SignatureStruct[][] = []
  for (let i = 0; i < selection.length; i++) {
    const innerSignatures: SignatureStruct[] = []
    for (let j = 0; j < selection[i].length; j++) {
      if (selection[i][j] === 0) {
        innerSignatures.push(zeroSignature)
        continue
      }
      const tokenId = tokenIds[selection[i][j] - 1]
      const { data, r, vs } = await getStatsForTokenId(
        stats[i][j][0],
        stats[i][j][1],
        tokenId
      )
      innerSignatures.push({
        data,
        r,
        vs,
      })
    }
    signatures.push(innerSignatures)
  }
  return signatures as [
    [SignatureStruct, SignatureStruct, SignatureStruct],
    [SignatureStruct, SignatureStruct, SignatureStruct],
    [SignatureStruct, SignatureStruct, SignatureStruct]
  ]
}
