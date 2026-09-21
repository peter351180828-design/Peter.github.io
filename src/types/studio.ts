export type PhotoMetadata = {
  make?: string
  model?: string
  lens?: string
  focalLength?: number
  aperture?: number
  exposureTime?: number
  iso?: number
  dateTimeOriginal?: Date
}

export type FontWeightMode =
  | 'regular'
  | 'medium'
  | 'bold'

export type FontPreset =
  | 'template'
  | 'sans'
  | 'serif'
  | 'mono'
  | 'artistic'

export type MetadataMode =
  | 'full'
  | 'minimal'
  | 'exposure'
  | 'hidden'

export type MetadataSourceMode =
  | 'auto'
  | 'custom'
  | 'mixed'

export type CustomMetadataFields = {
  title: string
  subtitle: string
  parameters: string
  date: string
}

export type BackgroundMode =
  | 'white'
  | 'warm'
  | 'black'
  | 'custom'

export type LogoMode =
  | 'brand'
  | 'text'
  | 'custom'
  | 'hidden'

export type BrandKey =
  | 'nikon'
  | 'canon'
  | 'sony'
  | 'fujifilm'

export type BrandSelection =
  | 'auto'
  | BrandKey

export type LogoPosition =
  | 'left'
  | 'center'
  | 'right'

export type MetadataPosition =
  | 'left'
  | 'center'
  | 'right'

export type ControlSection =
  | 'frame'
  | 'type'
  | 'metadata'
  | 'logo'

export type PhotoOrientation =
  | 'landscape'
  | 'portrait'
  | 'square'

export type LogoVariant = {
  id: string
  name: string
  primary: string
  secondary?: string
  assetPath?: string
  baseWidth?: number
  invertOnDark?: boolean
  filmTintable?: boolean
}

export type StudioTemplate = {
  id: string
  name: string
  category: string
  description: string
  frameDefault: number
  backgroundDefault:
    | 'white'
    | 'warm'
    | 'black'
}
