// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

struct Signature {
  // bytes calldata data
  bytes data;
  bytes32 r;
  bytes32 vs;
}
