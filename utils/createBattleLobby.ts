import { Arena } from '../typechain'
import { MockContract } from 'ethereum-waffle'
import { Signer } from 'ethers'
import approveTransfer from './approveTransfer'

export default async function (
  farcantasyContract: MockContract,
  deployer: Signer,
  arena: Arena,
  ownerCardIds: number[]
) {
  // Approve the contract to transfer cards
  await approveTransfer(
    farcantasyContract,
    await deployer.getAddress(),
    arena.address,
    ownerCardIds
  )
  // Expect the BattleLobbyCreated event to be emitted
  return arena.createBattleLobby(ownerCardIds)
}
