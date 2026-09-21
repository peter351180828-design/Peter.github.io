import type {
  BackgroundMode,
  PhotoOrientation,
} from '../types/studio'

export const PREVIEW_DESIGN_WIDTH: Record<
  PhotoOrientation,
  number
> = {
  landscape: 980,
  portrait: 560,
  square: 720,
}

export const MAX_WEB_EXPORT_EDGE = 12000
export const MAX_WEB_EXPORT_PIXELS =
  72_000_000
export const JPEG_EXPORT_QUALITY = 0.96

export const BACKGROUND_COLORS: Record<
  Exclude<BackgroundMode, 'custom'>,
  string
> = {
  white: '#ffffff',
  warm: '#eee8dc',
  black: '#151515',
}
