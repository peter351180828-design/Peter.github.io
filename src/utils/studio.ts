import type {
  BrandKey,
  FontWeightMode,
} from '../types/studio'

export const detectBrand = (
  make?: string,
  model?: string,
): BrandKey | null => {
  const source =
    `${make ?? ''} ${model ?? ''}`.toLowerCase()

  if (source.includes('nikon')) return 'nikon'
  if (source.includes('canon')) return 'canon'
  if (source.includes('sony')) return 'sony'

  if (
    source.includes('fujifilm') ||
    source.includes('fuji')
  ) {
    return 'fujifilm'
  }

  return null
}

export const formatShutterSpeed = (
  value?: number,
) => {
  if (!value) return null
  if (value >= 1) {
    return `${Number(value.toFixed(1))}s`
  }

  return `1/${Math.round(1 / value)}`
}

export const formatAperture = (
  value?: number,
) => {
  if (!value) return null
  return `F${Number(value.toFixed(1))}`
}

export const formatDateTime = (
  value?: Date,
) => {
  if (
    !value ||
    Number.isNaN(value.getTime())
  ) {
    return null
  }

  const pad = (number: number) =>
    String(number).padStart(2, '0')

  return `${value.getFullYear()}-${pad(
    value.getMonth() + 1,
  )}-${pad(value.getDate())} ${pad(
    value.getHours(),
  )}:${pad(value.getMinutes())}`
}

export const getFontWeight = (
  mode: FontWeightMode,
) => {
  if (mode === 'regular') return 400
  if (mode === 'bold') return 700
  return 500
}

export const sliderPositionFromValue = (
  value: number,
  min: number,
  defaultValue: number,
  max: number,
) => {
  if (value <= defaultValue) {
    const range = Math.max(
      1,
      defaultValue - min,
    )

    return (
      ((value - min) / range) * 50
    )
  }

  const range = Math.max(
    1,
    max - defaultValue,
  )

  return (
    50 +
    ((value - defaultValue) / range) * 50
  )
}

export const magneticSliderValueFromPosition = (
  position: number,
  currentValue: number,
  min: number,
  defaultValue: number,
  max: number,
  step = 1,
  snapZone = 6,
  releaseZone = 12,
) => {
  const clampedPosition = Math.min(
    100,
    Math.max(0, position),
  )

  const currentPosition =
    sliderPositionFromValue(
      currentValue,
      min,
      defaultValue,
      max,
    )

  const crossedCenter =
    (currentPosition < 50 &&
      clampedPosition > 50) ||
    (currentPosition > 50 &&
      clampedPosition < 50)

  if (currentValue === defaultValue) {
    if (
      Math.abs(clampedPosition - 50) <=
      releaseZone
    ) {
      return defaultValue
    }
  } else if (
    crossedCenter ||
    Math.abs(clampedPosition - 50) <=
      snapZone
  ) {
    return defaultValue
  }

  const rawValue =
    clampedPosition < 50
      ? min +
        (defaultValue - min) *
          (clampedPosition / 50)
      : defaultValue +
        (max - defaultValue) *
          ((clampedPosition - 50) / 50)

  const steppedValue =
    Math.round(rawValue / step) * step

  return Math.min(
    max,
    Math.max(min, steppedValue),
  )
}

export const getContrastColor = (
  hexColor: string,
) => {
  const raw = hexColor.replace('#', '')

  const hex =
    raw.length === 3
      ? raw
          .split('')
          .map((char) => char + char)
          .join('')
      : raw

  if (hex.length !== 6) {
    return '#171717'
  }

  const red = Number.parseInt(
    hex.slice(0, 2),
    16,
  )

  const green = Number.parseInt(
    hex.slice(2, 4),
    16,
  )

  const blue = Number.parseInt(
    hex.slice(4, 6),
    16,
  )

  const brightness =
    (red * 299 +
      green * 587 +
      blue * 114) /
    1000

  return brightness > 150
    ? '#171717'
    : '#f5f5f2'
}
