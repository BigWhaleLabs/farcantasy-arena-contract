export default function (skip = 0) {
  return Array(10)
    .fill(0)
    .map((_, i) => i + skip)
}
