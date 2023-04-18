import { Arena } from 'typechain'
import { MockContract } from 'ethereum-waffle'
import { Signer } from 'ethers'
import approveTransfer from './approveTransfer'

export default async function (
  farcantasyContract: MockContract,
  participant: Signer,
  arena: Arena,
  participantCardIds: number[],
  battleLobbyIndex = 0
) {
  await approveTransfer(
    farcantasyContract,
    await participant.getAddress(),
    arena.address,
    participantCardIds
  )
  return arena
    .connect(participant)
    .joinBattleLobby(battleLobbyIndex, participantCardIds)
}
