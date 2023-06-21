// SPDX-License-Identifier: GPL-3.0
/*
    Copyright 2021 0KIMS association.

    This file is generated with [snarkJS](https://github.com/iden3/snarkjs).

    snarkJS is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    snarkJS is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with snarkJS. If not, see <https://www.gnu.org/licenses/>.
*/

pragma solidity 0.8.19;

import "@big-whale-labs/versioned-contract/contracts/Versioned.sol";

contract CardRevealVerifier is Versioned {
  constructor(string memory _version) Versioned(_version) {}

  // Scalar field size
  uint256 constant r =
    21888242871839275222246405745257275088548364400416034343698204186575808495617;
  // Base field size
  uint256 constant q =
    21888242871839275222246405745257275088696311157297823662689037894645226208583;

  // Verification Key data
  uint256 constant alphax =
    20491192805390485299153009773594534940189261866228447918068658471970481763042;
  uint256 constant alphay =
    9383485363053290200918347156157836566562967994039712273449902621266178545958;
  uint256 constant betax1 =
    4252822878758300859123897981450591353533073413197771768651442665752259397132;
  uint256 constant betax2 =
    6375614351688725206403948262868962793625744043794305715222011528459656738731;
  uint256 constant betay1 =
    21847035105528745403288232691147584728191162732299865338377159692350059136679;
  uint256 constant betay2 =
    10505242626370262277552901082094356697409835680220590971873171140371331206856;
  uint256 constant gammax1 =
    11559732032986387107991004021392285783925812861821192530917403151452391805634;
  uint256 constant gammax2 =
    10857046999023057135944570762232829481370756359578518086990519993285655852781;
  uint256 constant gammay1 =
    4082367875863433681332203403145435568316851327593401208105741076214120093531;
  uint256 constant gammay2 =
    8495653923123431417604973247489272438418190587263600148770280649306958101930;
  uint256 constant deltax1 =
    12599857379517512478445603412764121041984228075771497593287716170335433683702;
  uint256 constant deltax2 =
    7912208710313447447762395792098481825752520616755888860068004689933335666613;
  uint256 constant deltay1 =
    11502426145685875357967720478366491326865907869902181704031346886834786027007;
  uint256 constant deltay2 =
    21679208693936337484429571887537508926366191105267550375038502782696042114705;

  uint256 constant IC0x =
    11541328982697831985122779204525341819172299548155197733745512760010296786584;
  uint256 constant IC0y =
    4912600014728947449271015462008279900846525879333470015129856497234688681860;

  uint256 constant IC1x =
    5095366173201937644198755240196821861507441044952600146715033842023234883239;
  uint256 constant IC1y =
    9633397311799064738056755761122783954989062773597450488482369890087233674190;

  uint256 constant IC2x =
    16878846278201199104802929009918661787677857251013946331013402737587246867132;
  uint256 constant IC2y =
    10702886471779946802322996306107005280645031035426640608939887954744377767525;

  uint256 constant IC3x =
    21439407089229873122681007258056601007227091616519841953979575330497893397805;
  uint256 constant IC3y =
    5702254530232485713270452755236328946643581997021255529943197211379073429171;

  uint256 constant IC4x =
    17608116881845010590378067189317788522166039086600924456290555523627194946067;
  uint256 constant IC4y =
    8012846502058757406846550549140665563922094458449623712299320506897180174692;

  uint256 constant IC5x =
    17852274418476008940436659231585699079831101224968310979800603393890578963516;
  uint256 constant IC5y =
    1805803153506207167162752761780659702599560228280388455003974752513589132221;

  uint256 constant IC6x =
    4763439974264361387416476919662400407956619804665899908984723306158104713160;
  uint256 constant IC6y =
    2765100138637275096691277114994122131160568933049478750954156982134659561442;

  uint256 constant IC7x =
    8654240804020568741212723859223792565474198007132120540606658965318669836163;
  uint256 constant IC7y =
    9664781494540430840267087387531802611723660949877200626291832611414986586914;

  uint256 constant IC8x =
    16636387562477730014495128472858806773744577034186063676942116651188617572438;
  uint256 constant IC8y =
    6195707433634410173722733934315993612317892279729723057698401147630173432822;

  uint256 constant IC9x =
    21230853291512288435953152321032640238505792990024337182956341218718111540315;
  uint256 constant IC9y =
    4897945756441813304294759563517903648591172014865067993724983783956801946213;

  uint256 constant IC10x =
    13378012824044463291904716111260648896508566648428832704194728609209929123953;
  uint256 constant IC10y =
    20901433448539387109110757768258720210096642067384720888058046649013570848084;

  // Memory data
  uint16 constant pVk = 0;
  uint16 constant pPairing = 128;

  uint16 constant pLastMem = 896;

  function verifyProof(
    uint[2] calldata _pA,
    uint[2][2] calldata _pB,
    uint[2] calldata _pC,
    uint[10] calldata _pubSignals
  ) public view returns (bool) {
    assembly {
      function checkField(v) {
        if iszero(lt(v, q)) {
          mstore(0, 0)
          return(0, 0x20)
        }
      }

      // G1 function to multiply a G1 value(x,y) to value in an address
      function g1_mulAccC(pR, x, y, s) {
        let success
        let mIn := mload(0x40)
        mstore(mIn, x)
        mstore(add(mIn, 32), y)
        mstore(add(mIn, 64), s)

        success := staticcall(sub(gas(), 2000), 7, mIn, 96, mIn, 64)

        if iszero(success) {
          mstore(0, 0)
          return(0, 0x20)
        }

        mstore(add(mIn, 64), mload(pR))
        mstore(add(mIn, 96), mload(add(pR, 32)))

        success := staticcall(sub(gas(), 2000), 6, mIn, 128, pR, 64)

        if iszero(success) {
          mstore(0, 0)
          return(0, 0x20)
        }
      }

      function checkPairing(pA, pB, pC, pubSignals, pMem) -> isOk {
        let _pPairing := add(pMem, pPairing)
        let _pVk := add(pMem, pVk)

        mstore(_pVk, IC0x)
        mstore(add(_pVk, 32), IC0y)

        // Compute the linear combination vk_x

        g1_mulAccC(_pVk, IC1x, IC1y, calldataload(add(pubSignals, 0)))

        g1_mulAccC(_pVk, IC2x, IC2y, calldataload(add(pubSignals, 32)))

        g1_mulAccC(_pVk, IC3x, IC3y, calldataload(add(pubSignals, 64)))

        g1_mulAccC(_pVk, IC4x, IC4y, calldataload(add(pubSignals, 96)))

        g1_mulAccC(_pVk, IC5x, IC5y, calldataload(add(pubSignals, 128)))

        g1_mulAccC(_pVk, IC6x, IC6y, calldataload(add(pubSignals, 160)))

        g1_mulAccC(_pVk, IC7x, IC7y, calldataload(add(pubSignals, 192)))

        g1_mulAccC(_pVk, IC8x, IC8y, calldataload(add(pubSignals, 224)))

        g1_mulAccC(_pVk, IC9x, IC9y, calldataload(add(pubSignals, 256)))

        g1_mulAccC(_pVk, IC10x, IC10y, calldataload(add(pubSignals, 288)))

        // -A
        mstore(_pPairing, calldataload(pA))
        mstore(add(_pPairing, 32), mod(sub(q, calldataload(add(pA, 32))), q))

        // B
        mstore(add(_pPairing, 64), calldataload(pB))
        mstore(add(_pPairing, 96), calldataload(add(pB, 32)))
        mstore(add(_pPairing, 128), calldataload(add(pB, 64)))
        mstore(add(_pPairing, 160), calldataload(add(pB, 96)))

        // alpha1
        mstore(add(_pPairing, 192), alphax)
        mstore(add(_pPairing, 224), alphay)

        // beta2
        mstore(add(_pPairing, 256), betax1)
        mstore(add(_pPairing, 288), betax2)
        mstore(add(_pPairing, 320), betay1)
        mstore(add(_pPairing, 352), betay2)

        // vk_x
        mstore(add(_pPairing, 384), mload(add(pMem, pVk)))
        mstore(add(_pPairing, 416), mload(add(pMem, add(pVk, 32))))

        // gamma2
        mstore(add(_pPairing, 448), gammax1)
        mstore(add(_pPairing, 480), gammax2)
        mstore(add(_pPairing, 512), gammay1)
        mstore(add(_pPairing, 544), gammay2)

        // C
        mstore(add(_pPairing, 576), calldataload(pC))
        mstore(add(_pPairing, 608), calldataload(add(pC, 32)))

        // delta2
        mstore(add(_pPairing, 640), deltax1)
        mstore(add(_pPairing, 672), deltax2)
        mstore(add(_pPairing, 704), deltay1)
        mstore(add(_pPairing, 736), deltay2)

        let success := staticcall(
          sub(gas(), 2000),
          8,
          _pPairing,
          768,
          _pPairing,
          0x20
        )

        isOk := and(success, mload(_pPairing))
      }

      let pMem := mload(0x40)
      mstore(0x40, add(pMem, pLastMem))

      // Validate that all evaluations ∈ F

      checkField(calldataload(add(_pubSignals, 0)))

      checkField(calldataload(add(_pubSignals, 32)))

      checkField(calldataload(add(_pubSignals, 64)))

      checkField(calldataload(add(_pubSignals, 96)))

      checkField(calldataload(add(_pubSignals, 128)))

      checkField(calldataload(add(_pubSignals, 160)))

      checkField(calldataload(add(_pubSignals, 192)))

      checkField(calldataload(add(_pubSignals, 224)))

      checkField(calldataload(add(_pubSignals, 256)))

      checkField(calldataload(add(_pubSignals, 288)))

      checkField(calldataload(add(_pubSignals, 320)))

      // Validate all evaluations
      let isValid := checkPairing(_pA, _pB, _pC, _pubSignals, pMem)

      mstore(0, isValid)
      return(0, 0x20)
    }
  }
}
