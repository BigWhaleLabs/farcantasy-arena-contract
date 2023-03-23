// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface ICardRevealVerifier {
  function verifyProof(
    uint[2] memory a,
    uint[2][2] memory b,
    uint[2] memory c,
    uint[10] memory input
  ) external view returns (bool r);
}
