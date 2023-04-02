pragma circom 2.1.4;

include "../node_modules/circomlib/circuits/poseidon.circom";
include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/mux1.circom";

template CardSelection() {
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

  // Check if all card indexes are in the range [1, 10]
  component lessThanEleven[9];
  for (var i = 0; i < 9; i++) {
    lessThanEleven[i] = LessThan(64);
    lessThanEleven[i].in[0] <== cardIndexes[i];
    lessThanEleven[i].in[1] <== 11;
  }
  signal sumLessThanEleven <== lessThanEleven[0].out + lessThanEleven[1].out + lessThanEleven[2].out + lessThanEleven[3].out + lessThanEleven[4].out + lessThanEleven[5].out + lessThanEleven[6].out + lessThanEleven[7].out + lessThanEleven[8].out;
  sumLessThanEleven === 9;

  // Check if there are no duplicates in the selection
  component isDuplicate[36];
  component isZeroNumberA[36];
  component isZeroNumberB[36];
  component isAnyZero[36];
  component muxA[36];
  component muxB[36];
  var index = 0;
  for (var i = 0; i < 9; i++) {
    for (var j = i + 1; j < 9; j++) {
      isZeroNumberA[index] = IsZero();
      isZeroNumberB[index] = IsZero();
      isZeroNumberA[index].in <== cardIndexes[i];
      isZeroNumberB[index].in <== cardIndexes[j];
      isAnyZero[index] = GreaterThan(64);
      isAnyZero[index].in[0] <== isZeroNumberA[index].out + isZeroNumberB[index].out;
      isAnyZero[index].in[1] <== 0;

      muxA[index] = Mux1();
      muxA[index].s <== isAnyZero[index].out;
      muxA[index].c[0] <== cardIndexes[i];
      muxA[index].c[1] <== 11;

      muxB[index] = Mux1();
      muxB[index].s <== isAnyZero[index].out;
      muxB[index].c[0] <== cardIndexes[j];
      muxB[index].c[1] <== 12;

      isDuplicate[index] = IsEqual();
      isDuplicate[index].in[0] <== muxA[index].out;
      isDuplicate[index].in[1] <== muxB[index].out;
      index++;
    }
  }
  signal sumIsDuplicates <== isDuplicate[0].out + isDuplicate[1].out + isDuplicate[2].out + isDuplicate[3].out + isDuplicate[4].out + isDuplicate[5].out + isDuplicate[6].out + isDuplicate[7].out + isDuplicate[8].out + isDuplicate[9].out + isDuplicate[10].out + isDuplicate[11].out + isDuplicate[12].out + isDuplicate[13].out + isDuplicate[14].out + isDuplicate[15].out + isDuplicate[16].out + isDuplicate[17].out + isDuplicate[18].out + isDuplicate[19].out + isDuplicate[20].out + isDuplicate[21].out + isDuplicate[22].out + isDuplicate[23].out + isDuplicate[24].out + isDuplicate[25].out + isDuplicate[26].out + isDuplicate[27].out + isDuplicate[28].out + isDuplicate[29].out + isDuplicate[30].out + isDuplicate[31].out + isDuplicate[32].out + isDuplicate[33].out + isDuplicate[34].out + isDuplicate[35].out;
  sumIsDuplicates === 0;

  // Hash the entropy and the card indexes
  component poseidon = Poseidon(10);
  poseidon.inputs[0] <== entropy;
  for (var i = 0; i < 9; i++) {
    poseidon.inputs[i + 1] <== cardIndexes[i];
  }

  // This is the result
  signal output hash <== poseidon.out;
}

component main = CardSelection();
