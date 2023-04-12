// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "./models/BattleLobby.sol";
import "./models/Signature.sol";
import "./verifiers/CardSelectionVerifier.sol";
import "./verifiers/CardRevealVerifier.sol";

contract Arena is Ownable {
  using Counters for Counters.Counter;

  // Contracts
  IERC721 public immutable farcantasyContract;
  CardSelectionVerifier public immutable cardSelectionVerifierContract;
  CardRevealVerifier public immutable cardRevealVerifierContract;
  address public immutable attestorEcdsaAddress;

  // State
  mapping(uint256 => BattleLobby) public battleLobbies;
  Counters.Counter public battleLobbyIndex;

  // Events
  event BattleLobbyCreated(
    uint256 indexed lobbyId,
    address indexed owner,
    uint256[10] ownerCards
  );
  event BattleLobbyJoined(
    uint256 indexed lobbyId,
    address indexed participant,
    uint256[10] participantCards
  );
  event BattleLobbyBackedOff(uint256 indexed lobbyId);
  event CardSelectionProofSubmitted(
    uint256 indexed lobbyId,
    address indexed submitter,
    uint256 cardSelection
  );
  event CardsRevealed(
    uint256 indexed lobbyId,
    address indexed submitter,
    uint8[3][3] battleLines
  );
  event UnusedCardsReturned(
    uint256 indexed lobbyId,
    address indexed submitter,
    uint256[5] unusedCardIds
  );
  event BattleExecuted(uint256 indexed lobbyId, uint8[3] winners);
  event BattleCancelledDueToTimeout(uint256 indexed lobbyId);

  constructor(
    address _farcantasyContract,
    address _cardSelectionVerifierContract,
    address _cardRevealVerifierContract,
    address _attestorEcdsaAddress
  ) {
    farcantasyContract = IERC721(_farcantasyContract);
    cardSelectionVerifierContract = CardSelectionVerifier(
      _cardSelectionVerifierContract
    );
    cardRevealVerifierContract = CardRevealVerifier(
      _cardRevealVerifierContract
    );
    attestorEcdsaAddress = _attestorEcdsaAddress;
  }

  /**
   * Step 1: Create a battle lobby
   */

  function createBattleLobby(uint256[10] calldata cardIds) external {
    // Check conditions
    require(
      farcantasyContract.isApprovedForAll(msg.sender, address(this)),
      "You must approve the contract to transfer your cards."
    );
    require(_hasNoDuplicates(cardIds), "CardIds must be unique.");
    // Transfer cards from the owner to the contract
    for (uint256 i = 0; i < cardIds.length; i++) {
      farcantasyContract.safeTransferFrom(
        msg.sender,
        address(this),
        cardIds[i]
      );
    }
    // Create a new battle lobby
    BattleLobby memory newLobby = BattleLobby({
      lastActivityTimestamp: block.timestamp,
      owner: msg.sender,
      participant: address(0),
      ownerCards: cardIds,
      participantCards: [
        uint256(0),
        uint256(0),
        uint256(0),
        uint256(0),
        uint256(0),
        uint256(0),
        uint256(0),
        uint256(0),
        uint256(0),
        uint256(0)
      ],
      ownerCardSelection: 0,
      participantCardSelection: 0,
      isOwnerBattleLinesRevealed: false,
      ownerBattleLines: [
        [uint8(0), uint8(0), uint8(0)],
        [uint8(0), uint8(0), uint8(0)],
        [uint8(0), uint8(0), uint8(0)]
      ],
      isParticipantBattleLinesRevealed: false,
      participantBattleLines: [
        [uint8(0), uint8(0), uint8(0)],
        [uint8(0), uint8(0), uint8(0)],
        [uint8(0), uint8(0), uint8(0)]
      ],
      battleExecuted: false,
      winners: [0, 0, 0]
    });
    // Add battle lobby to the mapping
    battleLobbies[battleLobbyIndex.current()] = newLobby;
    // Emit event
    emit BattleLobbyCreated(battleLobbyIndex.current(), msg.sender, cardIds);
    // Increment battle lobby index
    battleLobbyIndex.increment();
  }

  function _hasNoDuplicates(
    uint256[10] memory cardIds
  ) internal pure returns (bool) {
    for (uint256 i = 0; i < cardIds.length; i++) {
      for (uint256 j = i + 1; j < cardIds.length; j++) {
        if (cardIds[i] == cardIds[j]) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Step 2: Join a battle lobby
   */

  function joinBattleLobby(
    uint256 lobbyId,
    uint256[10] calldata cardIds
  ) external {
    BattleLobby storage lobby = battleLobbies[lobbyId];
    // Check conditions
    require(_hasNoDuplicates(cardIds), "CardIds must be unique.");
    require(
      lobby.owner != address(0),
      "The specified battle lobby does not exist."
    );
    require(
      lobby.participant == address(0),
      "This battle lobby already has a participant."
    );
    require(
      msg.sender != lobby.owner,
      "The lobby owner cannot join their own lobby as a participant."
    );
    require(
      farcantasyContract.isApprovedForAll(msg.sender, address(this)),
      "You must approve the contract to transfer your cards."
    );
    // Transfer cards from the participant to the contract
    for (uint256 i = 0; i < cardIds.length; i++) {
      farcantasyContract.safeTransferFrom(
        msg.sender,
        address(this),
        cardIds[i]
      );
    }
    // Add participant to the battle lobby
    lobby.participant = msg.sender;
    lobby.participantCards = cardIds;
    // Emit event
    emit BattleLobbyJoined(lobbyId, msg.sender, cardIds);
    // Update last activity timestamp
    _updateLastActivityTimestamp(lobbyId);
  }

  function _transferCardsToOwner(
    uint256[10] memory cards,
    address owner
  ) private {
    for (uint256 i = 0; i < cards.length; i++) {
      if (cards[i] == 0) {
        continue;
      }
      if (farcantasyContract.ownerOf(cards[i]) != address(this)) {
        continue;
      }
      farcantasyContract.safeTransferFrom(address(this), owner, cards[i]);
    }
  }

  function _returnAllCards(BattleLobby memory lobby) private {
    // Return all cards to the owner if contract still holds them
    _transferCardsToOwner(lobby.ownerCards, lobby.owner);
    // Return all cards to the participant if contract still holds them
    _transferCardsToOwner(lobby.participantCards, lobby.participant);
  }

  /**
   * Step 2.5: Optional back off for owner
   */

  function backOff(uint256 lobbyId) external {
    BattleLobby storage lobby = battleLobbies[lobbyId];
    // Check conditions
    require(
      lobby.owner != address(0),
      "The specified battle lobby does not exist."
    );
    require(msg.sender == lobby.owner, "Only the lobby owner can back off.");
    require(
      lobby.ownerCardSelection == 0,
      "The owner has already submitted a card selection."
    );
    // Return all cards
    _returnAllCards(lobby);
    // Delete battle lobby
    delete battleLobbies[lobbyId];
    // Emit event
    emit BattleLobbyBackedOff(lobbyId);
  }

  /**
   * Step 3: Submit card selection proof
   */

  // Helper function to check if the caller is the owner or participant of the lobby
  function _isCallerValid(uint256 lobbyId) internal view returns (bool) {
    BattleLobby storage lobby = battleLobbies[lobbyId];
    return msg.sender == lobby.owner || msg.sender == lobby.participant;
  }

  // Helper function to check if the card selection has already been submitted
  function _hasCardSelectionBeenSubmitted(
    uint256 lobbyId,
    bool isOwner
  ) internal view returns (bool) {
    BattleLobby storage lobby = battleLobbies[lobbyId];
    uint256 currentCardSelection = isOwner
      ? lobby.ownerCardSelection
      : lobby.participantCardSelection;
    return currentCardSelection != 0;
  }

  function submitCardSelectionProof(
    uint256 lobbyId,
    uint[2] memory a,
    uint[2][2] memory b,
    uint[2] memory c,
    uint[1] memory input
  ) external {
    BattleLobby storage lobby = battleLobbies[lobbyId];
    bool isOwner = msg.sender == lobby.owner;

    // Check conditions
    require(
      lobby.owner != address(0),
      "The specified battle lobby does not exist."
    );
    require(
      lobby.participant != address(0),
      "The battle lobby has no participant."
    );
    require(
      _isCallerValid(lobbyId),
      "Only the owner or participant can submit a card selection proof."
    );
    require(
      !_hasCardSelectionBeenSubmitted(lobbyId, isOwner),
      "Card selection proof has already been submitted."
    );
    require(
      cardSelectionVerifierContract.verifyProof(a, b, c, input),
      "The card selection proof is not valid."
    );

    // Set card selection
    if (isOwner) {
      lobby.ownerCardSelection = input[0];
    } else {
      lobby.participantCardSelection = input[0];
    }

    // Emit event
    emit CardSelectionProofSubmitted(lobbyId, msg.sender, input[0]);
    // Update last activity timestamp
    _updateLastActivityTimestamp(lobbyId);
  }

  /**
   * Step 4: Reveal cards
   */

  function revealCards(
    uint256 lobbyId,
    uint[2] memory a,
    uint[2][2] memory b,
    uint[2] memory c,
    uint[10] memory input
  ) external {
    BattleLobby storage lobby = battleLobbies[lobbyId];
    bool isOwner = msg.sender == lobby.owner;

    // Check conditions
    require(
      lobby.owner != address(0),
      "The specified battle lobby does not exist."
    );
    require(
      lobby.participant != address(0),
      "The battle lobby has no participant."
    );
    require(
      _isCallerValid(lobbyId),
      "Only the owner or participant can submit a card selection proof."
    );
    require(
      lobby.ownerCardSelection != 0 && lobby.participantCardSelection != 0,
      "Both card selection proofs must be submitted."
    );
    require(
      cardRevealVerifierContract.verifyProof(a, b, c, input),
      "The card reveal proof is not valid."
    );

    uint256 submittedCardSelection = isOwner
      ? lobby.ownerCardSelection
      : lobby.participantCardSelection;
    require(
      input[0] == submittedCardSelection,
      "The revealed card selection does not match the submitted proof."
    );

    // Set battle lines and isBattleLinesRevealed
    uint8[3][3] memory battleLines;
    for (uint8 i = 0; i < 3; i++) {
      for (uint8 j = 0; j < 3; j++) {
        battleLines[i][j] = uint8(input[1 + i * 3 + j]);
      }
    }
    if (isOwner) {
      lobby.ownerBattleLines = battleLines;
      lobby.isOwnerBattleLinesRevealed = true;
    } else {
      lobby.participantBattleLines = battleLines;
      lobby.isParticipantBattleLinesRevealed = true;
    }

    // Emit event
    emit CardsRevealed(lobbyId, msg.sender, battleLines);

    // Return unused cards
    uint256[5] memory unusedCardIds;
    uint8 unusedCardCount = 0;

    bool[10] memory usedCards;

    for (uint8 i = 0; i < 3; i++) {
      for (uint8 j = 0; j < 3; j++) {
        uint8 usedCardIndex = battleLines[i][j];
        if (usedCardIndex != 0) {
          usedCards[usedCardIndex - 1] = true;
        }
      }
    }

    for (uint8 i = 0; i < 10; i++) {
      if (!usedCards[i]) {
        uint256 cardId = isOwner
          ? lobby.ownerCards[i]
          : lobby.participantCards[i];
        // Add id to unusedCardIds
        unusedCardIds[unusedCardCount] = cardId;
        unusedCardCount++;

        if (unusedCardCount > 4) {
          break;
        }
      }
    }

    for (uint8 i = 0; i < unusedCardCount; i++) {
      farcantasyContract.safeTransferFrom(
        address(this),
        msg.sender,
        unusedCardIds[i]
      );
    }

    // Emit event for unused cards
    emit UnusedCardsReturned(lobbyId, msg.sender, unusedCardIds);

    // Update last activity timestamp
    _updateLastActivityTimestamp(lobbyId);
  }

  /**
   * Step 5: Resolve battle
   */

  function _sliceBytes(
    bytes memory _bytes,
    uint256 _start,
    uint256 _length
  ) internal pure returns (bytes memory) {
    bytes memory tempBytes = new bytes(_length);
    for (uint256 i = 0; i < _length; i++) {
      tempBytes[i] = _bytes[_start + i];
    }
    return tempBytes;
  }

  function _extractDefenceAndOffenceStats(
    bytes memory data,
    bytes32 r,
    bytes32 vs
  ) internal view returns (uint256 cardId, uint16 offence, uint16 defence) {
    // The data is:
    // 1. 32 bytes of card id (uint256)
    // 2. 2 bytes of offence stats (uint16)
    // 3. 2 bytes of defence stats (uint16)
    // 4. 32 bytes of timestamp (uint256)

    // Verify the signature
    (address recoveredAttestorAddress, ECDSA.RecoverError ecdsaError) = ECDSA
      .tryRecover(ECDSA.toEthSignedMessageHash(data), r, vs);
    require(
      ecdsaError == ECDSA.RecoverError.NoError,
      "Error while verifying the ECDSA signature"
    );
    require(
      recoveredAttestorAddress == attestorEcdsaAddress,
      "Wrong attestor public key"
    );

    // Extract the timestamp and require it to be less than two days ago
    uint256 timestamp = abi.decode(_sliceBytes(data, 36, 32), (uint256));
    require(block.timestamp - timestamp <= 2 days, "Timestamp is too old");

    // Return the stats
    return (
      abi.decode(_sliceBytes(data, 0, 32), (uint256)),
      abi.decode(_sliceBytes(data, 32, 2), (uint16)),
      abi.decode(_sliceBytes(data, 34, 2), (uint16))
    );
  }

  function _transferCards(
    uint8[3] memory battleLine,
    uint256[10] memory cards,
    address to
  ) private {
    for (uint8 j = 0; j < 3; j++) {
      uint8 cardIndex = battleLine[j];
      if (cardIndex == 0) {
        continue;
      }
      farcantasyContract.safeTransferFrom(
        address(this),
        to,
        cards[cardIndex - 1]
      );
    }
  }

  function _checkBattleRequirements(uint256 lobbyId) private view {
    BattleLobby storage lobby = battleLobbies[lobbyId];

    // Check conditions
    require(
      lobby.owner != address(0),
      "The specified battle lobby does not exist."
    );
    require(
      lobby.participant != address(0),
      "The battle lobby has no participant."
    );
    require(
      lobby.isOwnerBattleLinesRevealed &&
        lobby.isParticipantBattleLinesRevealed,
      "Both battle lines must be revealed."
    );
    require(!lobby.battleExecuted, "The battle has already been executed.");
  }

  function _calculateLineOffenceAndDefence(
    uint8[3] memory battleLines,
    Signature[3] memory lineStats,
    uint256[10] memory cards
  ) private view returns (uint16 offence, uint16 defence) {
    for (uint8 i = 0; i < 3; i++) {
      // If the card is not present, skip
      if (battleLines[i] == 0) {
        continue;
      }
      // Get card stats
      (
        uint256 cardId,
        uint16 cardOffence,
        uint16 cardDefence
      ) = _extractDefenceAndOffenceStats(
          lineStats[i].data,
          lineStats[i].r,
          lineStats[i].vs
        );
      uint8 cardIndex = battleLines[i] - 1;
      require(
        cardId == cards[cardIndex],
        "The card id does not match the submitted battle line."
      );
      offence += cardOffence;
      defence += cardDefence;
    }
  }

  function _selectWinner(
    uint16 ownerLineOffence,
    uint16 ownerLineDefence,
    uint16 participantLineOffence,
    uint16 participantLineDefence
  ) private pure returns (uint8) {
    int16 ownerScore = int16(ownerLineDefence) - int16(participantLineOffence);
    int16 participantScore = int16(participantLineDefence) -
      int16(ownerLineOffence);
    int16 scoreDifference = ownerScore - participantScore;

    // 0 — No winner, 1 — Owner, 2 — Participant
    return (scoreDifference > 0) ? 1 : ((scoreDifference < 0) ? 2 : 0);
  }

  function _calculateWinners(
    uint256 lobbyId,
    Signature[3][3][2] memory stats
  ) private view returns (uint8[3] memory) {
    BattleLobby storage lobby = battleLobbies[lobbyId];

    uint8[3] memory winners;
    Signature[3][3] memory ownerStats = stats[0];
    Signature[3][3] memory participantStats = stats[1];

    for (uint8 i = 0; i < 3; i++) {
      // Calculate owner and participant offence and defence
      (
        uint16 ownerLineOffence,
        uint16 ownerLineDefence
      ) = _calculateLineOffenceAndDefence(
          lobby.ownerBattleLines[i],
          ownerStats[i],
          lobby.ownerCards
        );
      (
        uint16 participantLineOffence,
        uint16 participantLineDefence
      ) = _calculateLineOffenceAndDefence(
          lobby.participantBattleLines[i],
          participantStats[i],
          lobby.participantCards
        );

      // Select the winner
      winners[i] = _selectWinner(
        ownerLineOffence,
        ownerLineDefence,
        participantLineOffence,
        participantLineDefence
      );
    }

    return winners;
  }

  function executeBattle(
    uint256 lobbyId,
    Signature[3][3][2] memory stats
  ) external {
    // Check conditions
    _checkBattleRequirements(lobbyId);
    // Execute battle
    uint8[3] memory winners = _calculateWinners(lobbyId, stats);
    // Transfer cards depending on winners
    BattleLobby storage lobby = battleLobbies[lobbyId];
    for (uint8 i = 0; i < 3; i++) {
      uint8 winner = winners[i];
      address ownerCardsReceipient = (winner == 0 || winner == 1)
        ? lobby.owner
        : lobby.participant;
      address participantCardsReceipient = (winner == 0 || winner == 2)
        ? lobby.participant
        : lobby.owner;
      _transferCards(
        lobby.ownerBattleLines[i],
        lobby.ownerCards,
        ownerCardsReceipient
      );
      _transferCards(
        lobby.participantBattleLines[i],
        lobby.participantCards,
        participantCardsReceipient
      );
    }
    // Emit event
    emit BattleExecuted(lobbyId, winners);
    // Delete the lobby for gas refund
    delete battleLobbies[lobbyId];
  }

  /**
   * Admin functions
   */

  // Emergency function to withdraw cards from the contract to the owner
  function withdrawCards(uint256[] memory cardIds) external onlyOwner {
    for (uint256 i = 0; i < cardIds.length; i++) {
      farcantasyContract.safeTransferFrom(address(this), owner(), cardIds[i]);
    }
  }

  /**
   * Timeout functions
   */

  function _updateLastActivityTimestamp(uint256 lobbyId) private {
    require(
      battleLobbies[lobbyId].owner != address(0),
      "The specified battle lobby does not exist."
    );
    battleLobbies[lobbyId].lastActivityTimestamp = block.timestamp;
  }

  function hasTimedOut(uint256 lobbyId) public view returns (bool) {
    uint256 timeoutDuration = 2 days;
    return
      block.timestamp >
      battleLobbies[lobbyId].lastActivityTimestamp + timeoutDuration;
  }

  function cancelDueToTimeout(uint256 lobbyId) external {
    BattleLobby storage lobby = battleLobbies[lobbyId];
    // Check requirements
    require(
      lobby.owner != address(0),
      "The specified battle lobby does not exist."
    );
    require(
      msg.sender == lobby.owner ||
        msg.sender == lobby.participant ||
        msg.sender == owner(),
      "Only the owner, the participant or the contract owner can cancel the battle lobby."
    );
    require(!lobby.battleExecuted, "The battle has already been executed.");
    require(hasTimedOut(lobbyId), "The battle lobby has not timed out yet.");
    // Return all cards
    _returnAllCards(lobby);
    // Emit event
    emit BattleCancelledDueToTimeout(lobbyId);
    // Delete the lobby for gas refund
    delete battleLobbies[lobbyId];
  }
}
