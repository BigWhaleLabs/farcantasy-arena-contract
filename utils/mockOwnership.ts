import { MockContract } from 'ethereum-waffle'

export default async function (
  contract: MockContract,
  owner: string,
  tokenIds: number[]
) {
  for (const tokenId of tokenIds) {
    await contract.mock.ownerOf.withArgs(tokenId).returns(owner)
  }
}
