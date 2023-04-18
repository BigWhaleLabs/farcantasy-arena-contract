import defaultCardSelection from './defaultCardSelection'

export default function (
  merkleRoot: number,
  selection: number[][] = defaultCardSelection
) {
  return [
    [1, 1],
    [
      [1, 1],
      [1, 1],
    ],
    [1, 1],
    [merkleRoot, ...selection.reduce((acc, curr) => [...acc, ...curr], [])],
  ] as [
    [number, number],
    [[number, number], [number, number]],
    [number, number],
    [
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number
    ]
  ]
}
