import defaultCardSelection from './defaultCardSelection'

export default function (cardIds: number[], selection = defaultCardSelection) {
  const lines = [] as number[][]
  for (let i = 0; i < selection.length; i++) {
    const row: number[] = []
    for (let j = 0; j < selection[i].length; j++) {
      if (selection[i][j] === 0) {
        row.push(0)
        continue
      }
      const cardId = cardIds[selection[i][j] - 1]
      row.push(cardId)
    }
    lines.push(row)
  }
  return lines
}
