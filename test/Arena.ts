import { Arena } from '../typechain'
import { MockContract } from 'ethereum-waffle'
import { Signer } from 'ethers'
import { ethers, waffle } from 'hardhat'
import { expect } from 'chai'
import CardRevealVerifierArtifact from '../artifacts/contracts/verifiers/CardRevealVerifier.sol/CardRevealVerifier.json'
import CardSelectionVerifierArtifact from '../artifacts/contracts/verifiers/CardSelectionVerifier.sol/CardSelectionVerifier.json'
import ERC721Artifact from '@openzeppelin/contracts/build/contracts/IERC721.json'

const { deployMockContract } = waffle
const attestorEcdsaAddress = '0x02E6777CFd5fA466defbC95a1641058DF99b4993'

describe.only('Arena', function () {
  let arena: Arena
  let deployer: Signer
  let farcantasyContract: MockContract
  let cardSelectionVerifierContract: MockContract
  let cardRevealVerifierContract: MockContract

  beforeEach(async function () {
    ;[deployer] = await ethers.getSigners()

    // Deploy the mock ERC721 contract
    farcantasyContract = await deployMockContract(deployer, ERC721Artifact.abi)

    // Deploy the mock CardSelectionVerifier contract
    cardSelectionVerifierContract = await deployMockContract(
      deployer,
      CardSelectionVerifierArtifact.abi
    )

    // Deploy the mock CardRevealVerifier contract
    cardRevealVerifierContract = await deployMockContract(
      deployer,
      CardRevealVerifierArtifact.abi
    )

    // Deploy the Arena contract
    const Arena = await ethers.getContractFactory('Arena')
    arena = await Arena.deploy(
      farcantasyContract.address,
      cardSelectionVerifierContract.address,
      cardRevealVerifierContract.address,
      attestorEcdsaAddress
    )
    await arena.deployed()
  })

  describe('constructor', function () {
    it('constructor should set correct contract addresses and attestorEcdsaAddress', async function () {
      expect(await arena.farcantasyContract()).to.equal(
        farcantasyContract.address
      )
      expect(await arena.cardSelectionVerifierContract()).to.equal(
        cardSelectionVerifierContract.address
      )
      expect(await arena.cardRevealVerifierContract()).to.equal(
        cardRevealVerifierContract.address
      )
      expect(await arena.attestorEcdsaAddress()).to.equal(attestorEcdsaAddress)
    })

    it('constructor should set initial battleLobbyIndex to 0', async function () {
      const initialBattleLobbyIndex = await arena.battleLobbyIndex()
      expect(initialBattleLobbyIndex).to.equal(0)
    })
  })

  describe('createBattleLobby', function () {
    const cardIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

    it('should revert if the contract is not approved to transfer cards', async function () {
      // Set up the mock to return false for isApprovedForAll
      await farcantasyContract.mock.isApprovedForAll.returns(false)
      await expect(arena.createBattleLobby(cardIds)).to.be.revertedWith(
        'You must approve the contract to transfer your cards.'
      )
    })

    it('should revert if there are duplicate cardIds in the array', async function () {
      // Approve the contract to transfer cards
      await farcantasyContract.mock.isApprovedForAll
        .withArgs(await deployer.getAddress(), arena.address)
        .returns(true)

      // Create a cardIds array with duplicate entries
      const duplicateCardIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 1] // cardId 1 is duplicated

      // Mock safeTransferFrom
      for (const cardId of duplicateCardIds) {
        await farcantasyContract.mock[
          'safeTransferFrom(address,address,uint256)'
        ]
          .withArgs(await deployer.getAddress(), arena.address, cardId)
          .returns()
      }

      // Test if the function reverts with the appropriate error message
      await expect(
        arena.createBattleLobby(duplicateCardIds)
      ).to.be.revertedWith('CardIds must be unique.')
    })

    it('should transfer cards, create a lobby, emit event, and increment battleLobbyIndex', async function () {
      // Approve the contract to transfer cards
      await farcantasyContract.mock.isApprovedForAll
        .withArgs(await deployer.getAddress(), arena.address)
        .returns(true)
      // Mock safeTransferFrom
      for (const cardId of cardIds) {
        await farcantasyContract.mock[
          'safeTransferFrom(address,address,uint256)'
        ]
          .withArgs(await deployer.getAddress(), arena.address, cardId)
          .returns()
      }

      // Capture the initial battle lobby index
      const initialBattleLobbyIndex = await arena.battleLobbyIndex()

      // Expect the BattleLobbyCreated event to be emitted
      await expect(arena.createBattleLobby(cardIds))
        .to.emit(arena, 'BattleLobbyCreated')
        .withArgs(initialBattleLobbyIndex, await deployer.getAddress(), cardIds)

      // Check if the battle lobby has been created with the correct state
      const newLobby = await arena.battleLobbies(initialBattleLobbyIndex)
      expect(newLobby.owner).to.equal(await deployer.getAddress())
      expect(newLobby.participant).to.equal(ethers.constants.AddressZero)
      expect(newLobby.ownerCardSelection).to.equal(0)
      expect(newLobby.participantCardSelection).to.equal(0)
      expect(newLobby.isOwnerBattleLinesRevealed).to.equal(false)
      expect(newLobby.isParticipantBattleLinesRevealed).to.equal(false)
      expect(newLobby.battleExecuted).to.equal(false)

      // Check if the battleLobbyIndex has been incremented
      const newBattleLobbyIndex = await arena.battleLobbyIndex()
      expect(newBattleLobbyIndex).to.equal(initialBattleLobbyIndex.add(1))
    })
  })

  describe.only('joinBattleLobby', function () {
    const ownerCardIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    const participantCardIds = [11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
    let participant: Signer
    let anotherParticipant: Signer

    beforeEach(async function () {
      ;[, participant, anotherParticipant] = await ethers.getSigners()
      // Create a battle lobby as deployer
      await farcantasyContract.mock.isApprovedForAll
        .withArgs(await deployer.getAddress(), arena.address)
        .returns(true)
      for (const cardId of ownerCardIds) {
        await farcantasyContract.mock[
          'safeTransferFrom(address,address,uint256)'
        ]
          .withArgs(await deployer.getAddress(), arena.address, cardId)
          .returns()
      }
      await arena.createBattleLobby(ownerCardIds)
    })

    it('should revert if the cardIds are not unique', async function () {
      // Approve the contract to transfer cards for the participant
      await farcantasyContract.mock.isApprovedForAll
        .withArgs(await participant.getAddress(), arena.address)
        .returns(true)

      // Create a cardIds array with duplicate entries
      const duplicateParticipantCardIds = [
        11, 12, 13, 14, 15, 16, 17, 18, 19, 11,
      ] // cardId 11 is duplicated

      // Mock safeTransferFrom
      for (const cardId of duplicateParticipantCardIds) {
        await farcantasyContract.mock[
          'safeTransferFrom(address,address,uint256)'
        ]
          .withArgs(await participant.getAddress(), arena.address, cardId)
          .returns()
      }

      // Test if the function reverts with the appropriate error message
      await expect(
        arena
          .connect(participant)
          .joinBattleLobby(0, duplicateParticipantCardIds)
      ).to.be.revertedWith('CardIds must be unique.')
    })

    it('should revert if the specified battle lobby does not exist', async function () {
      await expect(
        arena.connect(participant).joinBattleLobby(1, participantCardIds)
      ).to.be.revertedWith('The specified battle lobby does not exist.')
    })

    it('should revert if the battle lobby already has a participant', async function () {
      // Approve the contract to transfer cards for the participant
      await farcantasyContract.mock.isApprovedForAll
        .withArgs(await participant.getAddress(), arena.address)
        .returns(true)

      for (const cardId of participantCardIds) {
        await farcantasyContract.mock[
          'safeTransferFrom(address,address,uint256)'
        ]
          .withArgs(await participant.getAddress(), arena.address, cardId)
          .returns()
      }

      // Participant joins the lobby
      await arena.connect(participant).joinBattleLobby(0, participantCardIds)

      // Another participant attempts to join the same lobby
      await farcantasyContract.mock.isApprovedForAll
        .withArgs(await anotherParticipant.getAddress(), arena.address)
        .returns(true)

      for (const cardId of participantCardIds) {
        await farcantasyContract.mock[
          'safeTransferFrom(address,address,uint256)'
        ]
          .withArgs(
            await anotherParticipant.getAddress(),
            arena.address,
            cardId
          )
          .returns()
      }

      await expect(
        arena.connect(anotherParticipant).joinBattleLobby(0, participantCardIds)
      ).to.be.revertedWith('This battle lobby already has a participant.')
    })

    it('should revert if the lobby owner tries to join their own lobby as a participant', async function () {
      // Approve the contract to transfer cards for the deployer
      await farcantasyContract.mock.isApprovedForAll
        .withArgs(await deployer.getAddress(), arena.address)
        .returns(true)

      for (const cardId of participantCardIds) {
        await farcantasyContract.mock[
          'safeTransferFrom(address,address,uint256)'
        ]
          .withArgs(await deployer.getAddress(), arena.address, cardId)
          .returns()
      }

      // Lobby owner tries to join their own lobby
      await expect(
        arena.joinBattleLobby(0, participantCardIds)
      ).to.be.revertedWith(
        'The lobby owner cannot join their own lobby as a participant.'
      )
    })

    it('should revert if the contract is not approved to transfer cards', async function () {
      // Set up the mock to return false for isApprovedForAll
      await farcantasyContract.mock.isApprovedForAll
        .withArgs(await participant.getAddress(), arena.address)
        .returns(false)
      await expect(
        arena.connect(participant).joinBattleLobby(0, participantCardIds)
      ).to.be.revertedWith(
        'You must approve the contract to transfer your cards.'
      )
    })

    it('should transfer cards, join the lobby, emit event, and update last activity timestamp', async function () {
      // Approve the contract to transfer cards for the participant
      await farcantasyContract.mock.isApprovedForAll
        .withArgs(await participant.getAddress(), arena.address)
        .returns(true)
      for (const cardId of participantCardIds) {
        await farcantasyContract.mock[
          'safeTransferFrom(address,address,uint256)'
        ]
          .withArgs(await participant.getAddress(), arena.address, cardId)
          .returns()
      }

      // Capture the initial last activity timestamp
      const initialLastActivityTimestamp = (await arena.battleLobbies(0))
        .lastActivityTimestamp

      // Expect the BattleLobbyJoined event to be emitted
      await expect(
        arena.connect(participant).joinBattleLobby(0, participantCardIds)
      )
        .to.emit(arena, 'BattleLobbyJoined')
        .withArgs(0, await participant.getAddress(), participantCardIds)

      // Check if the participant has been added to the battle lobby with the correct state
      const updatedLobby = await arena.battleLobbies(0)
      expect(updatedLobby.participant).to.equal(await participant.getAddress())
      // expect(updatedLobby.participantCards).to.eql(participantCardIds)

      // Check if the last activity timestamp has been updated
      const updatedLastActivityTimestamp = updatedLobby.lastActivityTimestamp
      expect(updatedLastActivityTimestamp).to.not.equal(
        initialLastActivityTimestamp
      )
    })
  })
})
