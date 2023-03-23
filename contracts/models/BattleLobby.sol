// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

struct BattleLobby {
  address owner;
  address participant;
  uint256[10] ownerCards;
  uint256[10] participantCards;
  uint256 ownerCardSelection;
  uint256 participantCardSelection;
  bool isOwnerBattleLinesRevealed;
  uint8[3][3] ownerBattleLines;
  bool isParticipantBattleLinesRevealed;
  uint8[3][3] participantBattleLines;
  bool battleExecuted;
  uint8[3] winners; // 0 — No winner, 1 — Owner, 2 — Participant
}
