import defaultCardSelection from './defaultCardSelection'

const scenarios = [
  { type: 'tie', ownerModifier: 0, participantModifier: 0 },
  { type: 'participantWins', ownerModifier: -1, participantModifier: 1 },
  { type: 'ownerWins', ownerModifier: 1, participantModifier: -1 },
]

function generateTestCases(
  numTestCases: number,
  cardSelection = defaultCardSelection
) {
  const testCases = [] as {
    participantStats: number[][][]
    ownerStats: number[][][]
    expectedWinners: number[]
  }[]

  // Manually create specific test cases
  const specificTestCases = [
    { expectedWinners: [1, 1, 1], modifier: 1 },
    { expectedWinners: [0, 0, 0], modifier: 0 },
    { expectedWinners: [2, 2, 2], modifier: -1 },
  ]

  for (const specificTestCase of specificTestCases) {
    const { expectedWinners, modifier } = specificTestCase
    const participantStats = [] as number[][][]
    const ownerStats = [] as number[][][]

    for (let j = 0; j < 3; j++) {
      const participantLine = [] as number[][]
      const ownerLine = [] as number[][]

      for (let k = 0; k < 3; k++) {
        const baseValue = cardSelection[j][k] === 0 ? 0 : 5
        const participantCard = [baseValue, baseValue]
        const ownerCard = [baseValue + modifier, baseValue + modifier]

        participantLine.push(participantCard)
        ownerLine.push(ownerCard)
      }

      participantStats.push(participantLine)
      ownerStats.push(ownerLine)
    }

    testCases.push({
      participantStats,
      ownerStats,
      expectedWinners,
    })
  }

  for (let i = 0; i < numTestCases; i++) {
    const participantStats = [] as number[][][]
    const ownerStats = [] as number[][][]
    const expectedWinners = [] as number[]

    for (let j = 0; j < 3; j++) {
      const scenario = scenarios[(i + j) % scenarios.length]
      const participantLine = [] as number[][]
      const ownerLine = [] as number[][]

      for (let k = 0; k < 3; k++) {
        const baseValue = cardSelection[j][k] === 0 ? 0 : i + 1
        const participantCard = [
          baseValue + scenario.participantModifier,
          baseValue + scenario.participantModifier,
        ]
        const ownerCard = [
          baseValue + scenario.ownerModifier,
          baseValue + scenario.ownerModifier,
        ]

        participantLine.push(participantCard)
        ownerLine.push(ownerCard)
      }

      participantStats.push(participantLine)
      ownerStats.push(ownerLine)

      const ownerLineOffence = ownerLine.reduce((sum, card) => sum + card[0], 0)
      const ownerLineDefence = ownerLine.reduce((sum, card) => sum + card[1], 0)
      const participantLineOffence = participantLine.reduce(
        (sum, card) => sum + card[0],
        0
      )
      const participantLineDefence = participantLine.reduce(
        (sum, card) => sum + card[1],
        0
      )

      const ownerScore = ownerLineDefence - participantLineOffence
      const participantScore = participantLineDefence - ownerLineOffence
      const scoreDifference = ownerScore - participantScore

      const winner = scoreDifference > 0 ? 1 : scoreDifference < 0 ? 2 : 0
      expectedWinners.push(winner)
    }

    testCases.push({
      participantStats,
      ownerStats,
      expectedWinners,
    })
  }

  return testCases
}

const testCases = generateTestCases(10)

export default testCases
