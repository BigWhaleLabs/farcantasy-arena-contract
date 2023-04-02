pragma circom 2.1.4;

include "../node_modules/circomlib/circuits/poseidon.circom";

template CardReveal() {
  signal input entropy;
  signal input cardIndexes[9]; // 1-3, 4-6, 7-9 respectively for lines 1, 2 and 3

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
