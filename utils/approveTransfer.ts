import { MockContract } from 'ethereum-waffle'

export default async function (
  farcantasyContract: MockContract,
  from: string,
  to: string,
  cardIds: number[]
) {
  await farcantasyContract.mock.isApprovedForAll
    .withArgs(from, to)
    .returns(true)
  for (const cardId of cardIds) {
    await farcantasyContract.mock['safeTransferFrom(address,address,uint256)']
      .withArgs(from, to, cardId)
      .returns()
  }
}
