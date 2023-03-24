pragma circom 2.1.4;

include "../node_modules/circomlib/circuits/poseidon.circom";
include "../node_modules/circomlib/circuits/comparators.circom";

template CardReveal() {
  signal input entropy;
  signal input cardIndexes[9]; // 1-3, 4-6, 7-9 respectively for lines 1, 2 and 3

  // Check if all lines have at least one card selected
  component isLineZero[3];
  for (var i = 0; i < 3; i++) {
    isLineZero[i] = IsZero();
    isLineZero[i].in <== cardIndexes[3 * i] + cardIndexes[3 * i + 1] + cardIndexes[3 * i + 2];
    isLineZero[i].out === 0;
  }

  // Check if there are four 0's in cardIndexes
  component isZero[9];
  for (var i = 0; i < 9; i++) {
    isZero[i] = IsZero();
    isZero[i].in <== cardIndexes[i];
  }
  signal sumIsZeros <== isZero[0].out + isZero[1].out + isZero[2].out + isZero[3].out + isZero[4].out + isZero[5].out + isZero[6].out + isZero[7].out + isZero[8].out;
  sumIsZeros === 4;

  // Hash the entropy and the card indexes
  component poseidon = Poseidon(10);
  poseidon.inputs[0] <== entropy;
  for (var i = 0; i < 9; i++) {
    poseidon.inputs[i + 1] <== cardIndexes[i];
  }

  // This is the result
  signal output hash <== poseidon.out;
}

component main {public [cardIndexes]} = CardReveal();
