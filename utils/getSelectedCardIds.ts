import defaultCardSelection from './defaultCardSelection'

export default function (
  tokenIds: number[],
  selection: number[][] = defaultCardSelection
) {
  const selectedCardIds = [] as number[]
  for (const row of selection) {
    for (const index of row) {
      if (index > 0) {
        selectedCardIds.push(tokenIds[index - 1])
      }
    }
  }
  return selectedCardIds
}
