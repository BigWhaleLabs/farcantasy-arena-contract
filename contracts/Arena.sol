// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Arena is Ownable {
  using Counters for Counters.Counter;

  Counters.Counter public lobbyId;
}
