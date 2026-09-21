type ColorBucket = {
  count: number
  red: number
  green: number
  blue: number
}

const clampChannel = (
  value: number,
) =>
  Math.min(
    255,
    Math.max(0, Math.round(value)),
  )

const channelToHex = (
  value: number,
) =>
  clampChannel(value)
    .toString(16)
    .padStart(2, '0')

const rgbToHex = (
  red: number,
  green: number,
  blue: number,
) =>
  `#${channelToHex(red)}${channelToHex(
    green,
  )}${channelToHex(blue)}`.toUpperCase()

const colorDistance = (
  first: ColorBucket,
  second: ColorBucket,
) => {
  const red =
    first.red - second.red

  const green =
    first.green - second.green

  const blue =
    first.blue - second.blue

  return Math.sqrt(
    red * red +
      green * green +
      blue * blue,
  )
}

export const DEFAULT_PHOTO_PALETTE = [
  '#29475B',
  '#698596',
  '#D9B08B',
  '#8B684B',
  '#272727',
]

export async function extractDominantColors(
  src: string,
  count = 5,
) {
  const image =
    await new Promise<HTMLImageElement>(
      (resolve, reject) => {
        const nextImage = new Image()

        nextImage.onload = () =>
          resolve(nextImage)

        nextImage.onerror = () =>
          reject(
            new Error(
              'Photo color sampling failed.',
            ),
          )

        nextImage.src = src
      },
    )

  const naturalWidth = Math.max(
    1,
    image.naturalWidth,
  )

  const naturalHeight = Math.max(
    1,
    image.naturalHeight,
  )

  const maxSampleEdge = 96

  const scale = Math.min(
    1,
    maxSampleEdge /
      Math.max(
        naturalWidth,
        naturalHeight,
      ),
  )

  const width = Math.max(
    1,
    Math.round(
      naturalWidth * scale,
    ),
  )

  const height = Math.max(
    1,
    Math.round(
      naturalHeight * scale,
    ),
  )

  const canvas =
    document.createElement('canvas')

  canvas.width = width
  canvas.height = height

  const context =
    canvas.getContext(
      '2d',
      {
        willReadFrequently: true,
      },
    )

  if (!context) {
    return DEFAULT_PHOTO_PALETTE.slice(
      0,
      count,
    )
  }

  context.drawImage(
    image,
    0,
    0,
    width,
    height,
  )

  const pixels =
    context.getImageData(
      0,
      0,
      width,
      height,
    ).data

  const buckets =
    new Map<string, ColorBucket>()

  const quantize = (
    value: number,
  ) =>
    Math.min(
      255,
      Math.floor(value / 32) * 32 +
        16,
    )

  for (
    let index = 0;
    index < pixels.length;
    index += 4
  ) {
    const alpha =
      pixels[index + 3]

    if (alpha < 160) {
      continue
    }

    const red = pixels[index]
    const green =
      pixels[index + 1]
    const blue =
      pixels[index + 2]

    const qRed = quantize(red)
    const qGreen = quantize(green)
    const qBlue = quantize(blue)

    const key =
      `${qRed}-${qGreen}-${qBlue}`

    const existing =
      buckets.get(key)

    if (existing) {
      existing.count += 1
      existing.red += red
      existing.green += green
      existing.blue += blue
    } else {
      buckets.set(key, {
        count: 1,
        red,
        green,
        blue,
      })
    }
  }

  const candidates =
    Array.from(
      buckets.values(),
    )
      .map((bucket) => {
        const red =
          bucket.red / bucket.count

        const green =
          bucket.green /
          bucket.count

        const blue =
          bucket.blue / bucket.count

        const max = Math.max(
          red,
          green,
          blue,
        )

        const min = Math.min(
          red,
          green,
          blue,
        )

        const saturation =
          max - min

        return {
          ...bucket,
          red,
          green,
          blue,
          score:
            bucket.count *
            (0.9 +
              (saturation / 255) *
                0.35),
        }
      })
      .sort(
        (first, second) =>
          second.score -
          first.score,
      )

  const selected: ColorBucket[] = []

  const collectWithDistance = (
    minimumDistance: number,
  ) => {
    for (
      const candidate of candidates
    ) {
      if (
        selected.length >= count
      ) {
        break
      }

      const isDistinct =
        selected.every(
          (color) =>
            colorDistance(
              color,
              candidate,
            ) >= minimumDistance,
        )

      if (isDistinct) {
        selected.push(candidate)
      }
    }
  }

  collectWithDistance(62)

  if (selected.length < count) {
    collectWithDistance(38)
  }

  if (selected.length < count) {
    for (
      const fallback of
        DEFAULT_PHOTO_PALETTE
    ) {
      if (
        selected.length >= count
      ) {
        break
      }

      const parsed: ColorBucket = {
        count: 1,
        red: Number.parseInt(
          fallback.slice(1, 3),
          16,
        ),
        green: Number.parseInt(
          fallback.slice(3, 5),
          16,
        ),
        blue: Number.parseInt(
          fallback.slice(5, 7),
          16,
        ),
      }

      selected.push(parsed)
    }
  }

  return selected
    .slice(0, count)
    .map((color) =>
      rgbToHex(
        color.red,
        color.green,
        color.blue,
      ),
    )
}
