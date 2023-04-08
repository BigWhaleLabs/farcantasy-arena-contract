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

  describe.only('createBattleLobby', function () {
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
})
