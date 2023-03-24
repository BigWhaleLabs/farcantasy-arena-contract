pragma circom 2.1.4;

include "../node_modules/circomlib/circuits/poseidon.circom";

template CardSelection() {
  signal input x;
  signal input y;

  component poseidon = Poseidon(2);
  poseidon.inputs[0] <== x;
  poseidon.inputs[1] <== y;

  signal output hash <== poseidon.out;
}

component main = CardSelection();
