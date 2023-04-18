export default function (merkleRoot: number) {
  return [
    [1, 1],
    [
      [1, 1],
      [1, 1],
    ],
    [1, 1],
    [merkleRoot],
  ] as [
    [number, number],
    [[number, number], [number, number]],
    [number, number],
    [number]
  ]
}
