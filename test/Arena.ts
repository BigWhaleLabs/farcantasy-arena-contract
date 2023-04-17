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

describe('Arena', function () {
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

  describe('joinBattleLobby', function () {
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

      // Check if the last activity timestamp has been updated
      const updatedLastActivityTimestamp = updatedLobby.lastActivityTimestamp
      expect(updatedLastActivityTimestamp).to.not.equal(
        initialLastActivityTimestamp
      )
    })
  })

  describe('backOff', function () {
    const ownerCardIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    const participantCardIds = [11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
    let participant: Signer

    beforeEach(async function () {
      ;[, participant] = await ethers.getSigners()
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

        // Mock ownerOf function
        await farcantasyContract.mock.ownerOf
          .withArgs(cardId)
          .returns(await deployer.getAddress())
      }
      await arena.createBattleLobby(ownerCardIds)
    })

    it('should revert if the specified battle lobby does not exist', async function () {
      await expect(arena.backOff(1)).to.be.revertedWith(
        'The specified battle lobby does not exist.'
      )
    })

    it('should revert if the caller is not the lobby owner', async function () {
      await expect(arena.connect(participant).backOff(0)).to.be.revertedWith(
        'Only the lobby owner can back off.'
      )
    })

    it('should revert if the owner has already submitted a card selection', async function () {
      // Set up the mock for the cardSelectionVerifierContract.verifyProof function
      await cardSelectionVerifierContract.mock.verifyProof.returns(true)

      // Add participant to the lobby
      await farcantasyContract.mock.isApprovedForAll
        .withArgs(await participant.getAddress(), arena.address)
        .returns(true)
      for (const cardId of participantCardIds) {
        await farcantasyContract.mock[
          'safeTransferFrom(address,address,uint256)'
        ]
          .withArgs(await participant.getAddress(), arena.address, cardId)
          .returns()

        // Mock ownerOf function
        await farcantasyContract.mock.ownerOf
          .withArgs(cardId)
          .returns(await participant.getAddress())
      }
      await arena.connect(participant).joinBattleLobby(0, participantCardIds)

      // Mock owner card selection submission
      await arena.submitCardSelectionProof(
        0,
        [3, 1],
        [
          [7, 8],
          [2, 5],
        ],
        [9, 6],
        [1]
      )

      // Check if the backOff function reverts with the appropriate error message
      await expect(arena.backOff(0)).to.be.revertedWith(
        'The owner has already submitted a card selection.'
      )
    })

    it('should return all cards, delete the battle lobby, and emit event', async function () {
      // Mock safeTransferFrom to return cards
      for (const cardId of ownerCardIds) {
        await farcantasyContract.mock[
          'safeTransferFrom(address,address,uint256)'
        ]
          .withArgs(arena.address, await deployer.getAddress(), cardId)
          .returns()
        // Mock ownerOf function
        await farcantasyContract.mock.ownerOf
          .withArgs(cardId)
          .returns(arena.address)
      }

      // Expect the BattleLobbyBackedOff event to be emitted
      await expect(arena.backOff(0))
        .to.emit(arena, 'BattleLobbyBackedOff')
        .withArgs(0)

      // Check if the battle lobby has been deleted
      const deletedLobby = await arena.battleLobbies(0)
      expect(deletedLobby.owner).to.equal(ethers.constants.AddressZero)
      expect(deletedLobby.participant).to.equal(ethers.constants.AddressZero)
      expect(deletedLobby.ownerCardSelection).to.equal(0)
      expect(deletedLobby.participantCardSelection).to.equal(0)
      expect(deletedLobby.isOwnerBattleLinesRevealed).to.equal(false)
      expect(deletedLobby.isParticipantBattleLinesRevealed).to.equal(false)
      expect(deletedLobby.battleExecuted).to.equal(false)
    })
  })

  describe('submitCardSelectionProof', function () {
    const ownerCardIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    const participantCardIds = [11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
    const selectionProof = [
      [3, 1],
      [
        [7, 8],
        [2, 5],
      ],
      [9, 6],
      [1],
    ] as [
      [number, number],
      [[number, number], [number, number]],
      [number, number],
      [number]
    ]
    let participant: Signer

    beforeEach(async function () {
      ;[, participant] = await ethers.getSigners()
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

        // Mock ownerOf function
        await farcantasyContract.mock.ownerOf
          .withArgs(cardId)
          .returns(await deployer.getAddress())
      }
      await arena.createBattleLobby(ownerCardIds)
    })

    it('should revert if the specified battle lobby does not exist', async function () {
      await expect(
        arena.submitCardSelectionProof(1, ...selectionProof)
      ).to.be.revertedWith('The specified battle lobby does not exist.')
    })

    it('should revert if the battle lobby has no participant', async function () {
      await expect(
        arena.submitCardSelectionProof(0, ...selectionProof)
      ).to.be.revertedWith('The battle lobby has no participant.')
    })

    it("should revert if the caller isn't the owner or participant", async function () {
      // Add participant to the lobby
      await farcantasyContract.mock.isApprovedForAll
        .withArgs(await participant.getAddress(), arena.address)
        .returns(true)
      for (const cardId of participantCardIds) {
        await farcantasyContract.mock[
          'safeTransferFrom(address,address,uint256)'
        ]
          .withArgs(await participant.getAddress(), arena.address, cardId)
          .returns()

        // Mock ownerOf function
        await farcantasyContract.mock.ownerOf
          .withArgs(cardId)
          .returns(await participant.getAddress())
      }
      await arena.connect(participant).joinBattleLobby(0, participantCardIds)

      // Test with a signer who is neither the owner nor the participant
      const anotherSigner = (await ethers.getSigners())[2]
      await expect(
        arena
          .connect(anotherSigner)
          .submitCardSelectionProof(0, ...selectionProof)
      ).to.be.revertedWith(
        'Only the owner or participant can submit a card selection proof.'
      )
    })

    it('should revert if the card selection proof has already been submitted', async function () {
      // Add participant to the lobby
      await farcantasyContract.mock.isApprovedForAll
        .withArgs(await participant.getAddress(), arena.address)
        .returns(true)
      for (const cardId of participantCardIds) {
        await farcantasyContract.mock[
          'safeTransferFrom(address,address,uint256)'
        ]
          .withArgs(await participant.getAddress(), arena.address, cardId)
          .returns()

        // Mock ownerOf function
        await farcantasyContract.mock.ownerOf
          .withArgs(cardId)
          .returns(await participant.getAddress())
      }
      await arena.connect(participant).joinBattleLobby(0, participantCardIds)

      // Mock the cardSelectionVerifierContract.verifyProof function
      await cardSelectionVerifierContract.mock.verifyProof.returns(true)

      // Submit the card selection proof as the owner
      await arena.submitCardSelectionProof(0, ...selectionProof)

      // Try to submit the card selection proof again as the owner
      await expect(
        arena.submitCardSelectionProof(0, ...selectionProof)
      ).to.be.revertedWith('Card selection proof has already been submitted.')
    })

    it('should revert if the card selection proof is not valid', async function () {
      // Add participant to the lobby
      await farcantasyContract.mock.isApprovedForAll
        .withArgs(await participant.getAddress(), arena.address)
        .returns(true)
      for (const cardId of participantCardIds) {
        await farcantasyContract.mock[
          'safeTransferFrom(address,address,uint256)'
        ]
          .withArgs(await participant.getAddress(), arena.address, cardId)
          .returns()

        // Mock ownerOf function
        await farcantasyContract.mock.ownerOf
          .withArgs(cardId)
          .returns(await participant.getAddress())
      }
      await arena.connect(participant).joinBattleLobby(0, participantCardIds)

      // Mock the cardSelectionVerifierContract.verifyProof function to return false
      await cardSelectionVerifierContract.mock.verifyProof.returns(false)

      // Try to submit an invalid card selection proof
      await expect(
        arena.submitCardSelectionProof(0, ...selectionProof)
      ).to.be.revertedWith('The card selection proof is not valid.')
    })

    it('should store the card selection proof and emit event', async function () {
      // Add participant to the lobby
      await farcantasyContract.mock.isApprovedForAll
        .withArgs(await participant.getAddress(), arena.address)
        .returns(true)
      for (const cardId of participantCardIds) {
        await farcantasyContract.mock[
          'safeTransferFrom(address,address,uint256)'
        ]
          .withArgs(await participant.getAddress(), arena.address, cardId)
          .returns()

        // Mock ownerOf function
        await farcantasyContract.mock.ownerOf
          .withArgs(cardId)
          .returns(await participant.getAddress())
      }
      await arena.connect(participant).joinBattleLobby(0, participantCardIds)

      // Mock the cardSelectionVerifierContract.verifyProof function
      await cardSelectionVerifierContract.mock.verifyProof.returns(true)

      // Submit the card selection proof as the owner
      await expect(arena.submitCardSelectionProof(0, ...selectionProof))
        .to.emit(arena, 'CardSelectionProofSubmitted')
        .withArgs(0, await deployer.getAddress(), 1)

      // Check if the card selection proof is stored correctly
      const battleLobby = await arena.battleLobbies(0)
      expect(battleLobby.ownerCardSelection).to.equal(1)
      // Submit the card selection proof as the participant
      await expect(
        arena.connect(participant).submitCardSelectionProof(
          0,
          [1, 2],
          [
            [1, 2],
            [1, 2],
          ],
          [1, 2],
          [2]
        )
      )
        .to.emit(arena, 'CardSelectionProofSubmitted')
        .withArgs(0, await participant.getAddress(), 2)

      // Check if the card selection proof is stored correctly
      const updatedBattleLobby = await arena.battleLobbies(0)
      expect(updatedBattleLobby.participantCardSelection).to.equal(2)
    })
  })

  describe('revealCards', function () {
    const cardSelectionProof = [
      [3, 1],
      [
        [7, 8],
        [2, 5],
      ],
      [9, 6],
      [1],
    ] as [
      [number, number],
      [[number, number], [number, number]],
      [number, number],
      [number]
    ]
    const participantCardSelectionProof = [
      [3, 1],
      [
        [7, 8],
        [2, 5],
      ],
      [9, 6],
      [2],
    ] as [
      [number, number],
      [[number, number], [number, number]],
      [number, number],
      [number]
    ]
    const cardRevealProof = [
      [3, 1],
      [
        [7, 8],
        [2, 5],
      ],
      [9, 6],
      [1, 1, 2, 3, 4, 0, 0, 5, 0, 0],
    ] as [
      [number, number],
      [[number, number], [number, number]],
      [number, number],
      [
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number,
        number
      ]
    ]
    const ownerCardIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    const participantCardIds = [11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
    let participant: Signer

    beforeEach(async function () {
      ;[, participant] = await ethers.getSigners()
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
      // Add participant to the lobby
      await farcantasyContract.mock.isApprovedForAll
        .withArgs(await participant.getAddress(), arena.address)
        .returns(true)
      // Mock safeTransferFrom
      for (const cardId of participantCardIds) {
        await farcantasyContract.mock[
          'safeTransferFrom(address,address,uint256)'
        ]
          .withArgs(await participant.getAddress(), arena.address, cardId)
          .returns()
      }
      await arena.connect(participant).joinBattleLobby(0, participantCardIds)
      // Mock the cardSelectionVerifierContract.verifyProof function
      await cardSelectionVerifierContract.mock.verifyProof.returns(true)
      // Submit card selection proofs for both owner and participant
      await arena.submitCardSelectionProof(0, ...cardSelectionProof)
      await arena
        .connect(participant)
        .submitCardSelectionProof(0, ...participantCardSelectionProof)
    })

    it('should revert if the specified battle lobby does not exist', async function () {
      await expect(arena.revealCards(1, ...cardRevealProof)).to.be.revertedWith(
        'The specified battle lobby does not exist.'
      )
    })

    it('should revert if the battle lobby has no participant', async function () {
      // Create a new battle lobby without participant
      await arena.createBattleLobby(ownerCardIds)
      await expect(arena.revealCards(1, ...cardRevealProof)).to.be.revertedWith(
        'The battle lobby has no participant.'
      )
    })

    it("should revert if the caller isn't the owner or participant", async function () {
      // Test with a signer who is neither the owner nor the participant
      const [, , anotherSigner] = await ethers.getSigners()
      await expect(
        arena.connect(anotherSigner).revealCards(0, ...cardRevealProof)
      ).to.be.revertedWith(
        'Only the owner or participant can submit a card selection proof.'
      )
    })

    it('should revert if both card selection proofs are not submitted', async function () {
      // Reset participant's card selection proof
      await arena.createBattleLobby(ownerCardIds)
      await arena.connect(participant).joinBattleLobby(1, participantCardIds)

      await expect(arena.revealCards(1, ...cardRevealProof)).to.be.revertedWith(
        'Both card selection proofs must be submitted.'
      )
    })

    it('should revert if the card reveal proof is not valid', async function () {
      // Mock the cardRevealVerifierContract.verifyProof function to return false
      await cardRevealVerifierContract.mock.verifyProof.returns(false)
      // Try to submit an invalid card reveal proof
      await expect(arena.revealCards(0, ...cardRevealProof)).to.be.revertedWith(
        'The card reveal proof is not valid.'
      )
    })

    it('should revert if the revealed card selection does not match the submitted proof', async function () {
      // Mock the cardRevealVerifierContract.verifyProof function to return true
      await cardRevealVerifierContract.mock.verifyProof.returns(true)
      // Modify the input array of the cardRevealProof to mismatch the submitted proof
      const mismatchedCardRevealProof = [
        [3, 1],
        [
          [7, 8],
          [2, 5],
        ],
        [9, 6],
        [2, 1, 2, 3, 4, 0, 0, 5, 0, 0],
      ] as [
        [number, number],
        [[number, number], [number, number]],
        [number, number],
        [
          number,
          number,
          number,
          number,
          number,
          number,
          number,
          number,
          number,
          number
        ]
      ]
      mismatchedCardRevealProof[3] = [2, 2, 3, 4, 5, 6, 7, 8, 9, 10]

      await expect(
        arena.revealCards(0, ...mismatchedCardRevealProof)
      ).to.be.revertedWith(
        'The revealed card selection does not match the submitted proof.'
      )
    })

    it('should reveal cards, emit event, and return unused cards', async function () {
      // Mock the cardRevealVerifierContract.verifyProof function to return true
      await cardRevealVerifierContract.mock.verifyProof.returns(true)
      // Mock safeTransferFrom
      for (const cardId of [6, 7, 8, 9, 10]) {
        await farcantasyContract.mock[
          'safeTransferFrom(address,address,uint256)'
        ]
          .withArgs(arena.address, await deployer.getAddress(), cardId)
          .returns()
      }

      // Reveal cards for the owner
      const revealCardsTx = await arena.revealCards(0, ...cardRevealProof)
      await expect(revealCardsTx).to.emit(arena, 'CardsRevealed')
      await expect(revealCardsTx)
        .to.emit(arena, 'UnusedCardsReturned')
        .withArgs(0, await deployer.getAddress(), [6, 7, 8, 9, 10])

      const battleLobby = await arena.battleLobbies(0)

      // Check if the battle lines are stored correctly
      const ownerBattleLines = await arena.getOwnerBattleLines(0)
      expect(ownerBattleLines).to.deep.equal([
        [1, 2, 3],
        [4, 0, 0],
        [5, 0, 0],
      ])
      expect(battleLobby.isOwnerBattleLinesRevealed).to.equal(true)

      // Mock safeTransferFrom
      for (const cardId of [16, 17, 18, 19, 20]) {
        await farcantasyContract.mock[
          'safeTransferFrom(address,address,uint256)'
        ]
          .withArgs(arena.address, await participant.getAddress(), cardId)
          .returns()
      }

      // Reveal cards for the participant
      const participantCardRevealProof = [
        [3, 1],
        [
          [7, 8],
          [2, 5],
        ],
        [9, 6],
        [2, 1, 2, 3, 4, 0, 0, 5, 0, 0],
      ] as [
        [number, number],
        [[number, number], [number, number]],
        [number, number],
        [
          number,
          number,
          number,
          number,
          number,
          number,
          number,
          number,
          number,
          number
        ]
      ]
      const revealParticipantCardsTx = await arena
        .connect(participant)
        .revealCards(0, ...participantCardRevealProof)
      await expect(revealParticipantCardsTx).to.emit(arena, 'CardsRevealed')
      await expect(revealParticipantCardsTx)
        .to.emit(arena, 'UnusedCardsReturned')
        .withArgs(0, await participant.getAddress(), [16, 17, 18, 19, 20])

      // Check if the battle lines are stored correctly
      const updatedBattleLobby = await arena.battleLobbies(0)
      const participantBattleLines = await arena.getParticipantBattleLines(0)
      expect(participantBattleLines).to.deep.equal([
        [1, 2, 3],
        [4, 0, 0],
        [5, 0, 0],
      ])
      expect(updatedBattleLobby.isParticipantBattleLinesRevealed).to.equal(true)
    })
  })
})
