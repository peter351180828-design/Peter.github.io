import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type WheelEvent,
  type CSSProperties,
} from 'react'
import gsap from 'gsap'
import exifr from 'exifr'
import { toCanvas } from 'html-to-image'

import {
  BACKGROUND_COLORS,
  JPEG_EXPORT_QUALITY,
  MAX_WEB_EXPORT_EDGE,
  MAX_WEB_EXPORT_PIXELS,
  PREVIEW_DESIGN_WIDTH,
} from './config/studio'
import { LOGO_LIBRARY } from './data/logos'
import { TemplateRenderer } from './components/templates/TemplateRenderer'
import { templates } from './data/templates'
import type {
  BackgroundMode,
  BrandKey,
  BrandSelection,
  ControlSection,
  CustomMetadataFields,
  FontPreset,
  FontWeightMode,
  LogoMode,
  LogoPosition,
  MetadataMode,
  MetadataPosition,
  MetadataSourceMode,
  PhotoMetadata,
  PhotoOrientation,
} from './types/studio'
import {
  detectBrand,
  formatAperture,
  formatDateTime,
  formatShutterSpeed,
  getContrastColor,
  getFontWeight,
  magneticSliderValueFromPosition,
  sliderPositionFromValue,
} from './utils/studio'
import './App.css'

const getDefaultCustomMetadata = (): CustomMetadataFields => {
  const now = new Date()

  const pad = (value: number) =>
    String(value).padStart(2, '0')

  const date = `${now.getFullYear()}.${pad(
    now.getMonth() + 1,
  )}.${pad(now.getDate())}`

  return {
    title: 'Nikon Classic',
    subtitle: 'NIKKOR Z 50mm f/1.8 S',
    parameters: '50mm · F2.0 · 1/125 · ISO100',
    date,
  }
}

const getIllustrationDefaultMetadata =
  (): CustomMetadataFields => {
    const date =
      getDefaultCustomMetadata().date

    return {
      title: 'Untitled',
      subtitle: 'Artist / Series',
      parameters:
        'Digital Illustration · Original',
      date,
    }
  }

const getIllustrationPosterMetadata =
  (): CustomMetadataFields => {
    const date =
      getDefaultCustomMetadata().date

    return {
      title: 'AFTERGLOW',
      subtitle: 'Character Study / 02',
      parameters:
        'Original Artwork · Poster Edition',
      date,
    }
  }

const getIllustrationMangaMetadata =
  (): CustomMetadataFields => {
    const date =
      getDefaultCustomMetadata().date

    return {
      title: 'AFTERGLOW',
      subtitle: 'Character Sequence / 03',
      parameters:
        'Original Artwork · Manga Panel Edition',
      date,
    }
  }

const getEmptyCustomMetadata = (): CustomMetadataFields => ({
  title: '',
  subtitle: '',
  parameters: '',
  date: '',
})

const hexToRgba = (
  hex: string,
  alpha: number,
) => {
  const normalized =
    hex.replace('#', '').trim()

  const fullHex =
    normalized.length === 3
      ? normalized
          .split('')
          .map((value) => `${value}${value}`)
          .join('')
      : normalized

  const safeHex =
    /^[0-9a-fA-F]{6}$/.test(fullHex)
      ? fullHex
      : '151515'

  const red = Number.parseInt(
    safeHex.slice(0, 2),
    16,
  )
  const green = Number.parseInt(
    safeHex.slice(2, 4),
    16,
  )
  const blue = Number.parseInt(
    safeHex.slice(4, 6),
    16,
  )

  return `rgba(${red}, ${green}, ${blue}, ${Math.max(
    0,
    Math.min(1, alpha),
  )})`
}

const getSliderVisualStyle = (
  progress: number,
) =>
  ({
    '--studio-range-progress':
      `${Math.max(
        0,
        Math.min(100, progress),
      )}%`,
  } as CSSProperties)

type CustomMetadataDirty = Record<
  keyof CustomMetadataFields,
  boolean
>

type CustomMetadataKeepLine = Record<
  keyof CustomMetadataFields,
  boolean
>

const getCleanCustomMetadataDirty =
  (): CustomMetadataDirty => ({
    title: false,
    subtitle: false,
    parameters: false,
    date: false,
  })

const getCleanCustomMetadataKeepLine =
  (): CustomMetadataKeepLine => ({
    title: false,
    subtitle: false,
    parameters: false,
    date: false,
  })

type FontPresetDefinition = {
  name: string
  description: string
  sample: string
  titleFamily: string
  metadataFamily: string
}

const FONT_PRESETS: Record<
  Exclude<FontPreset, 'template'>,
  FontPresetDefinition
> = {
  sans: {
    name: '现代',
    description: '简洁 / 中性',
    sample: 'Aa 文',
    titleFamily:
      '"Segoe UI", "Microsoft YaHei UI", "Microsoft YaHei", Arial, sans-serif',
    metadataFamily:
      '"Segoe UI", "Microsoft YaHei UI", "Microsoft YaHei", Arial, sans-serif',
  },

  serif: {
    name: '编辑',
    description: '衬线 / 精致',
    sample: 'Aa 文',
    titleFamily:
      'Georgia, "Noto Serif SC", "Source Han Serif SC", SimSun, serif',
    metadataFamily:
      '"Segoe UI", "Microsoft YaHei UI", "Microsoft YaHei", Arial, sans-serif',
  },

  mono: {
    name: '等宽',
    description: '技术 / 胶片',
    sample: 'Aa 01',
    titleFamily:
      'Consolas, "SFMono-Regular", "Courier New", monospace',
    metadataFamily:
      'Consolas, "SFMono-Regular", "Courier New", monospace',
  },

  artistic: {
    name: '艺术',
    description: '楷体 / 人文',
    sample: '字 文',
    titleFamily:
      '"KaiTi", "STKaiti", "Kaiti SC", "FangSong", "STFangsong", serif',
    metadataFamily:
      '"KaiTi", "STKaiti", "Kaiti SC", "FangSong", "STFangsong", serif',
  },
}

type FilmMatteColorPreset =
  | 'brown'
  | 'black'
  | 'blue'

type FilmMatteTextPreset =
  | 'white'
  | 'orange'
  | 'red'

const FILM_MATTE_COLOR_THEMES: Record<
  FilmMatteColorPreset,
  {
    base: string
    strong: string
    soft: string
    edge: string
    perf: string
    caption: string
  }
> = {
  black: {
    base: '#0b0b0d',
    strong: '#040406',
    soft: '#14161a',
    edge: '#1a1d22',
    perf: '#f0ede4',
    caption: 'rgba(240, 237, 228, 0.34)',
  },
  brown: {
    base: '#4d392a',
    strong: '#2f2218',
    soft: '#65503d',
    edge: '#7f6854',
    perf: '#f3eadb',
    caption: 'rgba(243, 234, 219, 0.34)',
  },
  blue: {
    base: '#162231',
    strong: '#091119',
    soft: '#243447',
    edge: '#314559',
    perf: '#eef1f0',
    caption: 'rgba(238, 241, 240, 0.34)',
  },
}

const FILM_MATTE_TEXT_THEMES: Record<
  FilmMatteTextPreset,
  {
    primary: string
    secondary: string
    logoFilter: string
  }
> = {
  white: {
    primary: '#f7f4eb',
    secondary: 'rgba(247, 244, 235, 0.72)',
    logoFilter: 'brightness(0) saturate(100%) invert(97%) sepia(11%) saturate(345%) hue-rotate(330deg) brightness(106%) contrast(92%)',
  },
  orange: {
    primary: '#f0b15f',
    secondary: 'rgba(240, 177, 95, 0.72)',
    logoFilter: 'brightness(0) saturate(100%) invert(79%) sepia(40%) saturate(1069%) hue-rotate(335deg) brightness(96%) contrast(90%)',
  },
  red: {
    primary: '#d78352',
    secondary: 'rgba(215, 131, 82, 0.74)',
    logoFilter: 'brightness(0) saturate(100%) invert(57%) sepia(29%) saturate(1436%) hue-rotate(336deg) brightness(96%) contrast(88%)',
  },
}

type MangaLayout =
  | 'layout-1'
  | 'layout-2'
  | 'layout-3'

type TemplateMemorySettings = {
  frameSize: number
  shadowRibbonOpacity: number
  shadowRibbonBlur: number
  shadowRibbonPositionY: number
  shadowRibbonWidthMode: 'inset' | 'full'
  mangaLinkedCrop: boolean
  mangaLayout: MangaLayout
  mangaPrimarySplit: number
  mangaSecondarySplit: number
  mangaMainImageX: number
  mangaMainImageY: number
  mangaMainImageScale: number
  mangaTopImageX: number
  mangaTopImageY: number
  mangaTopImageScale: number
  mangaBottomImageX: number
  mangaBottomImageY: number
  mangaBottomImageScale: number
  mangaPanelGap: number
  mangaBorderWidth: number
  mangaSceneLabel: string
  mangaSideCaption: string
  mangaShowSceneLabel: boolean
  mangaShowSideCaption: boolean
  cameraSize: number
  metadataSize: number
  logoSize: number
  fontWeight: FontWeightMode
  fontPreset: FontPreset
  metadataMode: MetadataMode
  metadataSourceMode: MetadataSourceMode
  customMetadata: CustomMetadataFields
  customMetadataDirty: CustomMetadataDirty
  customMetadataKeepLine: CustomMetadataKeepLine
  showDate: boolean
  metadataPrimaryColorOverride: string | null
  metadataSecondaryColorOverride: string | null
  metadataPosition: MetadataPosition
  metadataOffsetX: number
  metadataOffsetY: number
  backgroundMode: BackgroundMode
  filmMatteColorPreset: FilmMatteColorPreset
  filmMatteTextPreset: FilmMatteTextPreset
  customFrameColor: string
  logoMode: LogoMode
  brandSelection: BrandSelection
  logoVariant: string
  logoPosition: LogoPosition
  logoOffsetX: number
  logoOffsetY: number
  customLogoText: string
  customLogoBaseWidth: number
  customLogoInvertOnDark: boolean
  customLogoRemoveWhite: boolean
  customLogoWhiteStrength: number
}

const TEMPLATE_MEMORY_VERSION = 1
const TEMPLATE_MEMORY_PREFIX =
  'photo-frame-studio:template-memory:v1:'

const getTemplateMemoryKey = (
  templateId: string,
) => `${TEMPLATE_MEMORY_PREFIX}${templateId}`

const getTemplateMemoryDefaults = (
  selectedTemplate: (typeof templates)[number],
): TemplateMemorySettings => ({
  frameSize: selectedTemplate.frameDefault,
  shadowRibbonOpacity: 50,
  shadowRibbonBlur: 1,
  shadowRibbonPositionY: 97,
  shadowRibbonWidthMode: 'inset',
  mangaLinkedCrop: false,
  mangaLayout: 'layout-1',
  mangaPrimarySplit: 72,
  mangaSecondarySplit: 50,
  mangaMainImageX: 0,
  mangaMainImageY: 0,
  mangaMainImageScale: 100,
  mangaTopImageX: 0,
  mangaTopImageY: 0,
  mangaTopImageScale: 100,
  mangaBottomImageX: 0,
  mangaBottomImageY: 0,
  mangaBottomImageScale: 100,
  mangaPanelGap: 8,
  mangaBorderWidth: 1,
  mangaSceneLabel: 'SCENE 03',
  mangaSideCaption:
    'FRAME STUDY · ORIGINAL WORK',
  mangaShowSceneLabel: true,
  mangaShowSideCaption: true,
  cameraSize:
    selectedTemplate.id === 'I02'
      ? 118
      : selectedTemplate.id === 'I03'
        ? 108
        : 100,
  metadataSize:
    selectedTemplate.id === 'I02'
      ? 92
      : selectedTemplate.id === 'I03'
        ? 94
        : 100,
  logoSize: 100,
  fontWeight:
    selectedTemplate.id === 'I02'
      ? 'bold'
      : 'medium',
  fontPreset: 'template',
  metadataMode:
    selectedTemplate.id === '02' ||
    selectedTemplate.id === '03'
      ? 'minimal'
      : 'full',
  metadataSourceMode:
    selectedTemplate.id.startsWith('I')
      ? 'custom'
      : 'auto',
  customMetadata: getEmptyCustomMetadata(),
  customMetadataDirty:
    getCleanCustomMetadataDirty(),
  customMetadataKeepLine:
    getCleanCustomMetadataKeepLine(),
  showDate: true,
  metadataPrimaryColorOverride: null,
  metadataSecondaryColorOverride: null,
  metadataPosition:
    selectedTemplate.id === '02' ||
    selectedTemplate.id === '03' ||
    selectedTemplate.id === '04'
      ? 'right'
      : 'left',
  metadataOffsetX: 0,
  metadataOffsetY: 0,
  backgroundMode:
    selectedTemplate.backgroundDefault,
  filmMatteColorPreset: 'black',
  filmMatteTextPreset: 'white',
  customFrameColor: '#d8d2c4',
  logoMode:
    selectedTemplate.id === '02' ||
    selectedTemplate.id.startsWith('I')
      ? 'hidden'
      : 'brand',
  brandSelection: 'auto',
  logoVariant: '',
  logoPosition:
    selectedTemplate.id === '02' ||
    selectedTemplate.id === '03' ||
    selectedTemplate.id === '04'
      ? 'left'
      : 'right',
  logoOffsetX: 0,
  logoOffsetY: 0,
  customLogoText: 'FRAME',
  customLogoBaseWidth: 100,
  customLogoInvertOnDark: false,
  customLogoRemoveWhite: false,
  customLogoWhiteStrength: 32,
})

const readTemplateMemory = (
  selectedTemplate: (typeof templates)[number],
): TemplateMemorySettings => {
  const defaults =
    getTemplateMemoryDefaults(selectedTemplate)

  try {
    const raw = window.localStorage.getItem(
      getTemplateMemoryKey(selectedTemplate.id),
    )

    if (!raw) {
      return defaults
    }

    const parsed = JSON.parse(raw) as {
      version?: number
      settings?: Partial<TemplateMemorySettings>
    }

    if (
      parsed.version !== TEMPLATE_MEMORY_VERSION ||
      !parsed.settings
    ) {
      return defaults
    }

    return {
      ...defaults,
      ...parsed.settings,
      customMetadata: {
        ...defaults.customMetadata,
        ...parsed.settings.customMetadata,
      },
      customMetadataDirty: {
        ...defaults.customMetadataDirty,
        ...parsed.settings.customMetadataDirty,
      },
      customMetadataKeepLine: {
        ...defaults.customMetadataKeepLine,
        ...parsed.settings.customMetadataKeepLine,
      },
    }
  } catch {
    return defaults
  }
}

const writeTemplateMemory = (
  templateId: string,
  settings: TemplateMemorySettings,
) => {
  try {
    window.localStorage.setItem(
      getTemplateMemoryKey(templateId),
      JSON.stringify({
        version: TEMPLATE_MEMORY_VERSION,
        settings,
      }),
    )
  } catch {
    // Local storage may be unavailable in private/restricted contexts.
  }
}

const clearTemplateMemory = (
  templateId: string,
) => {
  try {
    window.localStorage.removeItem(
      getTemplateMemoryKey(templateId),
    )
  } catch {
    // Ignore storage failures; defaults can still be applied in-memory.
  }
}

type GalleryView = 'categories' | 'templates'

type TemplateCategory =
  | 'photography'
  | 'illustration'

const getTemplateCategory = (id: string): TemplateCategory =>
  id.startsWith('I')
    ? 'illustration'
    : 'photography'

type NavigationMemorySettings = {
  galleryView: GalleryView
  activeCategory: TemplateCategory
  templateId: string
  editorOpen: boolean
  controlSection: ControlSection
  metadataAdvancedOpen: boolean
  logoAdvancedOpen: boolean
}

const NAVIGATION_MEMORY_VERSION = 1
const NAVIGATION_MEMORY_KEY =
  'photo-frame-studio:navigation-memory:v1'

const getNavigationMemoryDefaults =
  (): NavigationMemorySettings => ({
    galleryView: 'categories',
    activeCategory: 'photography',
    templateId: templates[0]?.id ?? '01',
    editorOpen: false,
    controlSection: 'frame',
    metadataAdvancedOpen: false,
    logoAdvancedOpen: false,
  })

const readNavigationMemory =
  (): NavigationMemorySettings => {
    const defaults = getNavigationMemoryDefaults()

    if (typeof window === 'undefined') {
      return defaults
    }

    try {
      const raw = window.localStorage.getItem(
        NAVIGATION_MEMORY_KEY,
      )

      if (!raw) {
        return defaults
      }

      const parsed = JSON.parse(raw) as {
        version?: number
        settings?: Partial<NavigationMemorySettings>
      }

      if (
        parsed.version !== NAVIGATION_MEMORY_VERSION ||
        !parsed.settings
      ) {
        return defaults
      }

      const storedTemplateId =
        typeof parsed.settings.templateId === 'string' &&
        templates.some(
          (item) => item.id === parsed.settings?.templateId,
        )
          ? parsed.settings.templateId
          : defaults.templateId

      const storedCategory =
        parsed.settings.activeCategory === 'photography' ||
        parsed.settings.activeCategory === 'illustration'
          ? parsed.settings.activeCategory
          : getTemplateCategory(storedTemplateId)

      const galleryView: GalleryView =
        parsed.settings.galleryView === 'templates'
          ? 'templates'
          : 'categories'

      const controlSection: ControlSection =
        parsed.settings.controlSection === 'type' ||
        parsed.settings.controlSection === 'metadata' ||
        parsed.settings.controlSection === 'logo'
          ? parsed.settings.controlSection
          : 'frame'

      return {
        galleryView,
        activeCategory:
          galleryView === 'templates'
            ? getTemplateCategory(storedTemplateId)
            : storedCategory,
        templateId: storedTemplateId,
        editorOpen:
          parsed.settings.editorOpen === true,
        controlSection,
        metadataAdvancedOpen:
          parsed.settings.metadataAdvancedOpen === true,
        logoAdvancedOpen:
          parsed.settings.logoAdvancedOpen === true,
      }
    } catch {
      return defaults
    }
  }

const writeNavigationMemory = (
  settings: NavigationMemorySettings,
) => {
  try {
    window.localStorage.setItem(
      NAVIGATION_MEMORY_KEY,
      JSON.stringify({
        version: NAVIGATION_MEMORY_VERSION,
        settings,
      }),
    )
  } catch {
    // Navigation memory is optional; the app can still work without it.
  }
}

const CATEGORY_COPY: Record<
  TemplateCategory,
  {
    label: string
    title: string
    description: string
  }
> = {
  photography: {
    label: 'PHOTOGRAPHY',
    title: 'Photography',
    description:
      'Frames, metadata, film language, color studies, and quiet presentation systems for photographs.',
  },
  illustration: {
    label: 'ILLUSTRATION',
    title: 'Illustration',
    description:
      'Gallery sheets and graphic poster layouts for artwork, CG, anime, and images without EXIF.',
  },
}

const HOME_TEMPLATE_COPY: Record<
  string,
  {
    name: string
    category: string
    description: string
  }
> = {
  '01': {
    name: 'Nikon Classic',
    category: 'Metadata / White',
    description:
      'A clean photographic frame built around camera metadata.',
  },
  '02': {
    name: 'Film Matte',
    category: '35mm / Film Strip',
    description:
      'A true 35mm-inspired film strip with sprocket holes, frame numbers, edge markings, and restrained metadata.',
  },
  '03': {
    name: 'Color Palette',
    category: 'Color / Sampling',
    description:
      'A clean palette frame with sampled color dots and a restrained editorial footer.',
  },
  '04': {
    name: 'Shadow Ribbon',
    category: 'Overlay / Cinematic',
    description:
      'A cinematic photograph frame with a soft image-derived surround and a translucent information ribbon.',
  },
  I01: {
    name: 'Illustration Gallery',
    category: 'Illustration / Gallery',
    description:
      'A quiet gallery-sheet layout for illustration, anime artwork, CG, and images without EXIF.',
  },
  I02: {
    name: 'Illustration Poster',
    category: 'Illustration / Poster',
    description:
      'A full-bleed poster layout with oversized title hierarchy, edition text, and graphic edge marks.',
  },
  I03: {
    name: 'Manga Panel',
    category: 'Illustration / Sequence',
    description:
      'A sequential manga-panel layout that turns one artwork into a hero frame and two narrative detail crops.',
  },
}

function App() {
  const initialNavigationRef =
    useRef<NavigationMemorySettings | null>(null)

  if (initialNavigationRef.current === null) {
    initialNavigationRef.current =
      readNavigationMemory()
  }

  const initialNavigation =
    initialNavigationRef.current

  const [activeTemplate, setActiveTemplate] = useState(() => {
    const storedIndex = templates.findIndex(
      (item) => item.id === initialNavigation.templateId,
    )

    return storedIndex >= 0 ? storedIndex : 0
  })
  const [galleryView, setGalleryView] =
    useState<GalleryView>(initialNavigation.galleryView)
  const [activeCategory, setActiveCategory] =
    useState<TemplateCategory>(initialNavigation.activeCategory)
  const [editorOpen, setEditorOpen] =
    useState(initialNavigation.editorOpen)
  const [controlSection, setControlSection] =
    useState<ControlSection>(initialNavigation.controlSection)
  const [metadataAdvancedOpen, setMetadataAdvancedOpen] =
    useState(initialNavigation.metadataAdvancedOpen)
  const [logoAdvancedOpen, setLogoAdvancedOpen] =
    useState(initialNavigation.logoAdvancedOpen)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [photoFileName, setPhotoFileName] = useState('photo')
  const [photoNaturalSize, setPhotoNaturalSize] = useState({
    width: 0,
    height: 0,
  })
  const [isExporting, setIsExporting] = useState(false)
  const [photoMetadata, setPhotoMetadata] = useState<PhotoMetadata | null>(null)
  const [photoAspectRatio, setPhotoAspectRatio] = useState<number | null>(null)
  const [photoOrientation, setPhotoOrientation] = useState<PhotoOrientation>('landscape')
  const [frameSize, setFrameSize] = useState(templates[0].frameDefault)
  const [shadowRibbonOpacity, setShadowRibbonOpacity] =
    useState(50)
  const [shadowRibbonBlur, setShadowRibbonBlur] =
    useState(1)
  const [shadowRibbonPositionY, setShadowRibbonPositionY] =
    useState(97)
  const [shadowRibbonWidthMode, setShadowRibbonWidthMode] =
    useState<'inset' | 'full'>('inset')
  const [mangaLinkedCrop, setMangaLinkedCrop] = useState(false)
  const [mangaLayout, setMangaLayout] = useState<MangaLayout>('layout-1')
  const [mangaPrimarySplit, setMangaPrimarySplit] = useState(72)
  const [mangaSecondarySplit, setMangaSecondarySplit] = useState(50)
  const [mangaMainImageX, setMangaMainImageX] = useState(0)
  const [mangaMainImageY, setMangaMainImageY] = useState(0)
  const [mangaMainImageScale, setMangaMainImageScale] = useState(100)
  const [mangaTopImageX, setMangaTopImageX] = useState(0)
  const [mangaTopImageY, setMangaTopImageY] = useState(0)
  const [mangaTopImageScale, setMangaTopImageScale] = useState(100)
  const [mangaBottomImageX, setMangaBottomImageX] = useState(0)
  const [mangaBottomImageY, setMangaBottomImageY] = useState(0)
  const [mangaBottomImageScale, setMangaBottomImageScale] = useState(100)
  const [mangaPanelGap, setMangaPanelGap] = useState(8)
  const [mangaBorderWidth, setMangaBorderWidth] = useState(1)
  const [mangaSceneLabel, setMangaSceneLabel] = useState('SCENE 03')
  const [mangaSideCaption, setMangaSideCaption] = useState(
    'FRAME STUDY · ORIGINAL WORK',
  )
  const [mangaShowSceneLabel, setMangaShowSceneLabel] = useState(true)
  const [mangaShowSideCaption, setMangaShowSideCaption] = useState(true)
  const [cameraSize, setCameraSize] = useState(100)
  const [metadataSize, setMetadataSize] = useState(100)
  const [logoSize, setLogoSize] = useState(100)
  const [fontWeight, setFontWeight] = useState<FontWeightMode>('medium')
  const [fontPreset, setFontPreset] = useState<FontPreset>('template')
  const [metadataMode, setMetadataMode] = useState<MetadataMode>('full')
  const [metadataSourceMode, setMetadataSourceMode] =
    useState<MetadataSourceMode>('auto')
  const [customMetadataPreset] =
    useState<CustomMetadataFields>(() =>
      getDefaultCustomMetadata(),
    )
  const [illustrationMetadataPreset] =
    useState<CustomMetadataFields>(() =>
      getIllustrationDefaultMetadata(),
    )
  const [illustrationPosterMetadataPreset] =
    useState<CustomMetadataFields>(() =>
      getIllustrationPosterMetadata(),
    )
  const [illustrationMangaMetadataPreset] =
    useState<CustomMetadataFields>(() =>
      getIllustrationMangaMetadata(),
    )
  const [customMetadata, setCustomMetadata] =
    useState<CustomMetadataFields>(() =>
      getEmptyCustomMetadata(),
    )
  const [customMetadataDirty, setCustomMetadataDirty] =
    useState<CustomMetadataDirty>(() =>
      getCleanCustomMetadataDirty(),
    )
  const [customMetadataKeepLine, setCustomMetadataKeepLine] =
    useState<CustomMetadataKeepLine>(() =>
      getCleanCustomMetadataKeepLine(),
    )
  const [showDate, setShowDate] = useState(true)
  const [metadataPrimaryColorOverride, setMetadataPrimaryColorOverride] =
    useState<string | null>(null)
  const [metadataSecondaryColorOverride, setMetadataSecondaryColorOverride] =
    useState<string | null>(null)
  const [metadataPosition, setMetadataPosition] =
    useState<MetadataPosition>('left')
  const [metadataOffsetX, setMetadataOffsetX] = useState(0)
  const [metadataOffsetY, setMetadataOffsetY] = useState(0)
  const [backgroundMode, setBackgroundMode] = useState<BackgroundMode>(templates[0].backgroundDefault)
  const [filmMatteColorPreset, setFilmMatteColorPreset] =
    useState<FilmMatteColorPreset>('black')
  const [filmMatteTextPreset, setFilmMatteTextPreset] =
    useState<FilmMatteTextPreset>('white')
  const [customFrameColor, setCustomFrameColor] = useState('#d8d2c4')
  const [logoMode, setLogoMode] = useState<LogoMode>('brand')
  const [brandSelection, setBrandSelection] =
    useState<BrandSelection>('auto')
  const [logoVariant, setLogoVariant] = useState('')
  const [logoPosition, setLogoPosition] =
    useState<LogoPosition>('right')
  const [logoOffsetX, setLogoOffsetX] = useState(0)
  const [logoOffsetY, setLogoOffsetY] = useState(0)
  const [customLogoText, setCustomLogoText] = useState('FRAME')
  const [customLogoOriginalDataUrl, setCustomLogoOriginalDataUrl] =
    useState<string | null>(null)
  const [customLogoDataUrl, setCustomLogoDataUrl] =
    useState<string | null>(null)
  const [customLogoName, setCustomLogoName] = useState('')
  const [customLogoBaseWidth, setCustomLogoBaseWidth] = useState(100)
  const [customLogoInvertOnDark, setCustomLogoInvertOnDark] =
    useState(false)
  const [customLogoRemoveWhite, setCustomLogoRemoveWhite] =
    useState(false)
  const [customLogoWhiteStrength, setCustomLogoWhiteStrength] =
    useState(32)
  const [customLogoWhiteStrengthDirty, setCustomLogoWhiteStrengthDirty] =
    useState(false)
  const [isCustomLogoProcessing, setIsCustomLogoProcessing] =
    useState(false)
  const [isPhotoDragActive, setIsPhotoDragActive] =
    useState(false)

  const infoRef = useRef<HTMLDivElement | null>(null)
  const categoryHomeRef = useRef<HTMLElement | null>(null)
  const categoryTransitionRef = useRef<HTMLDivElement | null>(null)
  const categoryTransitionKickerRef = useRef<HTMLDivElement | null>(null)
  const categoryTransitionNameRef = useRef<HTMLDivElement | null>(null)
  const categoryTransitionLockedRef = useRef(false)
  const editorRef = useRef<HTMLElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const photoDragDepthRef = useRef(0)
  const customLogoInputRef = useRef<HTMLInputElement | null>(null)
  const customLogoProcessIdRef = useRef(0)
  const previewCanvasRef = useRef<HTMLElement | null>(null)
  const previewRef = useRef<HTMLDivElement | null>(null)
  const frameInfoRef = useRef<HTMLDivElement | null>(null)
  const metadataCopyRef = useRef<HTMLDivElement | null>(null)
  const logoSlotRef = useRef<HTMLDivElement | null>(null)
  const transitionLocked = useRef(false)
  const templateMemoryReadyRef = useRef(false)
  const templateMemoryHydrationTimerRef = useRef<number | null>(null)

  const [previewScale, setPreviewScale] = useState(1)
  const [previewShellSize, setPreviewShellSize] = useState({
    width: 0,
    height: 0,
  })
  const [metadataCopyStyle, setMetadataCopyStyle] =
    useState<CSSProperties>({})
  const [logoSlotStyle, setLogoSlotStyle] =
    useState<CSSProperties>({})

  const template = templates[activeTemplate]

  useEffect(() => {
    writeNavigationMemory({
      galleryView,
      activeCategory,
      templateId: template.id,
      editorOpen,
      controlSection,
      metadataAdvancedOpen,
      logoAdvancedOpen,
    })
  }, [
    galleryView,
    activeCategory,
    template.id,
    editorOpen,
    controlSection,
    metadataAdvancedOpen,
    logoAdvancedOpen,
  ])

  const categoryTemplateEntries =
    templates
      .map((item, index) => ({
        item,
        index,
      }))
      .filter(
        ({ item }) =>
          getTemplateCategory(item.id) ===
          activeCategory,
      )

  const activeCategoryPosition = Math.max(
    0,
    categoryTemplateEntries.findIndex(
      ({ index }) =>
        index === activeTemplate,
    ),
  )

  const categoryTemplateCount =
    categoryTemplateEntries.length

  const previousTemplateEntry =
    categoryTemplateCount > 1
      ? categoryTemplateEntries[
          (activeCategoryPosition - 1 +
            categoryTemplateCount) %
            categoryTemplateCount
        ]
      : null

  const nextTemplateEntry =
    categoryTemplateCount > 1
      ? categoryTemplateEntries[
          (activeCategoryPosition + 1) %
            categoryTemplateCount
        ]
      : null

  const isFilmMatteTemplate =
    template.id === '02'

  const hasExifMetadata = Boolean(
    photoMetadata?.make ||
      photoMetadata?.model ||
      photoMetadata?.lens ||
      photoMetadata?.focalLength ||
      photoMetadata?.aperture ||
      photoMetadata?.exposureTime ||
      photoMetadata?.iso ||
      photoMetadata?.dateTimeOriginal,
  )

  const exifCameraText =
    photoMetadata?.model?.trim() ?? ''

  const exifLensText =
    photoMetadata?.lens?.trim() ?? ''

  const exifExposureText = [
    photoMetadata?.focalLength
      ? `${Number(photoMetadata.focalLength.toFixed(1))}mm`
      : null,
    formatAperture(photoMetadata?.aperture),
    formatShutterSpeed(photoMetadata?.exposureTime),
    photoMetadata?.iso
      ? `ISO${photoMetadata.iso}`
      : null,
  ]
    .filter(Boolean)
    .join(' · ')

  const exifDateText =
    formatDateTime(
      photoMetadata?.dateTimeOriginal,
    ) ?? ''

  const getMetadataSuggestion = (
    key: keyof CustomMetadataFields,
    exifValue: string,
  ) => {
    if (
      metadataSourceMode === 'mixed' &&
      exifValue
    ) {
      return exifValue
    }

    if (template.id === 'I01') {
      return illustrationMetadataPreset[key]
    }

    if (template.id === 'I02') {
      return illustrationPosterMetadataPreset[key]
    }

    if (template.id === 'I03') {
      return illustrationMangaMetadataPreset[key]
    }

    return customMetadataPreset[key]
  }

  const resolveCustomField = (
    key: keyof CustomMetadataFields,
    exifValue = '',
  ) => {
    if (customMetadataDirty[key]) {
      const value = customMetadata[key]

      if (
        value === '' &&
        customMetadataKeepLine[key]
      ) {
        // Keep the row's height without displaying visible text.
        return '\u00A0'
      }

      return value
    }

    return getMetadataSuggestion(
      key,
      exifValue,
    )
  }

  const cameraText =
    metadataSourceMode === 'auto'
      ? exifCameraText
      : resolveCustomField(
          'title',
          exifCameraText,
        )

  const lensText =
    metadataSourceMode === 'auto'
      ? exifLensText
      : resolveCustomField(
          'subtitle',
          exifLensText,
        )

  const exposureText =
    metadataSourceMode === 'auto'
      ? exifExposureText
      : resolveCustomField(
          'parameters',
          exifExposureText,
        )

  const dateText =
    metadataSourceMode === 'auto'
      ? exifDateText
      : resolveCustomField(
          'date',
          exifDateText,
        )

  const customEditorValues: CustomMetadataFields = {
    title: customMetadataDirty.title
      ? customMetadata.title
      : '',
    subtitle: customMetadataDirty.subtitle
      ? customMetadata.subtitle
      : '',
    parameters:
      customMetadataDirty.parameters
        ? customMetadata.parameters
        : '',
    date: customMetadataDirty.date
      ? customMetadata.date
      : '',
  }

  const customEditorSuggestions: CustomMetadataFields = {
    title: getMetadataSuggestion(
      'title',
      exifCameraText,
    ),
    subtitle: getMetadataSuggestion(
      'subtitle',
      exifLensText,
    ),
    parameters: getMetadataSuggestion(
      'parameters',
      exifExposureText,
    ),
    date: getMetadataSuggestion(
      'date',
      exifDateText,
    ),
  }

  const hasPreservedBlankMetadataLine =
    (Object.keys(
      customMetadata,
    ) as Array<
      keyof CustomMetadataFields
    >).some(
      (key) =>
        customMetadataDirty[key] &&
        customMetadataKeepLine[key] &&
        customMetadata[key] === '',
    )

  const showCamera =
    (metadataMode === 'full' ||
      metadataMode === 'minimal') &&
    Boolean(cameraText)

  const showLens =
    metadataMode === 'full' &&
    Boolean(lensText)

  const showExposure =
    metadataMode !== 'hidden' &&
    Boolean(exposureText)

  const showDateLine =
    metadataMode === 'full' &&
    showDate &&
    Boolean(dateText)

  const filmMatteColorTheme =
    FILM_MATTE_COLOR_THEMES[
      filmMatteColorPreset
    ]

  const filmMatteTextTheme =
    FILM_MATTE_TEXT_THEMES[
      filmMatteTextPreset
    ]

  const frameBackgroundColor =
    isFilmMatteTemplate
      ? filmMatteColorTheme.base
      : backgroundMode === 'custom'
        ? customFrameColor
        : BACKGROUND_COLORS[backgroundMode]

  const frameForegroundColor =
    isFilmMatteTemplate
      ? filmMatteTextTheme.primary
      : getContrastColor(frameBackgroundColor)

  const metadataPrimaryColor =
    isFilmMatteTemplate
      ? filmMatteTextTheme.primary
      : metadataPrimaryColorOverride ??
        frameForegroundColor

  const metadataSecondaryColor =
    isFilmMatteTemplate
      ? filmMatteTextTheme.secondary
      : metadataSecondaryColorOverride ??
        frameForegroundColor

  const shadowRibbonPanelBackground =
    hexToRgba(
      frameBackgroundColor,
      shadowRibbonOpacity / 100,
    )

  const detectedBrand = detectBrand(
    photoMetadata?.make,
    photoMetadata?.model,
  )

  const effectiveBrand: BrandKey | null =
    brandSelection === 'auto'
      ? detectedBrand
      : brandSelection

  const logoVariants = effectiveBrand
    ? LOGO_LIBRARY[effectiveBrand].variants
    : []

  const selectedLogoVariant =
    logoVariants.find(
      (variant) => variant.id === logoVariant,
    ) ?? logoVariants[0] ?? null

  const filmLogoFilter =
    isFilmMatteTemplate &&
    logoMode === 'brand' &&
    Boolean(
      selectedLogoVariant?.filmTintable,
    )
      ? filmMatteTextTheme.logoFilter
      : 'none'

  const previewDesignWidth =
    PREVIEW_DESIGN_WIDTH[photoOrientation]

  const logoImageBaseWidth =
    logoMode === 'custom'
      ? customLogoBaseWidth
      : selectedLogoVariant?.baseWidth ?? 82

  const templateFontPreset =
    template.id === '02'
      ? FONT_PRESETS.mono
      : template.id === 'I01'
        ? FONT_PRESETS.serif
        : FONT_PRESETS.sans

  const activeFontPreset =
    fontPreset === 'template'
      ? templateFontPreset
      : FONT_PRESETS[fontPreset]

  const previewStyle = {
    width: `${previewDesignWidth}px`,
    '--camera-scale': cameraSize / 100,
    '--metadata-scale': metadataSize / 100,
    '--logo-scale': logoSize / 100,
    '--logo-image-width': `${Math.round(
      logoImageBaseWidth * (logoSize / 100),
    )}px`,
    '--camera-base-size': '24px',
    '--metadata-base-size': '11px',
    '--frame-mark-base-size': '28px',
    '--camera-weight': getFontWeight(fontWeight),
    '--frame-bg': frameBackgroundColor,
    '--frame-fg': frameForegroundColor,
    '--metadata-primary-color': metadataPrimaryColor,
    '--metadata-secondary-color': metadataSecondaryColor,
    '--shadow-ribbon-panel-bg': shadowRibbonPanelBackground,
    '--poster-panel-bg': hexToRgba(
      frameBackgroundColor,
      0.86,
    ),
    '--shadow-ribbon-blur': `${shadowRibbonBlur}px`,
    '--shadow-ribbon-position-y': shadowRibbonPositionY,
    '--shadow-ribbon-side-inset':
      shadowRibbonWidthMode === 'full'
        ? '0%'
        : '3.2%',
    '--title-font-family': activeFontPreset.titleFamily,
    '--metadata-font-family': activeFontPreset.metadataFamily,
    '--film-base': filmMatteColorTheme.base,
    '--film-strong': filmMatteColorTheme.strong,
    '--film-soft': filmMatteColorTheme.soft,
    '--film-edge': filmMatteColorTheme.edge,
    '--film-perf': filmMatteColorTheme.perf,
    '--film-caption': filmMatteColorTheme.caption,
    '--film-text-primary': filmMatteTextTheme.primary,
    '--film-text-secondary': filmMatteTextTheme.secondary,
    '--film-side-border': `${Math.round(10 + frameSize * 0.6)}px`,
    '--film-top-rail': `${Math.round(38 + frameSize * 0.82)}px`,
    '--film-bottom-rail': `${Math.round(78 + frameSize * 1.42)}px`,
    '--film-perf-height': `${Math.round(12 + frameSize * 0.12)}px`,
    '--film-perf-width': `${Math.round(10 + frameSize * 0.08)}px`,
    '--film-perf-gap': `${Math.round(10 + frameSize * 0.18)}px`,
    '--film-mark-size': `${Math.max(7, 6 + frameSize * 0.08)}px`,
    '--film-direction-size': `${Math.max(6, 5.4 + frameSize * 0.05)}px`,
    '--film-caption-size': `${Math.max(5.5, 5 + frameSize * 0.03)}px`,
  } as CSSProperties

  const applyTemplateMemorySettings = (
    settings: TemplateMemorySettings,
  ) => {
    setFrameSize(settings.frameSize)
    setShadowRibbonOpacity(settings.shadowRibbonOpacity)
    setShadowRibbonBlur(settings.shadowRibbonBlur)
    setShadowRibbonPositionY(settings.shadowRibbonPositionY)
    setShadowRibbonWidthMode(settings.shadowRibbonWidthMode)
    setMangaLinkedCrop(settings.mangaLinkedCrop)
    setMangaLayout(settings.mangaLayout)
    setMangaPrimarySplit(settings.mangaPrimarySplit)
    setMangaSecondarySplit(settings.mangaSecondarySplit)
    setMangaMainImageX(settings.mangaMainImageX)
    setMangaMainImageY(settings.mangaMainImageY)
    setMangaMainImageScale(settings.mangaMainImageScale)
    setMangaTopImageX(settings.mangaTopImageX)
    setMangaTopImageY(settings.mangaTopImageY)
    setMangaTopImageScale(settings.mangaTopImageScale)
    setMangaBottomImageX(settings.mangaBottomImageX)
    setMangaBottomImageY(settings.mangaBottomImageY)
    setMangaBottomImageScale(settings.mangaBottomImageScale)
    setMangaPanelGap(settings.mangaPanelGap)
    setMangaBorderWidth(settings.mangaBorderWidth)
    setMangaSceneLabel(settings.mangaSceneLabel)
    setMangaSideCaption(settings.mangaSideCaption)
    setMangaShowSceneLabel(settings.mangaShowSceneLabel)
    setMangaShowSideCaption(settings.mangaShowSideCaption)
    setCameraSize(settings.cameraSize)
    setMetadataSize(settings.metadataSize)
    setLogoSize(settings.logoSize)
    setFontWeight(settings.fontWeight)
    setFontPreset(settings.fontPreset)
    setMetadataMode(settings.metadataMode)
    setMetadataSourceMode(settings.metadataSourceMode)
    setCustomMetadata(settings.customMetadata)
    setCustomMetadataDirty(settings.customMetadataDirty)
    setCustomMetadataKeepLine(settings.customMetadataKeepLine)
    setShowDate(settings.showDate)
    setMetadataPrimaryColorOverride(
      settings.metadataPrimaryColorOverride,
    )
    setMetadataSecondaryColorOverride(
      settings.metadataSecondaryColorOverride,
    )
    setMetadataPosition(settings.metadataPosition)
    setMetadataOffsetX(settings.metadataOffsetX)
    setMetadataOffsetY(settings.metadataOffsetY)
    setBackgroundMode(settings.backgroundMode)
    setFilmMatteColorPreset(settings.filmMatteColorPreset)
    setFilmMatteTextPreset(settings.filmMatteTextPreset)
    setCustomFrameColor(settings.customFrameColor)
    setLogoMode(settings.logoMode)
    setBrandSelection(settings.brandSelection)
    setLogoVariant(settings.logoVariant)
    setLogoPosition(settings.logoPosition)
    setLogoOffsetX(settings.logoOffsetX)
    setLogoOffsetY(settings.logoOffsetY)
    setCustomLogoText(settings.customLogoText)
    setCustomLogoBaseWidth(settings.customLogoBaseWidth)
    setCustomLogoInvertOnDark(settings.customLogoInvertOnDark)
    setCustomLogoRemoveWhite(settings.customLogoRemoveWhite)
    setCustomLogoWhiteStrength(settings.customLogoWhiteStrength)
    setCustomLogoWhiteStrengthDirty(false)
  }

  const getCurrentTemplateMemorySettings =
    (): TemplateMemorySettings => ({
      frameSize,
      shadowRibbonOpacity,
      shadowRibbonBlur,
      shadowRibbonPositionY,
      shadowRibbonWidthMode,
      mangaLinkedCrop,
      mangaLayout,
      mangaPrimarySplit,
      mangaSecondarySplit,
      mangaMainImageX,
      mangaMainImageY,
      mangaMainImageScale,
      mangaTopImageX,
      mangaTopImageY,
      mangaTopImageScale,
      mangaBottomImageX,
      mangaBottomImageY,
      mangaBottomImageScale,
      mangaPanelGap,
      mangaBorderWidth,
      mangaSceneLabel,
      mangaSideCaption,
      mangaShowSceneLabel,
      mangaShowSideCaption,
      cameraSize,
      metadataSize,
      logoSize,
      fontWeight,
      fontPreset,
      metadataMode,
      metadataSourceMode,
      customMetadata,
      customMetadataDirty,
      customMetadataKeepLine,
      showDate,
      metadataPrimaryColorOverride,
      metadataSecondaryColorOverride,
      metadataPosition,
      metadataOffsetX,
      metadataOffsetY,
      backgroundMode,
      filmMatteColorPreset,
      filmMatteTextPreset,
      customFrameColor,
      logoMode,
      brandSelection,
      logoVariant,
      logoPosition,
      logoOffsetX,
      logoOffsetY,
      customLogoText,
      customLogoBaseWidth,
      customLogoInvertOnDark,
      customLogoRemoveWhite,
      customLogoWhiteStrength,
    })

  const markTemplateMemoryReady = () => {
    if (templateMemoryHydrationTimerRef.current !== null) {
      window.clearTimeout(
        templateMemoryHydrationTimerRef.current,
      )
    }

    templateMemoryHydrationTimerRef.current =
      window.setTimeout(() => {
        templateMemoryReadyRef.current = true
        templateMemoryHydrationTimerRef.current = null
      }, 0)
  }

  const resetCurrentTemplateSettings = () => {
    const selectedTemplate = templates[activeTemplate]
    const defaults =
      getTemplateMemoryDefaults(selectedTemplate)

    templateMemoryReadyRef.current = false
    clearTemplateMemory(selectedTemplate.id)
    applyTemplateMemorySettings(defaults)
    setMetadataAdvancedOpen(false)
    setLogoAdvancedOpen(false)
    markTemplateMemoryReady()
  }

  useEffect(() => {
    const selectedTemplate = templates[activeTemplate]

    templateMemoryReadyRef.current = false
    applyTemplateMemorySettings(
      readTemplateMemory(selectedTemplate),
    )
    setMetadataAdvancedOpen(false)
    setLogoAdvancedOpen(false)
    markTemplateMemoryReady()

    return () => {
      if (
        templateMemoryHydrationTimerRef.current !== null
      ) {
        window.clearTimeout(
          templateMemoryHydrationTimerRef.current,
        )
        templateMemoryHydrationTimerRef.current = null
      }
    }
  }, [activeTemplate])

  useEffect(() => {
    if (!templateMemoryReadyRef.current) {
      return
    }

    const selectedTemplate = templates[activeTemplate]
    const saveTimer = window.setTimeout(() => {
      writeTemplateMemory(
        selectedTemplate.id,
        getCurrentTemplateMemorySettings(),
      )
    }, 120)

    return () => {
      window.clearTimeout(saveTimer)
    }
  }, [
    activeTemplate,
    frameSize,
    shadowRibbonOpacity,
    shadowRibbonBlur,
    shadowRibbonPositionY,
    shadowRibbonWidthMode,
    mangaLinkedCrop,
    mangaLayout,
    mangaPrimarySplit,
    mangaSecondarySplit,
    mangaMainImageX,
    mangaMainImageY,
    mangaMainImageScale,
    mangaTopImageX,
    mangaTopImageY,
    mangaTopImageScale,
    mangaBottomImageX,
    mangaBottomImageY,
    mangaBottomImageScale,
    mangaPanelGap,
    mangaBorderWidth,
    mangaSceneLabel,
    mangaSideCaption,
    mangaShowSceneLabel,
    mangaShowSideCaption,
    cameraSize,
    metadataSize,
    logoSize,
    fontWeight,
    fontPreset,
    metadataMode,
    metadataSourceMode,
    customMetadata,
    customMetadataDirty,
    customMetadataKeepLine,
    showDate,
    metadataPrimaryColorOverride,
    metadataSecondaryColorOverride,
    metadataPosition,
    metadataOffsetX,
    metadataOffsetY,
    backgroundMode,
    filmMatteColorPreset,
    filmMatteTextPreset,
    customFrameColor,
    logoMode,
    brandSelection,
    logoVariant,
    logoPosition,
    logoOffsetX,
    logoOffsetY,
    customLogoText,
    customLogoBaseWidth,
    customLogoInvertOnDark,
    customLogoRemoveWhite,
    customLogoWhiteStrength,
  ])

  useEffect(() => {
    if (!effectiveBrand) {
      setLogoVariant('')
      return
    }

    const firstVariant =
      LOGO_LIBRARY[effectiveBrand].variants[0]

    setLogoVariant((current) => {
      const stillExists =
        LOGO_LIBRARY[effectiveBrand].variants.some(
          (variant) => variant.id === current,
        )

      return stillExists
        ? current
        : firstVariant.id
    })
  }, [effectiveBrand])

  useEffect(() => {
    if (!editorOpen) {
      return
    }

    const canvas = previewCanvasRef.current
    const preview = previewRef.current

    if (!canvas || !preview) {
      return
    }

    const updatePreviewScale = () => {
      const canvasStyles =
        window.getComputedStyle(canvas)

      const horizontalPadding =
        Number.parseFloat(canvasStyles.paddingLeft) +
        Number.parseFloat(canvasStyles.paddingRight)

      const verticalPadding =
        Number.parseFloat(canvasStyles.paddingTop) +
        Number.parseFloat(canvasStyles.paddingBottom)

      const availableWidth = Math.max(
        1,
        canvas.clientWidth - horizontalPadding,
      )

      const availableHeight = Math.max(
        1,
        canvas.clientHeight - verticalPadding,
      )

      const designWidth = preview.offsetWidth
      const designHeight = preview.offsetHeight

      if (
        designWidth <= 0 ||
        designHeight <= 0
      ) {
        return
      }

      const nextScale = Math.min(
        1,
        availableWidth / designWidth,
        availableHeight / designHeight,
      )

      setPreviewScale(nextScale)
      setPreviewShellSize({
        width: designWidth * nextScale,
        height: designHeight * nextScale,
      })
    }

    const resizeObserver =
      new ResizeObserver(updatePreviewScale)

    resizeObserver.observe(canvas)
    resizeObserver.observe(preview)

    const animationFrame =
      window.requestAnimationFrame(
        updatePreviewScale,
      )

    window.addEventListener(
      'resize',
      updatePreviewScale,
    )

    return () => {
      resizeObserver.disconnect()

      window.cancelAnimationFrame(
        animationFrame,
      )

      window.removeEventListener(
        'resize',
        updatePreviewScale,
      )
    }
  }, [
    editorOpen,
    photoAspectRatio,
    photoOrientation,
    frameSize,
    metadataMode,
    cameraSize,
    metadataSize,
    fontWeight,
    showDate,
    logoMode,
    logoSize,
    logoVariant,
    effectiveBrand,
    customLogoDataUrl,
    customLogoBaseWidth,
  ])

  useEffect(() => {
    if (!editorOpen) {
      return
    }

    const frame = frameInfoRef.current
    const metadata = metadataCopyRef.current
    const logo = logoSlotRef.current

    if (!frame) {
      return
    }

    const clamp = (
      value: number,
      min: number,
      max: number,
    ) => Math.min(max, Math.max(min, value))

    const updateSafeLayout = () => {
      const frameWidth = frame.clientWidth
      const frameHeight = frame.clientHeight

      if (
        frameWidth <= 0 ||
        frameHeight <= 0
      ) {
        return
      }

      const safeX = Math.max(8, frameWidth * 0.03)
      const safeY = Math.max(6, frameHeight * 0.06)
      const gap = Math.max(8, frameWidth * 0.018)

      const availableWidth = Math.max(
        1,
        frameWidth - safeX * 2,
      )

      const availableHeight = Math.max(
        1,
        frameHeight - safeY * 2,
      )

      const hasMetadata =
        metadataMode !== 'hidden' &&
        Boolean(metadata) &&
        (metadata?.offsetWidth ?? 0) > 0 &&
        (metadata?.offsetHeight ?? 0) > 0

      const hasLogo =
        logoMode !== 'hidden' &&
        Boolean(logo) &&
        (logo?.offsetWidth ?? 0) > 0 &&
        (logo?.offsetHeight ?? 0) > 0

      let metadataLeft = safeX
      let metadataTop = safeY
      let metadataScale = 1
      let metadataVisualWidth = 0
      let metadataVisualHeight = 0

      if (hasMetadata && metadata) {
        const metadataWidth = metadata.offsetWidth
        const metadataHeight = metadata.offsetHeight

        metadataScale = Math.min(
          1,
          availableWidth / metadataWidth,
          availableHeight / metadataHeight,
        )

        metadataVisualWidth =
          metadataWidth * metadataScale
        metadataVisualHeight =
          metadataHeight * metadataScale

        const maxLeft = Math.max(
          safeX,
          frameWidth -
            safeX -
            metadataVisualWidth,
        )

        let baseLeft = safeX

        if (metadataPosition === 'center') {
          baseLeft =
            (frameWidth -
              metadataVisualWidth) /
            2
        } else if (
          metadataPosition === 'right'
        ) {
          baseLeft = maxLeft
        }

        metadataLeft = clamp(
          baseLeft +
            frameWidth *
              (metadataOffsetX / 100),
          safeX,
          maxLeft,
        )

        const maxTop = Math.max(
          safeY,
          frameHeight -
            safeY -
            metadataVisualHeight,
        )

        metadataTop = clamp(
          (frameHeight -
            metadataVisualHeight) /
            2 +
            frameHeight *
              (metadataOffsetY / 100),
          safeY,
          maxTop,
        )
      }

      let logoLeft = safeX
      let logoTop = safeY
      let logoScale = 1
      let logoVisualWidth = 0
      let logoVisualHeight = 0

      if (hasLogo && logo) {
        const logoWidth = logo.offsetWidth
        const logoHeight = logo.offsetHeight

        logoScale = Math.min(
          1,
          availableWidth / logoWidth,
          availableHeight / logoHeight,
        )

        logoVisualWidth =
          logoWidth * logoScale
        logoVisualHeight =
          logoHeight * logoScale

        const maxLeft = Math.max(
          safeX,
          frameWidth -
            safeX -
            logoVisualWidth,
        )

        let baseLeft = safeX

        if (logoPosition === 'center') {
          baseLeft =
            (frameWidth -
              logoVisualWidth) /
            2
        } else if (logoPosition === 'right') {
          baseLeft = maxLeft
        }

        logoLeft = clamp(
          baseLeft +
            frameWidth *
              (logoOffsetX / 100),
          safeX,
          maxLeft,
        )

        const maxTop = Math.max(
          safeY,
          frameHeight -
            safeY -
            logoVisualHeight,
        )

        logoTop = clamp(
          (frameHeight -
            logoVisualHeight) /
            2 +
            frameHeight *
              (logoOffsetY / 100),
          safeY,
          maxTop,
        )
      }

      const overlapsWithGap = (
        firstLeft: number,
        firstTop: number,
        firstWidth: number,
        firstHeight: number,
        secondLeft: number,
        secondTop: number,
        secondWidth: number,
        secondHeight: number,
      ) => !(
        firstLeft + firstWidth + gap <=
          secondLeft ||
        secondLeft + secondWidth + gap <=
          firstLeft ||
        firstTop + firstHeight + gap <=
          secondTop ||
        secondTop + secondHeight + gap <=
          firstTop
      )

      if (
        hasMetadata &&
        metadata &&
        hasLogo &&
        logo &&
        overlapsWithGap(
          metadataLeft,
          metadataTop,
          metadataVisualWidth,
          metadataVisualHeight,
          logoLeft,
          logoTop,
          logoVisualWidth,
          logoVisualHeight,
        )
      ) {
        const logoMaxLeft = Math.max(
          safeX,
          frameWidth -
            safeX -
            logoVisualWidth,
        )

        const logoMaxTop = Math.max(
          safeY,
          frameHeight -
            safeY -
            logoVisualHeight,
        )

        const candidates = [
          {
            left:
              metadataLeft +
              metadataVisualWidth +
              gap,
            top: logoTop,
          },
          {
            left:
              metadataLeft -
              logoVisualWidth -
              gap,
            top: logoTop,
          },
          {
            left: logoLeft,
            top:
              metadataTop +
              metadataVisualHeight +
              gap,
          },
          {
            left: logoLeft,
            top:
              metadataTop -
              logoVisualHeight -
              gap,
          },
        ]
          .map((candidate) => ({
            left: clamp(
              candidate.left,
              safeX,
              logoMaxLeft,
            ),
            top: clamp(
              candidate.top,
              safeY,
              logoMaxTop,
            ),
          }))
          .filter(
            (candidate) =>
              !overlapsWithGap(
                metadataLeft,
                metadataTop,
                metadataVisualWidth,
                metadataVisualHeight,
                candidate.left,
                candidate.top,
                logoVisualWidth,
                logoVisualHeight,
              ),
          )
          .sort((first, second) => {
            const firstDistance =
              (first.left - logoLeft) ** 2 +
              (first.top - logoTop) ** 2

            const secondDistance =
              (second.left - logoLeft) ** 2 +
              (second.top - logoTop) ** 2

            return firstDistance - secondDistance
          })

        if (candidates.length > 0) {
          logoLeft = candidates[0].left
          logoTop = candidates[0].top
        } else {
          const metadataWidth =
            metadata.offsetWidth
          const metadataHeight =
            metadata.offsetHeight
          const logoWidth = logo.offsetWidth
          const logoHeight = logo.offsetHeight

          const combinedWidth =
            metadataWidth * metadataScale +
            logoWidth * logoScale +
            gap

          const shrink = Math.min(
            1,
            availableWidth / combinedWidth,
          )

          metadataScale *= shrink
          logoScale *= shrink

          metadataVisualWidth =
            metadataWidth * metadataScale
          metadataVisualHeight =
            metadataHeight * metadataScale
          logoVisualWidth =
            logoWidth * logoScale
          logoVisualHeight =
            logoHeight * logoScale

          const groupWidth =
            metadataVisualWidth +
            gap +
            logoVisualWidth

          const groupLeft =
            safeX +
            Math.max(
              0,
              (availableWidth - groupWidth) / 2,
            )

          const metadataWantedCenter =
            metadataLeft +
            metadataVisualWidth / 2

          const logoWantedCenter =
            logoLeft +
            logoVisualWidth / 2

          const logoFirst =
            logoWantedCenter <
            metadataWantedCenter

          if (logoFirst) {
            logoLeft = groupLeft
            metadataLeft =
              groupLeft +
              logoVisualWidth +
              gap
          } else {
            metadataLeft = groupLeft
            logoLeft =
              groupLeft +
              metadataVisualWidth +
              gap
          }

          metadataTop = clamp(
            metadataTop,
            safeY,
            Math.max(
              safeY,
              frameHeight -
                safeY -
                metadataVisualHeight,
            ),
          )

          logoTop = clamp(
            logoTop,
            safeY,
            Math.max(
              safeY,
              frameHeight -
                safeY -
                logoVisualHeight,
            ),
          )
        }
      }

      if (hasMetadata && metadata) {
        const translateX =
          metadataLeft - metadata.offsetLeft

        const translateY =
          metadataTop - metadata.offsetTop

        setMetadataCopyStyle({
          transform: `translate(${translateX}px, ${translateY}px) scale(${metadataScale})`,
          transformOrigin: 'top left',
        })
      } else {
        setMetadataCopyStyle({})
      }

      if (hasLogo) {
        setLogoSlotStyle({
          left: `${logoLeft}px`,
          top: `${logoTop}px`,
          transform: `scale(${logoScale})`,
          transformOrigin: 'top left',
        })
      } else {
        setLogoSlotStyle({})
      }
    }

    const frameObserver =
      new ResizeObserver(updateSafeLayout)

    frameObserver.observe(frame)

    if (metadata) {
      frameObserver.observe(metadata)
    }

    if (logo) {
      frameObserver.observe(logo)
    }

    const logoImage =
      logo?.querySelector('img') ?? null

    logoImage?.addEventListener(
      'load',
      updateSafeLayout,
    )

    const animationFrame =
      window.requestAnimationFrame(
        updateSafeLayout,
      )

    window.addEventListener(
      'resize',
      updateSafeLayout,
    )

    return () => {
      frameObserver.disconnect()

      logoImage?.removeEventListener(
        'load',
        updateSafeLayout,
      )

      window.cancelAnimationFrame(
        animationFrame,
      )

      window.removeEventListener(
        'resize',
        updateSafeLayout,
      )
    }
  }, [
    editorOpen,
    frameSize,
    metadataMode,
    metadataPosition,
    metadataOffsetX,
    metadataOffsetY,
    metadataSize,
    cameraSize,
    fontWeight,
    showDate,
    cameraText,
    lensText,
    exposureText,
    dateText,
    logoMode,
    logoPosition,
    logoOffsetX,
    logoOffsetY,
    logoSize,
    logoVariant,
    effectiveBrand,
    customLogoDataUrl,
    customLogoBaseWidth,
  ])

  useEffect(() => {
    if (
      editorOpen ||
      galleryView !== 'categories' ||
      !categoryHomeRef.current
    ) {
      return
    }

    const context = gsap.context(() => {
      gsap.fromTo(
        '.category-portal-panel',
        { opacity: 0 },
        {
          opacity: 1,
          duration: 0.56,
          stagger: 0.07,
          ease: 'power2.out',
        },
      )

      gsap.fromTo(
        '.category-portal-title-group',
        { opacity: 0, y: 22 },
        {
          opacity: 1,
          y: 0,
          duration: 0.72,
          stagger: 0.08,
          delay: 0.08,
          ease: 'power3.out',
        },
      )

      gsap.fromTo(
        '.category-portal-stack',
        {
          opacity: 0,
          y: 14,
          scale: 0.985,
        },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.82,
          stagger: 0.08,
          delay: 0.12,
          ease: 'power3.out',
        },
      )

      gsap.from(
        '.portal-preview-card',
        {
          opacity: 0,
          filter: 'blur(5px)',
          duration: 0.7,
          stagger: 0.055,
          delay: 0.2,
          ease: 'power2.out',
          clearProps: 'opacity,filter',
        },
      )

      gsap.fromTo(
        '.category-portal-index, .category-portal-meta',
        { opacity: 0, y: 8 },
        {
          opacity: 1,
          y: 0,
          duration: 0.5,
          stagger: 0.035,
          delay: 0.22,
          ease: 'power2.out',
        },
      )
    }, categoryHomeRef.current)

    return () => context.revert()
  }, [editorOpen, galleryView])

  useEffect(() => {
    if (
      editorOpen ||
      galleryView !== 'templates'
    ) {
      return
    }

    gsap.fromTo(
      infoRef.current,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' },
    )
  }, [
    activeTemplate,
    editorOpen,
    galleryView,
  ])

  useEffect(() => {
    if (!editorOpen || !editorRef.current) return

    const context = gsap.context(() => {
      gsap.fromTo(
        editorRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.45, ease: 'power2.out' },
      )
      gsap.fromTo(
        '.editor-preview',
        { opacity: 0, y: 50, scale: 0.88 },
        { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: 'power3.out' },
      )
      gsap.fromTo(
        '.editor-panel',
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.55, stagger: 0.08, delay: 0.2, ease: 'power3.out' },
      )
    }, editorRef.current)

    return () => context.revert()
  }, [editorOpen])

  useEffect(() => {
    return () => {
      if (photoUrl) URL.revokeObjectURL(photoUrl)
    }
  }, [photoUrl])

  const openCategory = (
    category: TemplateCategory,
  ) => {
    if (categoryTransitionLockedRef.current) {
      return
    }

    const firstTemplateIndex =
      templates.findIndex(
        (item) =>
          getTemplateCategory(item.id) ===
          category,
      )

    const enterTemplateLibrary = () => {
      setActiveCategory(category)
      setActiveTemplate(
        firstTemplateIndex >= 0
          ? firstTemplateIndex
          : 0,
      )
      setGalleryView('templates')
    }

    const prefersReducedMotion =
      window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches

    const overlay =
      categoryTransitionRef.current
    const kicker =
      categoryTransitionKickerRef.current
    const name =
      categoryTransitionNameRef.current

    if (
      prefersReducedMotion ||
      !overlay ||
      !kicker ||
      !name
    ) {
      enterTemplateLibrary()
      return
    }

    categoryTransitionLockedRef.current = true

    kicker.textContent =
      category === 'photography'
        ? 'CAMERA · FILM · EXIF'
        : 'ARTWORK · ANIME · POSTER'
    name.textContent =
      CATEGORY_COPY[category].title

    gsap.killTweensOf([
      overlay,
      kicker,
      name,
    ])

    gsap.set(overlay, {
      autoAlpha: 1,
      pointerEvents: 'auto',
      clipPath: 'inset(100% 0 0 0)',
    })
    gsap.set([kicker, name], {
      opacity: 0,
      y: 18,
    })

    const timeline = gsap.timeline({
      onComplete: () => {
        gsap.set(overlay, {
          autoAlpha: 0,
          pointerEvents: 'none',
          clipPath: 'inset(0 0 100% 0)',
        })
        categoryTransitionLockedRef.current = false
      },
    })

    timeline
      .to(overlay, {
        clipPath: 'inset(0% 0 0 0)',
        duration: 0.5,
        ease: 'power4.inOut',
      })
      .to(
        kicker,
        {
          opacity: 0.62,
          y: 0,
          duration: 0.28,
          ease: 'power2.out',
        },
        0.3,
      )
      .to(
        name,
        {
          opacity: 1,
          y: 0,
          duration: 0.4,
          ease: 'power3.out',
        },
        0.34,
      )
      .add(enterTemplateLibrary, 0.52)
      .to(
        [kicker, name],
        {
          opacity: 0,
          y: -14,
          duration: 0.22,
          ease: 'power2.in',
        },
        0.84,
      )
      .to(
        overlay,
        {
          clipPath: 'inset(0 0 100% 0)',
          duration: 0.5,
          ease: 'power4.inOut',
        },
        0.86,
      )
  }

  const showCategories = () => {
    setGalleryView('categories')
  }

  const selectTemplate = (
    nextIndex: number,
  ) => {
    if (transitionLocked.current) return

    const belongsToCategory =
      categoryTemplateEntries.some(
        ({ index }) =>
          index === nextIndex,
      )

    if (
      !belongsToCategory ||
      nextIndex === activeTemplate
    ) {
      return
    }

    transitionLocked.current = true
    setActiveTemplate(nextIndex)
    window.setTimeout(() => {
      transitionLocked.current = false
    }, 650)
  }

  const stepTemplate = (offset: number) => {
    if (transitionLocked.current) return

    const total =
      categoryTemplateEntries.length

    if (total <= 1) return

    const nextPosition =
      (activeCategoryPosition +
        offset +
        total) %
      total

    selectTemplate(
      categoryTemplateEntries[
        nextPosition
      ].index,
    )
  }

  const stepEditorTemplate = (offset: number) => {
    const total =
      categoryTemplateEntries.length

    if (total <= 1) return

    // Persist the current template immediately before switching so
    // even a quick arrow click cannot outrun the normal debounced save.
    writeTemplateMemory(
      template.id,
      getCurrentTemplateMemorySettings(),
    )

    const nextPosition =
      (activeCategoryPosition +
        offset +
        total) %
      total

    setActiveTemplate(
      categoryTemplateEntries[
        nextPosition
      ].index,
    )
  }

  const handleWheel = (event: WheelEvent<HTMLElement>) => {
    if (
      galleryView !== 'templates' ||
      Math.abs(event.deltaY) < 12
    ) {
      return
    }

    if (event.deltaY > 0) {
      stepTemplate(1)
    } else {
      stepTemplate(-1)
    }
  }

  const getCardPosition = (
    index: number,
  ) => {
    const total =
      categoryTemplateEntries.length
    const position =
      categoryTemplateEntries.findIndex(
        (entry) =>
          entry.index === index,
      )

    if (
      position < 0 ||
      total === 0
    ) {
      return 'far-next'
    }

    if (position === activeCategoryPosition) {
      return 'active'
    }

    const prevPosition =
      (activeCategoryPosition - 1 +
        total) %
      total
    const nextPosition =
      (activeCategoryPosition + 1) %
      total

    if (position === prevPosition) {
      return 'prev'
    }

    if (position === nextPosition) {
      return 'next'
    }

    const forwardDistance =
      (position -
        activeCategoryPosition +
        total) %
      total
    const backwardDistance =
      (activeCategoryPosition -
        position +
        total) %
      total

    return forwardDistance <
      backwardDistance
      ? 'far-next'
      : 'far-prev'
  }

  const loadPhotoFile = async (
    file: File,
  ) => {
    const isSupportedImage =
      [
        'image/jpeg',
        'image/png',
        'image/webp',
      ].includes(file.type) ||
      /\.(jpg|jpeg|png|webp)$/i.test(
        file.name,
      )

    if (!isSupportedImage) {
      window.alert(
        '请选择或拖入 JPG、PNG 或 WebP 图片。',
      )
      return
    }

    try {
      const metadata = await exifr.parse(
        file,
        [
          'Make',
          'Model',
          'LensModel',
          'FocalLength',
          'FNumber',
          'ExposureTime',
          'ISO',
          'DateTimeOriginal',
        ],
      )

      if (metadata) {
        setPhotoMetadata({
          make: metadata.Make,
          model: metadata.Model,
          lens: metadata.LensModel,
          focalLength:
            metadata.FocalLength,
          aperture: metadata.FNumber,
          exposureTime:
            metadata.ExposureTime,
          iso: metadata.ISO,
          dateTimeOriginal:
            metadata.DateTimeOriginal,
        })
      } else {
        setPhotoMetadata(null)
      }
    } catch (error) {
      console.error(
        'EXIF parsing failed:',
        error,
      )
      setPhotoMetadata(null)
    }

    const objectUrl =
      URL.createObjectURL(file)

    const image = new Image()

    setPhotoFileName(
      file.name.replace(/\.[^.]+$/, '') ||
        'photo',
    )

    image.onload = () => {
      const ratio =
        image.naturalWidth /
        image.naturalHeight

      setPhotoNaturalSize({
        width: image.naturalWidth,
        height: image.naturalHeight,
      })

      setPhotoAspectRatio(ratio)

      if (ratio > 1.05) {
        setPhotoOrientation(
          'landscape',
        )
      } else if (ratio < 0.95) {
        setPhotoOrientation(
          'portrait',
        )
      } else {
        setPhotoOrientation('square')
      }

      setPhotoUrl(objectUrl)
    }

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)

      window.alert(
        '无法读取这张图片。',
      )
    }

    image.src = objectUrl
  }

  const handlePhotoChange = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file =
      event.target.files?.[0]

    if (!file) {
      return
    }

    void loadPhotoFile(file)

    // Let the user choose the same file again later.
    event.target.value = ''
  }

  const handlePhotoDragEnter = (
    event: DragEvent<HTMLElement>,
  ) => {
    event.preventDefault()
    event.stopPropagation()

    if (
      !Array.from(
        event.dataTransfer.types,
      ).includes('Files')
    ) {
      return
    }

    photoDragDepthRef.current += 1
    setIsPhotoDragActive(true)
  }

  const handlePhotoDragOver = (
    event: DragEvent<HTMLElement>,
  ) => {
    event.preventDefault()
    event.stopPropagation()

    event.dataTransfer.dropEffect =
      'copy'
  }

  const handlePhotoDragLeave = (
    event: DragEvent<HTMLElement>,
  ) => {
    event.preventDefault()
    event.stopPropagation()

    photoDragDepthRef.current =
      Math.max(
        0,
        photoDragDepthRef.current - 1,
      )

    if (
      photoDragDepthRef.current === 0
    ) {
      setIsPhotoDragActive(false)
    }
  }

  const handlePhotoDrop = (
    event: DragEvent<HTMLElement>,
  ) => {
    event.preventDefault()
    event.stopPropagation()

    photoDragDepthRef.current = 0
    setIsPhotoDragActive(false)

    const file =
      event.dataTransfer.files?.[0]

    if (!file) {
      return
    }

    void loadPhotoFile(file)
  }

  const waitForPreviewImages = async (
    node: HTMLElement,
  ) => {
    const images = Array.from(
      node.querySelectorAll('img'),
    )

    await Promise.all(
      images.map(async (image) => {
        if (!image.complete) {
          await new Promise<void>((resolve) => {
            const finish = () => {
              image.removeEventListener(
                'load',
                finish,
              )
              image.removeEventListener(
                'error',
                finish,
              )
              resolve()
            }

            image.addEventListener(
              'load',
              finish,
              { once: true },
            )
            image.addEventListener(
              'error',
              finish,
              { once: true },
            )
          })
        }

        try {
          await image.decode()
        } catch {
          // Some SVG/blob images may already be decoded.
        }
      }),
    )
  }

  const handleExport = async () => {
    if (
      !photoUrl ||
      !previewRef.current ||
      isExporting
    ) {
      return
    }

    const previewNode = previewRef.current
    const photoNode =
      previewNode.querySelector<HTMLElement>(
        '[data-export-photo-anchor], .fake-photo',
      )

    if (
      !photoNode ||
      photoNaturalSize.width <= 0
    ) {
      window.alert(
        '图片原始尺寸尚未读取完成，请稍后再试。',
      )
      return
    }

    setIsExporting(true)

    try {
      if (document.fonts?.ready) {
        await document.fonts.ready
      }

      await waitForPreviewImages(previewNode)

      await new Promise<void>((resolve) => {
        window.requestAnimationFrame(() =>
          resolve(),
        )
      })

      const logicalPhotoWidth =
        photoNode.offsetWidth

      const logicalExportWidth =
        previewNode.offsetWidth

      const logicalExportHeight =
        previewNode.offsetHeight

      const sourceScale =
        photoNaturalSize.width /
        Math.max(1, logicalPhotoWidth)

      let pixelRatio = Math.max(
        1,
        sourceScale,
      )

      const requestedWidth =
        logicalExportWidth * pixelRatio

      const requestedHeight =
        logicalExportHeight * pixelRatio

      const edgeLimit =
        MAX_WEB_EXPORT_EDGE /
        Math.max(
          requestedWidth,
          requestedHeight,
        )

      const pixelLimit = Math.sqrt(
        MAX_WEB_EXPORT_PIXELS /
          Math.max(
            1,
            requestedWidth *
              requestedHeight,
          ),
      )

      const safetyScale = Math.min(
        1,
        edgeLimit,
        pixelLimit,
      )

      pixelRatio = Math.max(
        1,
        pixelRatio * safetyScale,
      )

      const canvas = await toCanvas(
        previewNode,
        {
          pixelRatio,
          backgroundColor:
            frameBackgroundColor,
          style: {
            boxShadow: 'none',
            margin: '0',
          },
          filter: (node) =>
            !(
              node instanceof HTMLElement &&
              node.classList.contains('manga-resize-handle')
            ),
        },
      )

      const blob = await new Promise<Blob>(
        (resolve, reject) => {
          canvas.toBlob(
            (result) => {
              if (result) {
                resolve(result)
              } else {
                reject(
                  new Error(
                    'JPEG encoding failed.',
                  ),
                )
              }
            },
            'image/jpeg',
            JPEG_EXPORT_QUALITY,
          )
        },
      )

      const safeName =
        photoFileName
          .trim()
          .replace(
            /[<>:"/\\|?*\u0000-\u001F]/g,
            '-',
          )
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-') ||
        'photo'

      const downloadUrl =
        URL.createObjectURL(blob)

      const link =
        document.createElement('a')

      link.href = downloadUrl
      link.download =
        `${safeName}-frame.jpg`

      document.body.appendChild(link)
      link.click()
      link.remove()

      window.setTimeout(() => {
        URL.revokeObjectURL(downloadUrl)
      }, 1000)

      console.info(
        `Exported ${canvas.width} × ${canvas.height} JPEG`,
      )
    } catch (error) {
      console.error(
        'Photo export failed:',
        error,
      )

      window.alert(
        '导出失败，请重试。超大尺寸图片可能需要降低输出尺寸。',
      )
    } finally {
      setIsExporting(false)
    }
  }

  const openEditor = () => setEditorOpen(true)

  const closeEditor = () => {
    if (!editorRef.current) {
      setEditorOpen(false)
      return
    }

    gsap.to(editorRef.current, {
      opacity: 0,
      scale: 0.995,
      duration: 0.32,
      ease: 'power2.inOut',
      onComplete: () => setEditorOpen(false),
    })
  }

  const getCustomLogoBaseWidth = (
    width: number,
    height: number,
  ) => {
    const ratio =
      width > 0 && height > 0
        ? width / height
        : 2.8

    const targetVisualHeight = 100

    return Math.round(
      Math.min(
        240,
        Math.max(
          50,
          targetVisualHeight * ratio,
        ),
      ),
    )
  }

  const processCustomLogoWhiteBackground = async (
    dataUrl: string,
    removeWhite: boolean,
    strength: number,
  ) => {
    const requestId =
      customLogoProcessIdRef.current + 1

    customLogoProcessIdRef.current =
      requestId

    setIsCustomLogoProcessing(true)

    try {
      const image =
        await new Promise<HTMLImageElement>(
          (resolve, reject) => {
            const nextImage = new Image()

            nextImage.onload = () =>
              resolve(nextImage)

            nextImage.onerror = () =>
              reject(
                new Error(
                  'Custom logo image decode failed.',
                ),
              )

            nextImage.src = dataUrl
          },
        )

      const sourceWidth = Math.max(
        1,
        image.naturalWidth,
      )

      const sourceHeight = Math.max(
        1,
        image.naturalHeight,
      )

      if (!removeWhite) {
        if (
          requestId !==
          customLogoProcessIdRef.current
        ) {
          return
        }

        setCustomLogoDataUrl(dataUrl)
        setCustomLogoBaseWidth(
          getCustomLogoBaseWidth(
            sourceWidth,
            sourceHeight,
          ),
        )
        return
      }

      // Logo processing is deliberately capped for browser performance.
      // 1600px is still far above the size required by the exported logo.
      const maxProcessEdge = 1200
      const processScale = Math.min(
        1,
        maxProcessEdge /
          Math.max(
            sourceWidth,
            sourceHeight,
          ),
      )

      const width = Math.max(
        1,
        Math.round(
          sourceWidth * processScale,
        ),
      )

      const height = Math.max(
        1,
        Math.round(
          sourceHeight * processScale,
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
        throw new Error(
          'Custom logo canvas unavailable.',
        )
      }

      context.clearRect(
        0,
        0,
        width,
        height,
      )

      context.drawImage(
        image,
        0,
        0,
        width,
        height,
      )

      const imageData =
        context.getImageData(
          0,
          0,
          width,
          height,
        )

      const pixels = imageData.data
      const pixelCount = width * height
      const visited =
        new Uint8Array(pixelCount)

      const queue =
        new Int32Array(pixelCount)

      let queueStart = 0
      let queueEnd = 0

      const whiteFloor =
        255 -
        Math.min(
          90,
          Math.max(8, strength),
        )

      const isBackgroundCandidate = (
        pixelIndex: number,
      ) => {
        const dataIndex =
          pixelIndex * 4

        const red = pixels[dataIndex]
        const green =
          pixels[dataIndex + 1]
        const blue =
          pixels[dataIndex + 2]
        const alpha =
          pixels[dataIndex + 3]

        return (
          alpha <= 10 ||
          (red >= whiteFloor &&
            green >= whiteFloor &&
            blue >= whiteFloor)
        )
      }

      const enqueue = (
        pixelIndex: number,
      ) => {
        if (
          pixelIndex < 0 ||
          pixelIndex >= pixelCount ||
          visited[pixelIndex] ||
          !isBackgroundCandidate(
            pixelIndex,
          )
        ) {
          return
        }

        visited[pixelIndex] = 1
        queue[queueEnd] = pixelIndex
        queueEnd += 1
      }

      // Seed only from the outside edge. This removes a white background
      // while preserving enclosed white details inside the logo artwork.
      for (
        let x = 0;
        x < width;
        x += 1
      ) {
        enqueue(x)
        enqueue(
          (height - 1) * width + x,
        )
      }

      for (
        let y = 1;
        y < height - 1;
        y += 1
      ) {
        enqueue(y * width)
        enqueue(
          y * width + width - 1,
        )
      }

      while (
        queueStart < queueEnd
      ) {
        const pixelIndex =
          queue[queueStart]

        queueStart += 1

        const x =
          pixelIndex % width

        const y =
          Math.floor(
            pixelIndex / width,
          )

        pixels[
          pixelIndex * 4 + 3
        ] = 0

        if (x > 0) {
          enqueue(pixelIndex - 1)
        }

        if (x < width - 1) {
          enqueue(pixelIndex + 1)
        }

        if (y > 0) {
          enqueue(
            pixelIndex - width,
          )
        }

        if (y < height - 1) {
          enqueue(
            pixelIndex + width,
          )
        }
      }

      context.putImageData(
        imageData,
        0,
        0,
      )

      const processedDataUrl =
        canvas.toDataURL('image/png')

      if (
        requestId !==
        customLogoProcessIdRef.current
      ) {
        return
      }

      setCustomLogoDataUrl(
        processedDataUrl,
      )

      setCustomLogoBaseWidth(
        getCustomLogoBaseWidth(
          width,
          height,
        ),
      )
    } catch (error) {
      console.error(
        'White background removal failed:',
        error,
      )

      if (
        requestId !==
        customLogoProcessIdRef.current
      ) {
        return
      }

      setCustomLogoDataUrl(dataUrl)

      window.alert(
        '去除白底失败，将继续使用原始标识图片。',
      )
    } finally {
      if (
        requestId ===
        customLogoProcessIdRef.current
      ) {
        setIsCustomLogoProcessing(false)
      }
    }
  }

  const handleCustomLogoUpload = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    const acceptedTypes = [
      'image/png',
      'image/jpeg',
      'image/webp',
      'image/svg+xml',
    ]

    if (!acceptedTypes.includes(file.type)) {
      window.alert(
        '请选择 PNG、JPG、WebP 或 SVG 标识文件。',
      )
      event.target.value = ''
      return
    }

    if (file.size > 8 * 1024 * 1024) {
      window.alert(
        '请选择小于 8 MB 的标识文件。',
      )
      event.target.value = ''
      return
    }

    const reader = new FileReader()

    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        return
      }

      const dataUrl = reader.result

      setCustomLogoOriginalDataUrl(
        dataUrl,
      )
      setCustomLogoDataUrl(dataUrl)
      setCustomLogoName(file.name)
      setLogoMode('custom')

      void processCustomLogoWhiteBackground(
        dataUrl,
        customLogoRemoveWhite,
        customLogoWhiteStrength,
      )
    }

    reader.onerror = () => {
      window.alert(
        '无法读取这个标识文件，请重试。',
      )
    }

    reader.readAsDataURL(file)
    event.target.value = ''
  }

  const handleCustomLogoRemoveWhiteChange = (
    removeWhite: boolean,
  ) => {
    setCustomLogoRemoveWhite(
      removeWhite,
    )
    setCustomLogoWhiteStrengthDirty(false)

    if (!customLogoOriginalDataUrl) {
      return
    }

    void processCustomLogoWhiteBackground(
      customLogoOriginalDataUrl,
      removeWhite,
      customLogoWhiteStrength,
    )
  }

  const handleCustomLogoWhiteStrengthChange = (
    strength: number,
  ) => {
    setCustomLogoWhiteStrength(
      strength,
    )
    setCustomLogoWhiteStrengthDirty(true)
  }

  const commitCustomLogoWhiteStrength = (
    strength = customLogoWhiteStrength,
  ) => {
    setCustomLogoWhiteStrengthDirty(false)

    if (
      !customLogoOriginalDataUrl ||
      !customLogoRemoveWhite
    ) {
      return
    }

    void processCustomLogoWhiteBackground(
      customLogoOriginalDataUrl,
      true,
      strength,
    )
  }

  const removeCustomLogo = () => {
    customLogoProcessIdRef.current += 1
    setCustomLogoOriginalDataUrl(null)
    setCustomLogoDataUrl(null)
    setCustomLogoName('')
    setCustomLogoBaseWidth(100)
    setCustomLogoInvertOnDark(false)
    setCustomLogoWhiteStrengthDirty(false)
    setIsCustomLogoProcessing(false)

    if (customLogoInputRef.current) {
      customLogoInputRef.current.value = ''
    }
  }

  const updateCustomMetadataField = (
    key: keyof CustomMetadataFields,
    value: string,
  ) => {
    setCustomMetadata(
      (current) => ({
        ...current,
        [key]: value,
      }),
    )

    setCustomMetadataDirty(
      (current) => ({
        ...current,
        [key]: true,
      }),
    )

    setCustomMetadataKeepLine(
      (current) => ({
        ...current,
        [key]: true,
      }),
    )
  }

  const resetCustomMetadataSuggestions = () => {
    setCustomMetadata(
      getEmptyCustomMetadata(),
    )

    setCustomMetadataDirty(
      getCleanCustomMetadataDirty(),
    )

    setCustomMetadataKeepLine(
      getCleanCustomMetadataKeepLine(),
    )
  }

  const clearCustomMetadata = () => {
    setCustomMetadata(
      getEmptyCustomMetadata(),
    )

    setCustomMetadataDirty({
      title: true,
      subtitle: true,
      parameters: true,
      date: true,
    })

    setCustomMetadataKeepLine(
      getCleanCustomMetadataKeepLine(),
    )
  }

  const removeBlankMetadataLines = () => {
    setCustomMetadataKeepLine(
      (current) => {
        const next = {
          ...current,
        }

        ;(
          Object.keys(
            customMetadata,
          ) as Array<
            keyof CustomMetadataFields
          >
        ).forEach((key) => {
          if (
            customMetadataDirty[key] &&
            customMetadata[key] === ''
          ) {
            next[key] = false
          }
        })

        return next
      },
    )
  }

  const renderLogo = () => {
    if (logoMode === 'hidden') {
      return null
    }

    if (logoMode === 'text') {
      return (
        <div className="frame-mark frame-mark--text">
          {customLogoText.trim() || 'FRAME'}
        </div>
      )
    }

    if (logoMode === 'custom') {
      if (!customLogoDataUrl) {
        return null
      }

      return (
        <img
          className="brand-logo-image custom-logo-image"
          src={customLogoDataUrl}
          alt={customLogoName || 'Custom logo'}
          style={{
            filter: customLogoInvertOnDark &&
              !isFilmMatteTemplate &&
              frameForegroundColor === '#f5f5f2'
                ? 'invert(1)'
                : 'none',
          }}
        />
      )
    }

    if (
      selectedLogoVariant?.assetPath
    ) {
      return (
        <img
          className="brand-logo-image"
          src={selectedLogoVariant.assetPath}
          alt={
            effectiveBrand
              ? `${LOGO_LIBRARY[effectiveBrand].name} ${selectedLogoVariant.name}`
              : 'Brand logo'
          }
          style={{
            filter: isFilmMatteTemplate
              ? filmLogoFilter
              : selectedLogoVariant.invertOnDark &&
                  frameForegroundColor === '#f5f5f2'
                ? 'invert(1)'
                : 'none',
          }}
        />
      )
    }

    if (
      effectiveBrand &&
      selectedLogoVariant
    ) {
      return (
        <div
          className={`brand-logo-placeholder brand-logo-placeholder--${effectiveBrand}`}
          aria-label={`${LOGO_LIBRARY[effectiveBrand].name} ${selectedLogoVariant.name}`}
        >
          <span className="brand-logo-primary">
            {selectedLogoVariant.primary}
          </span>

          {selectedLogoVariant.secondary && (
            <span className="brand-logo-secondary">
              {selectedLogoVariant.secondary}
            </span>
          )}
        </div>
      )
    }

    return (
      <div className="frame-mark frame-mark--text">
        FRAME
      </div>
    )
  }

  return (
    <main
      className={`studio ${
        editorOpen
          ? 'studio--editing'
          : ''
      } ${
        galleryView === 'categories'
          ? 'studio--categories'
          : 'studio--templates'
      }`}
      onWheel={
        !editorOpen &&
        galleryView === 'templates'
          ? handleWheel
          : undefined
      }
    >
      <header className="topbar">
        <button
          type="button"
          className="brand brand-button"
          onClick={showCategories}
        >
          FRAME /
        </button>
        <nav className="nav">
          <button
            type="button"
            onClick={showCategories}
          >
            Templates
          </button>
          <button type="button">About</button>
        </nav>
      </header>

      {galleryView === 'categories' ? (
        <section
          className="category-home category-portal"
          ref={categoryHomeRef}
        >
          <div
            className="category-portal-split"
            aria-label="Template categories"
          >
            <button
              type="button"
              className="category-portal-panel category-portal-panel--photography"
              onClick={() =>
                openCategory('photography')
              }
              onPointerMove={(event) => {
                const rect =
                  event.currentTarget.getBoundingClientRect()
                const x =
                  ((event.clientX - rect.left) /
                    rect.width) *
                  100
                const y =
                  ((event.clientY - rect.top) /
                    rect.height) *
                  100

                event.currentTarget.style.setProperty(
                  '--portal-x',
                  `${x}%`,
                )
                event.currentTarget.style.setProperty(
                  '--portal-y',
                  `${y}%`,
                )
              }}
              onPointerLeave={(event) => {
                event.currentTarget.style.setProperty(
                  '--portal-x',
                  '50%',
                )
                event.currentTarget.style.setProperty(
                  '--portal-y',
                  '50%',
                )
              }}
            >
              <span className="category-portal-index">
                01
              </span>

              <span className="category-portal-meta">
                <span>CAMERA · FILM · EXIF</span>
                <span>04 TEMPLATES</span>
              </span>

              <span className="category-portal-stack category-portal-stack--photography">
                <span className="portal-preview-card portal-preview-card--classic">
                  <span className="portal-preview-template-id">01</span>
                  <span className="portal-classic-photo portal-fake-photo portal-fake-photo--photo">
                    <span className="portal-fake-horizon" />
                    <span className="portal-fake-subject" />
                  </span>
                  <span className="portal-classic-footer">
                    <span>
                      <b>NIKON Z 8</b>
                      <i>NIKKOR Z 50mm f/1.8 S</i>
                    </span>
                    <em>50MM · F2 · 1/125 · ISO100</em>
                  </span>
                </span>

                <span className="portal-preview-card portal-preview-card--film">
                  <span className="portal-preview-template-id portal-preview-template-id--light">02</span>
                  <span className="portal-film-rail portal-film-rail--top">
                    <span className="portal-film-holes" />
                    <span className="portal-film-numbers">10&nbsp;&nbsp;&nbsp;10A&nbsp;&nbsp;&nbsp;11</span>
                  </span>
                  <span className="portal-film-gate portal-fake-photo portal-fake-photo--photo">
                    <span className="portal-fake-horizon" />
                    <span className="portal-fake-subject" />
                    <span className="portal-film-gate-label">35MM / FRAME 02</span>
                  </span>
                  <span className="portal-film-rail portal-film-rail--bottom">
                    <span className="portal-film-holes" />
                  </span>
                </span>

                <span className="portal-preview-card portal-preview-card--palette">
                  <span className="portal-preview-template-id">03</span>
                  <span className="portal-palette-photo portal-fake-photo portal-fake-photo--photo">
                    <span className="portal-fake-horizon" />
                    <span className="portal-fake-subject" />
                  </span>
                  <span className="portal-palette-footer">
                    <b>FRAME</b>
                    <span>
                      <i>COLOR PALETTE</i>
                      <span className="portal-palette-swatches">
                        <em /><em /><em /><em /><em />
                      </span>
                    </span>
                  </span>
                </span>

                <span className="portal-preview-card portal-preview-card--shadow">
                  <span className="portal-preview-template-id portal-preview-template-id--light">04</span>
                  <span className="portal-shadow-photo portal-fake-photo portal-fake-photo--photo">
                    <span className="portal-fake-horizon" />
                    <span className="portal-fake-subject" />
                    <span className="portal-shadow-ribbon">
                      <span>
                        <b>FRAME 04</b>
                        <i>SHADOW RIBBON</i>
                      </span>
                      <em>50MM · F2 · 1/125</em>
                    </span>
                  </span>
                </span>
              </span>

              <span className="category-portal-title-group">
                <span className="category-portal-title">
                  Photo
                </span>
                <span className="category-portal-subtitle">
                  PHOTOGRAPHY / 摄影
                </span>
              </span>

              <span className="category-portal-arrow">
                ↗
              </span>
            </button>

            <button
              type="button"
              className="category-portal-panel category-portal-panel--illustration"
              onClick={() =>
                openCategory('illustration')
              }
              onPointerMove={(event) => {
                const rect =
                  event.currentTarget.getBoundingClientRect()
                const x =
                  ((event.clientX - rect.left) /
                    rect.width) *
                  100
                const y =
                  ((event.clientY - rect.top) /
                    rect.height) *
                  100

                event.currentTarget.style.setProperty(
                  '--portal-x',
                  `${x}%`,
                )
                event.currentTarget.style.setProperty(
                  '--portal-y',
                  `${y}%`,
                )
              }}
              onPointerLeave={(event) => {
                event.currentTarget.style.setProperty(
                  '--portal-x',
                  '50%',
                )
                event.currentTarget.style.setProperty(
                  '--portal-y',
                  '50%',
                )
              }}
            >
              <span className="category-portal-index">
                02
              </span>

              <span className="category-portal-meta">
                <span>ARTWORK · ANIME · POSTER</span>
                <span>03 TEMPLATES</span>
              </span>

              <span className="category-portal-stack category-portal-stack--illustration">
                <span className="portal-preview-card portal-preview-card--gallery">
                  <span className="portal-preview-template-id">I01</span>
                  <span className="portal-gallery-index">I / 01</span>
                  <span className="portal-gallery-photo portal-fake-photo portal-fake-photo--art">
                    <span className="portal-art-sun" />
                    <span className="portal-art-subject" />
                  </span>
                  <span className="portal-gallery-rule" />
                  <span className="portal-gallery-caption">
                    <b>Untitled</b>
                    <i>Artist / Series</i>
                    <em>Digital Illustration · Original</em>
                  </span>
                </span>

                <span className="portal-preview-card portal-preview-card--poster">
                  <span className="portal-preview-template-id portal-preview-template-id--light">I02</span>
                  <span className="portal-poster-photo portal-fake-photo portal-fake-photo--art">
                    <span className="portal-art-sun" />
                    <span className="portal-art-subject" />
                  </span>
                  <span className="portal-poster-shade" />
                  <span className="portal-poster-topline">
                    <span>ILLUSTRATION / POSTER</span>
                    <span>I / 02</span>
                  </span>
                  <span className="portal-poster-side">VISUAL STUDY · ORIGINAL WORK</span>
                  <span className="portal-poster-copy">
                    <b>AFTERGLOW</b>
                    <i>Character Study / 02</i>
                    <em>ORIGINAL ARTWORK · POSTER EDITION</em>
                  </span>
                </span>

                <span className="portal-preview-card portal-preview-card--manga">
                  <span className="portal-preview-template-id">I03</span>
                  <span className="portal-manga-grid">
                    <span className="portal-manga-panel" />
                    <span className="portal-manga-stack">
                      <span className="portal-manga-panel" />
                      <span className="portal-manga-panel" />
                    </span>
                  </span>
                  <span className="portal-manga-copy">
                    <b>SCENE 03</b>
                    <span>PANEL STUDY · SEQUENCE</span>
                  </span>
                </span>
              </span>

              <span className="category-portal-title-group">
                <span className="category-portal-title">
                  Art
                </span>
                <span className="category-portal-subtitle">
                  ILLUSTRATION / 插画
                </span>
              </span>

              <span className="category-portal-arrow">
                ↗
              </span>
            </button>
          </div>

          <div className="category-portal-footer">
            <span>SELECT A FIELD</span>
            <span>
              LOCAL PROCESSING · IMAGES STAY ON DEVICE
            </span>
          </div>
        </section>
      ) : (
      <section className="gallery">
        <div className="gallery-info" ref={infoRef}>
          <button
            type="button"
            className="category-back-button"
            onClick={showCategories}
          >
            ← All Categories
          </button>
          <div className="eyebrow">
            {CATEGORY_COPY[activeCategory].label} / PHOTO FRAME STUDIO
          </div>
          <h1>{HOME_TEMPLATE_COPY[template.id]?.name ?? template.name}</h1>
          <p className="description">
            {HOME_TEMPLATE_COPY[template.id]?.description ?? template.description}
          </p>
          <div className="template-meta">
            <span>{template.id}</span>
            <span>{HOME_TEMPLATE_COPY[template.id]?.category ?? template.category}</span>
          </div>
          <button className="customize-button" onClick={openEditor}>
            Customize <span>↗</span>
          </button>
          <div className="privacy">
            <span className="privacy-dot" />
            Local processing
            <br />
            Your photos never leave this device.
          </div>
        </div>

        <div className="gallery-stage">
          <div className="template-stack">
            {categoryTemplateEntries.map(
              ({ item, index }) => (
              <button
                type="button"
                key={item.id}
                className={`template-card template-card--${getCardPosition(index)} template-card-style-${index + 1}`}
                onClick={() => {
                  if (index === activeTemplate) openEditor()
                  else selectTemplate(index)
                }}
              >
                {item.id === '02' ? (
                  <div
                    className="film-home-preview"
                    aria-hidden="true"
                  >
                    <div className="film-home-rail film-home-rail--top">
                      <div className="film-home-holes" />
                      <div className="film-home-marks">
                        <span>10</span>
                        <span>10A</span>
                        <span>10</span>
                        <span>11</span>
                        <span>11A</span>
                      </div>
                      <span className="film-home-corner film-home-corner--left" />
                      <span className="film-home-corner film-home-corner--right" />
                    </div>

                    <div className="film-home-gate">
                      <svg
                        className="film-home-fake-photo-svg"
                        viewBox="0 0 1000 620"
                        preserveAspectRatio="none"
                        aria-hidden="true"
                      >
                        <defs>
                          <linearGradient
                            id="filmHomeSky"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop offset="0%" stopColor="#284153" />
                            <stop offset="38%" stopColor="#496276" />
                            <stop offset="70%" stopColor="#c7a383" />
                            <stop offset="100%" stopColor="#31373b" />
                          </linearGradient>
                          <radialGradient
                            id="filmHomeGlow"
                            cx="32%"
                            cy="28%"
                            r="52%"
                          >
                            <stop
                              offset="0%"
                              stopColor="rgba(255,255,255,0.14)"
                            />
                            <stop
                              offset="100%"
                              stopColor="rgba(255,255,255,0)"
                            />
                          </radialGradient>
                        </defs>

                        <rect
                          x="0"
                          y="0"
                          width="1000"
                          height="620"
                          fill="url(#filmHomeSky)"
                        />
                        <rect
                          x="0"
                          y="0"
                          width="1000"
                          height="620"
                          fill="url(#filmHomeGlow)"
                        />
                        <rect
                          x="0"
                          y="495"
                          width="1000"
                          height="2"
                          fill="rgba(255,255,255,0.36)"
                        />
                        <rect
                          x="680"
                          y="397"
                          width="180"
                          height="223"
                          fill="rgba(15,18,20,0.86)"
                        />
                      </svg>

                      <span className="film-home-gate-label">
                        35MM / FRAME 02
                      </span>
                    </div>

                    <div className="film-home-rail film-home-rail--bottom">
                      <div className="film-home-direction">
                        <span>▶▶</span>
                        <span>▶</span>
                        <span>▶▶</span>
                        <span>▶</span>
                      </div>
                      <div className="film-home-holes" />
                      <span className="film-home-corner film-home-corner--left" />
                      <span className="film-home-corner film-home-corner--right" />
                    </div>
                  </div>
                ) : item.id === 'I01' ? (
                  <div
                    className="illustration-home-preview"
                    aria-hidden="true"
                  >
                    <div className="illustration-home-index">
                      I / 01
                    </div>

                    <div className="fake-photo illustration-home-photo">
                      <div className="fake-horizon" />
                      <div className="fake-subject" />
                    </div>

                    <div className="illustration-home-rule" />

                    <div className="illustration-home-caption">
                      <div>
                        <strong>Untitled</strong>
                        <span>Artist / Series</span>
                      </div>

                      <span className="illustration-home-date">
                        GALLERY STUDY
                      </span>
                    </div>
                  </div>
                ) : item.id === 'I02' ? (
                  <div
                    className="illustration-poster-home"
                    aria-hidden="true"
                  >
                    <div className="fake-photo illustration-poster-home-photo">
                      <div className="fake-horizon" />
                      <div className="fake-subject" />

                      <div className="illustration-poster-home-topline">
                        <span>ILLUSTRATION / POSTER</span>
                        <span>I / 02</span>
                      </div>

                      <div className="illustration-poster-home-side">
                        VISUAL STUDY · ORIGINAL WORK
                      </div>

                      <div className="illustration-poster-home-info">
                        <strong>AFTERGLOW</strong>
                        <span>Character Study / 02</span>
                        <small>
                          ORIGINAL ARTWORK · POSTER EDITION
                        </small>
                      </div>
                    </div>
                  </div>
                ) : item.id === 'I03' ? (
                  <div
                    className="manga-home-preview"
                    aria-hidden="true"
                  >
                    <div className="manga-home-head">
                      <span>I / 03</span>
                      <span>VISUAL SEQUENCE</span>
                    </div>
                    <div className="manga-home-grid">
                      <div className="manga-home-panel" />
                      <div className="manga-home-stack">
                        <div className="manga-home-panel" />
                        <div className="manga-home-panel" />
                      </div>
                    </div>
                    <div className="manga-home-copy">
                      <strong>AFTERGLOW</strong>
                      <span>CHARACTER SEQUENCE / 03</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="fake-photo">
                      <div className="fake-horizon" />
                      <div className="fake-subject" />
                    </div>
                    <div className="fake-frame-info">
                      <div>
                        <strong>{HOME_TEMPLATE_COPY[item.id]?.name ?? item.name}</strong>
                        <span>24mm · F2.8 · 1/250 · ISO100</span>
                      </div>
                      <div className="frame-mark">FRAME</div>
                    </div>
                  </>
                )}
              </button>
            ))}
          </div>

          <div className="template-switcher">
            {categoryTemplateEntries.map(
              ({ item, index }) => (
                <button
                  key={item.id}
                  className={
                    index === activeTemplate
                      ? 'active'
                      : ''
                  }
                  onClick={() =>
                    selectTemplate(index)
                  }
                >
                  {item.id}
                </button>
              ),
            )}
          </div>

          <div className="counter">
            {String(
              activeCategoryPosition + 1,
            ).padStart(2, '0')}
            <span>/</span>
            {String(
              categoryTemplateEntries.length,
            ).padStart(2, '0')}
          </div>

          <div className="scroll-hint">
            Scroll to explore <span>↓</span>
          </div>
        </div>
      </section>
      )}

      <div
        ref={categoryTransitionRef}
        className="category-handoff"
        aria-hidden="true"
      >
        <div className="category-handoff-inner">
          <div
            ref={categoryTransitionKickerRef}
            className="category-handoff-kicker"
          >
            CAMERA · FILM · EXIF
          </div>
          <div
            ref={categoryTransitionNameRef}
            className="category-handoff-name"
          >
            Photography
          </div>
          <div className="category-handoff-note">
            TEMPLATE LIBRARY / PHOTO FRAME STUDIO
          </div>
        </div>
      </div>

      {editorOpen && (
        <section className="editor-overlay" ref={editorRef}>
          <header className="editor-header">
            <button className="editor-back" onClick={closeEditor}>
              ← 模板
            </button>
            <div className="editor-template-switcher" aria-label="模板切换">
              <button
                type="button"
                className="editor-template-switch editor-template-switch--previous"
                onClick={() => stepEditorTemplate(-1)}
                disabled={!previousTemplateEntry}
                title={
                  previousTemplateEntry
                    ? `上一个模板：${previousTemplateEntry.item.name}`
                    : '没有上一个模板'
                }
                aria-label={
                  previousTemplateEntry
                    ? `切换到上一个模板 ${previousTemplateEntry.item.name}`
                    : '没有上一个模板'
                }
              >
                ‹
              </button>

              <div className="editor-template-current">
                <div className="editor-title">{template.name}</div>
                <div className="editor-template-count">
                  {String(activeCategoryPosition + 1).padStart(2, '0')}
                  <span>/</span>
                  {String(categoryTemplateCount).padStart(2, '0')}
                </div>
              </div>

              <button
                type="button"
                className="editor-template-switch editor-template-switch--next"
                onClick={() => stepEditorTemplate(1)}
                disabled={!nextTemplateEntry}
                title={
                  nextTemplateEntry
                    ? `下一个模板：${nextTemplateEntry.item.name}`
                    : '没有下一个模板'
                }
                aria-label={
                  nextTemplateEntry
                    ? `切换到下一个模板 ${nextTemplateEntry.item.name}`
                    : '没有下一个模板'
                }
              >
                ›
              </button>
            </div>
            <button
              className={`editor-export ${
                isExporting
                  ? 'editor-export--busy'
                  : ''
              }`}
              onClick={handleExport}
              disabled={!photoUrl || isExporting}
              title={
                photoUrl
                  ? '导出高质量 JPEG'
                  : '请先选择图片'
              }
            >
              {isExporting
                ? '导出中…'
                : '导出'}
            </button>
          </header>

          <div className="editor-workspace">
            <aside
              className={`editor-panel editor-panel--left ${
                isPhotoDragActive
                  ? 'photo-drop-active'
                  : ''
              }`}
              onDragEnter={handlePhotoDragEnter}
              onDragOver={handlePhotoDragOver}
              onDragLeave={handlePhotoDragLeave}
              onDrop={handlePhotoDrop}
            >
              <div className="panel-label">图片</div>

              <button
                className="upload-placeholder"
                onClick={() =>
                  fileInputRef.current?.click()
                }
              >
                <span className="upload-placeholder-icon">
                  {isPhotoDragActive
                    ? '↓'
                    : '＋'}
                </span>

                <strong className="upload-placeholder-title">
                  {isPhotoDragActive
                    ? '将图片拖到这里'
                    : photoUrl
                      ? '更换图片'
                      : '选择图片'}
                </strong>

                <small className="upload-placeholder-hint">
                  {isPhotoDragActive
                    ? '松开即可载入'
                    : '点击选择或拖放'}
                </small>
              </button>

              <input
                ref={fileInputRef}
                className="photo-input"
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                onChange={handlePhotoChange}
              />

              <div className="panel-note">
                JPG · PNG · WebP
                <br />
                仅在本地处理
              </div>
            </aside>

            <section
              className="editor-canvas"
              ref={previewCanvasRef}
            >
              <div
                className="preview-scale-shell"
                style={{
                  width: `${previewShellSize.width}px`,
                  height: `${previewShellSize.height}px`,
                }}
              >
                <div
                  className="preview-scale-layer"
                  style={{
                    transform: `scale(${previewScale})`,
                  }}
                >
                  <TemplateRenderer
                    templateId={template.id}
                    previewRef={previewRef}
                    frameInfoRef={frameInfoRef}
                    metadataCopyRef={metadataCopyRef}
                    logoSlotRef={logoSlotRef}
                    photoOrientation={photoOrientation}
                    templateStyleIndex={activeTemplate + 1}
                    previewStyle={previewStyle}
                    photoUrl={photoUrl}
                    photoAspectRatio={photoAspectRatio}
                    frameSize={frameSize}
                    shadowRibbonOpacity={shadowRibbonOpacity}
                    shadowRibbonPositionY={shadowRibbonPositionY}
                    mangaLinkedCrop={mangaLinkedCrop}
                    mangaLayout={mangaLayout}
                    mangaPrimarySplit={mangaPrimarySplit}
                    mangaSecondarySplit={mangaSecondarySplit}
                    onMangaPrimarySplitChange={setMangaPrimarySplit}
                    onMangaSecondarySplitChange={setMangaSecondarySplit}
                    mangaMainImageX={mangaMainImageX}
                    mangaMainImageY={mangaMainImageY}
                    mangaMainImageScale={mangaMainImageScale}
                    mangaTopImageX={mangaTopImageX}
                    mangaTopImageY={mangaTopImageY}
                    mangaTopImageScale={mangaTopImageScale}
                    mangaBottomImageX={mangaBottomImageX}
                    mangaBottomImageY={mangaBottomImageY}
                    mangaBottomImageScale={mangaBottomImageScale}
                    mangaPanelGap={mangaPanelGap}
                    mangaBorderWidth={mangaBorderWidth}
                    mangaSceneLabel={mangaSceneLabel}
                    mangaSideCaption={mangaSideCaption}
                    mangaShowSceneLabel={mangaShowSceneLabel}
                    mangaShowSideCaption={mangaShowSideCaption}
                    metadataMode={metadataMode}
                    logoPosition={logoPosition}
                    metadataPosition={metadataPosition}
                    metadataCopyStyle={metadataCopyStyle}
                    logoSlotStyle={logoSlotStyle}
                    showCamera={showCamera}
                    showLens={showLens}
                    showExposure={showExposure}
                    showDateLine={showDateLine}
                    cameraText={cameraText}
                    lensText={lensText}
                    exposureText={exposureText}
                    dateText={dateText}
                    logoContent={renderLogo()}
                  />
                </div>
              </div>
            </section>

            <aside className="editor-panel editor-panel--right inspector-panel">
              <div className="inspector-header">
                <div className="panel-label">编辑</div>

                <div className="inspector-tabs" role="tablist" aria-label="编辑功能">
                  <button
                    type="button"
                    className={controlSection === 'frame' ? 'active' : ''}
                    onClick={() => setControlSection('frame')}
                    role="tab"
                    aria-selected={controlSection === 'frame'}
                  >
                    边框
                  </button>

                  <button
                    type="button"
                    className={controlSection === 'type' ? 'active' : ''}
                    onClick={() => setControlSection('type')}
                    role="tab"
                    aria-selected={controlSection === 'type'}
                  >
                    字体
                  </button>

                  <button
                    type="button"
                    className={controlSection === 'metadata' ? 'active' : ''}
                    onClick={() => setControlSection('metadata')}
                    role="tab"
                    aria-selected={controlSection === 'metadata'}
                  >
                    信息
                  </button>

                  <button
                    type="button"
                    className={controlSection === 'logo' ? 'active' : ''}
                    onClick={() => setControlSection('logo')}
                    role="tab"
                    aria-selected={controlSection === 'logo'}
                  >
                    标识
                  </button>
                </div>

                <div className="template-memory-toolbar">
                  <span className="template-memory-status">
                    <span className="template-memory-dot" aria-hidden="true" />
                    本机自动记忆 · 不保存图片
                  </span>
                  <button
                    type="button"
                    className="template-memory-reset"
                    onClick={resetCurrentTemplateSettings}
                    title="清除当前模板的本机记忆并恢复默认设置"
                  >
                    恢复模板默认
                  </button>
                </div>
              </div>

              <div className="inspector-content">
                {controlSection === 'frame' && (
                  <>
              <div className="control-group">
                <div className="control-heading">
                  <label>边框</label>
                  <div className="control-value-group">
                    <span className="control-value">{frameSize}%</span>
                    {frameSize !== template.frameDefault && (
                      <button
                        type="button"
                        className="slider-reset-button"
                        onClick={() =>
                          setFrameSize(template.frameDefault)
                        }
                        title={`Reset to ${template.frameDefault}%`}
                        aria-label="Reset frame size"
                      >
                        ↺
                      </button>
                    )}
                  </div>
                </div>
                <input
                  className="centered-range studio-range"
                  style={getSliderVisualStyle(
                    sliderPositionFromValue(
                      frameSize,
                      8,
                      template.frameDefault,
                      30,
                    ),
                  )}
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={sliderPositionFromValue(
                    frameSize,
                    8,
                    template.frameDefault,
                    30,
                  )}
                  onDoubleClick={() =>
                    setFrameSize(template.frameDefault)
                  }
                  onChange={(event) =>
                    setFrameSize(
                      magneticSliderValueFromPosition(
                        Number(event.target.value),
                        frameSize,
                        8,
                        template.frameDefault,
                        30,
                        1,
                        6,
                        12,
                      ),
                    )
                  }
                />
              </div>
              {template.id === '02' ? (
                <>
                  <div className="control-group">
                    <label>胶片颜色</label>
                    <div className="segmented-control">
                      <button
                        className={
                          filmMatteColorPreset === 'brown'
                            ? 'active'
                            : ''
                        }
                        onClick={() =>
                          setFilmMatteColorPreset('brown')
                        }
                      >
                        棕色
                      </button>
                      <button
                        className={
                          filmMatteColorPreset === 'black'
                            ? 'active'
                            : ''
                        }
                        onClick={() =>
                          setFilmMatteColorPreset('black')
                        }
                      >
                        黑色
                      </button>
                      <button
                        className={
                          filmMatteColorPreset === 'blue'
                            ? 'active'
                            : ''
                        }
                        onClick={() =>
                          setFilmMatteColorPreset('blue')
                        }
                      >
                        蓝黑
                      </button>
                    </div>
                  </div>

                  <div className="control-group">
                    <label>文字色调</label>
                    <div className="segmented-control">
                      <button
                        className={
                          filmMatteTextPreset === 'white'
                            ? 'active'
                            : ''
                        }
                        onClick={() =>
                          setFilmMatteTextPreset('white')
                        }
                      >
                        白色
                      </button>
                      <button
                        className={
                          filmMatteTextPreset === 'orange'
                            ? 'active'
                            : ''
                        }
                        onClick={() =>
                          setFilmMatteTextPreset('orange')
                        }
                      >
                        橙色
                      </button>
                      <button
                        className={
                          filmMatteTextPreset === 'red'
                            ? 'active'
                            : ''
                        }
                        onClick={() =>
                          setFilmMatteTextPreset('red')
                        }
                      >
                        红色
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="control-group">
                  <label>背景</label>
                  <div className="segmented-control segmented-control--four">
                    <button
                      className={backgroundMode === 'white' ? 'active' : ''}
                      onClick={() => setBackgroundMode('white')}
                    >
                      白色
                    </button>
                    <button
                      className={backgroundMode === 'warm' ? 'active' : ''}
                      onClick={() => setBackgroundMode('warm')}
                    >
                      暖白
                    </button>
                    <button
                      className={backgroundMode === 'black' ? 'active' : ''}
                      onClick={() => setBackgroundMode('black')}
                    >
                      黑色
                    </button>
                    <button
                      className={backgroundMode === 'custom' ? 'active' : ''}
                      onClick={() => setBackgroundMode('custom')}
                    >
                      自定义
                    </button>
                  </div>

                  {backgroundMode === 'custom' && (
                    <label className="color-control">
                      <span>边框颜色</span>
                      <div className="color-control-value">
                        <input
                          type="color"
                          value={customFrameColor}
                          onChange={(event) => {
                            setCustomFrameColor(event.target.value)
                            setBackgroundMode('custom')
                          }}
                        />
                        <span>{customFrameColor.toUpperCase()}</span>
                      </div>
                    </label>
                  )}
                </div>
              )}

              {template.id === '04' && (
                <div className="control-group shadow-ribbon-controls">
                  <label>磨砂宽度</label>

                  <div className="segmented-control shadow-ribbon-width-control">
                    <button
                      type="button"
                      className={
                        shadowRibbonWidthMode === 'inset'
                          ? 'active'
                          : ''
                      }
                      onClick={() =>
                        setShadowRibbonWidthMode('inset')
                      }
                    >
                      留边
                    </button>

                    <button
                      type="button"
                      className={
                        shadowRibbonWidthMode === 'full'
                          ? 'active'
                          : ''
                      }
                      onClick={() =>
                        setShadowRibbonWidthMode('full')
                      }
                    >
                      铺满
                    </button>
                  </div>

                  <div className="control-heading shadow-ribbon-first-slider-heading">
                    <label>磨砂透明度</label>
                    <div className="control-value-group">
                      <span className="control-value">
                        {shadowRibbonOpacity}%
                      </span>

                      {shadowRibbonOpacity !== 50 && (
                        <button
                          type="button"
                          className="slider-reset-button"
                          onClick={() =>
                            setShadowRibbonOpacity(50)
                          }
                          title="Reset glass opacity"
                          aria-label="Reset glass opacity"
                        >
                          ↺
                        </button>
                      )}
                    </div>
                  </div>

                  <input
                    className="studio-range"
                    style={getSliderVisualStyle(
                      ((shadowRibbonOpacity - 20) /
                        76) *
                        100,
                    )}
                    type="range"
                    min="20"
                    max="96"
                    step="1"
                    value={shadowRibbonOpacity}
                    onDoubleClick={() =>
                      setShadowRibbonOpacity(50)
                    }
                    onChange={(event) =>
                      setShadowRibbonOpacity(
                        Number(event.target.value),
                      )
                    }
                  />

                  <div className="control-heading shadow-ribbon-position-heading">
                    <label>背景模糊</label>
                    <div className="control-value-group">
                      <span className="control-value">
                        {shadowRibbonBlur}px
                      </span>

                      {shadowRibbonBlur !== 1 && (
                        <button
                          type="button"
                          className="slider-reset-button"
                          onClick={() =>
                            setShadowRibbonBlur(1)
                          }
                          title="Reset glass blur"
                          aria-label="Reset glass blur"
                        >
                          ↺
                        </button>
                      )}
                    </div>
                  </div>

                  <input
                    className="studio-range"
                    style={getSliderVisualStyle(
                      (shadowRibbonBlur / 28) *
                        100,
                    )}
                    type="range"
                    min="0"
                    max="28"
                    step="1"
                    value={shadowRibbonBlur}
                    onDoubleClick={() =>
                      setShadowRibbonBlur(1)
                    }
                    onChange={(event) =>
                      setShadowRibbonBlur(
                        Number(event.target.value),
                      )
                    }
                  />

                  <div className="control-heading shadow-ribbon-position-heading">
                    <label>磨砂位置</label>
                    <div className="control-value-group">
                      <span className="control-value">
                        {shadowRibbonPositionY}%
                      </span>

                      {shadowRibbonPositionY !== 97 && (
                        <button
                          type="button"
                          className="slider-reset-button"
                          onClick={() =>
                            setShadowRibbonPositionY(97)
                          }
                          title="Reset glass position"
                          aria-label="Reset glass position"
                        >
                          ↺
                        </button>
                      )}
                    </div>
                  </div>

                  <input
                    className="studio-range"
                    style={getSliderVisualStyle(
                      shadowRibbonPositionY,
                    )}
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={shadowRibbonPositionY}
                    onDoubleClick={() =>
                      setShadowRibbonPositionY(97)
                    }
                    onChange={(event) =>
                      setShadowRibbonPositionY(
                        Number(event.target.value),
                      )
                    }
                  />

                  <div className="shadow-ribbon-control-note">
                    “留边”保持左右间距，“铺满”延伸到图片两侧。位置范围覆盖整张图片：0% 对齐顶部，100% 对齐底部。
                  </div>
                </div>
              )}

              {template.id === 'I03' && (
                <>
                  <div className="control-group manga-control-group">
                    <label>分镜布局</label>

                    <label className="toggle-row">
                      <span>联动裁切</span>
                      <input
                        type="checkbox"
                        checked={mangaLinkedCrop}
                        onChange={(event) =>
                          setMangaLinkedCrop(event.target.checked)
                        }
                      />
                    </label>

                    <div className="control-heading manga-control-heading">
                      <label>布局预设</label>
                    </div>
                    <div className="segmented-control manga-layout-switcher">
                      <button
                        type="button"
                        className={mangaLayout === 'layout-1' ? 'active' : ''}
                        onClick={() => setMangaLayout('layout-1')}
                      >
                        01 侧栏
                      </button>
                      <button
                        type="button"
                        className={mangaLayout === 'layout-2' ? 'active' : ''}
                        onClick={() => setMangaLayout('layout-2')}
                      >
                        02 上下
                      </button>
                      <button
                        type="button"
                        className={mangaLayout === 'layout-3' ? 'active' : ''}
                        onClick={() => setMangaLayout('layout-3')}
                      >
                        03 横向
                      </button>
                    </div>

                    <div className="manga-frame-size-row">
                      <span>拖动画布中的分隔线可直接改变分镜框大小</span>
                      {(mangaPrimarySplit !== 72 || mangaSecondarySplit !== 50) && (
                        <button
                          type="button"
                          className="manga-frame-reset-button"
                          onClick={() => {
                            setMangaPrimarySplit(72)
                            setMangaSecondarySplit(50)
                          }}
                        >
                          重置比例
                        </button>
                      )}
                    </div>

                    <div className="control-heading manga-control-heading">
                      <label>分镜间距</label>
                      <span className="control-value">{mangaPanelGap}px</span>
                    </div>
                    <input
                      className="studio-range"
                      style={getSliderVisualStyle(
                        ((mangaPanelGap - 2) / 22) * 100,
                      )}
                      type="range"
                      min="2"
                      max="24"
                      step="1"
                      value={mangaPanelGap}
                      onDoubleClick={() => setMangaPanelGap(8)}
                      onChange={(event) =>
                        setMangaPanelGap(Number(event.target.value))
                      }
                    />

                    <div className="control-heading manga-control-heading">
                      <label>边框粗细</label>
                      <span className="control-value">{mangaBorderWidth}px</span>
                    </div>
                    <input
                      className="studio-range"
                      style={getSliderVisualStyle(
                        (mangaBorderWidth / 5) * 100,
                      )}
                      type="range"
                      min="0"
                      max="5"
                      step="1"
                      value={mangaBorderWidth}
                      onDoubleClick={() => setMangaBorderWidth(1)}
                      onChange={(event) =>
                        setMangaBorderWidth(Number(event.target.value))
                      }
                    />

                    <div className="manga-control-note">
                      布局 01 为左侧主画面 + 右侧双分镜；布局 02 为上方主画面 + 下方双分镜；布局 03 为主画面 + 底部横向特写。画布中的分隔线可直接拖动改变框大小；画面缩放上限已提高到 500%。
                    </div>
                  </div>

                  <details className="control-group manga-control-group manga-panel-menu">
                    <summary>
                      <span>主画面</span>
                      <span className="manga-panel-menu-value">
                        {mangaMainImageScale}% · X {mangaMainImageX > 0 ? '+' : ''}{mangaMainImageX} · Y {mangaMainImageY > 0 ? '+' : ''}{mangaMainImageY}
                      </span>
                    </summary>

                    <div className="manga-panel-menu-body">
                      <div className="control-heading manga-control-heading">
                        <label>画面缩放</label>
                        <div className="control-value-group">
                          <span className="control-value">{mangaMainImageScale}%</span>
                          {mangaMainImageScale !== 100 && (
                            <button type="button" className="slider-reset-button" onClick={() => setMangaMainImageScale(100)} title="重置主画面缩放">↺</button>
                          )}
                        </div>
                      </div>
                      <input className="studio-range" style={getSliderVisualStyle(((mangaMainImageScale - 100) / 400) * 100)} type="range" min="100" max="500" step="1" value={mangaMainImageScale} onDoubleClick={() => setMangaMainImageScale(100)} onChange={(event) => setMangaMainImageScale(Number(event.target.value))} />

                      <div className="control-heading manga-control-heading">
                        <label>水平位置 X</label>
                        <div className="control-value-group">
                          <span className="control-value">{mangaMainImageX > 0 ? '+' : ''}{mangaMainImageX}</span>
                          {mangaMainImageX !== 0 && (
                            <button type="button" className="slider-reset-button" onClick={() => setMangaMainImageX(0)} title="重置主画面水平位置">↺</button>
                          )}
                        </div>
                      </div>
                      <input className="studio-range" style={getSliderVisualStyle(((mangaMainImageX + 100) / 200) * 100)} type="range" min="-100" max="100" step="1" value={mangaMainImageX} onDoubleClick={() => setMangaMainImageX(0)} onChange={(event) => setMangaMainImageX(Number(event.target.value))} />

                      <div className="control-heading manga-control-heading">
                        <label>垂直位置 Y</label>
                        <div className="control-value-group">
                          <span className="control-value">{mangaMainImageY > 0 ? '+' : ''}{mangaMainImageY}</span>
                          {mangaMainImageY !== 0 && (
                            <button type="button" className="slider-reset-button" onClick={() => setMangaMainImageY(0)} title="重置主画面垂直位置">↺</button>
                          )}
                        </div>
                      </div>
                      <input className="studio-range" style={getSliderVisualStyle(((mangaMainImageY + 100) / 200) * 100)} type="range" min="-100" max="100" step="1" value={mangaMainImageY} onDoubleClick={() => setMangaMainImageY(0)} onChange={(event) => setMangaMainImageY(Number(event.target.value))} />
                    </div>
                  </details>

                  <details className="control-group manga-control-group manga-panel-menu">
                    <summary>
                      <span>{mangaLayout === 'layout-1' ? '右上分镜' : mangaLayout === 'layout-2' ? '左下分镜' : '底部特写'}</span>
                      <span className="manga-panel-menu-value">
                        {mangaLinkedCrop
                          ? '联动主画面'
                          : `${mangaTopImageScale}% · X ${mangaTopImageX > 0 ? '+' : ''}${mangaTopImageX} · Y ${mangaTopImageY > 0 ? '+' : ''}${mangaTopImageY}`}
                      </span>
                    </summary>

                    <div className="manga-panel-menu-body">
                      <div className="control-heading manga-control-heading">
                        <label>画面缩放</label>
                        <div className="control-value-group">
                          <span className="control-value">{mangaLinkedCrop ? mangaMainImageScale : mangaTopImageScale}%</span>
                          {!mangaLinkedCrop && mangaTopImageScale !== 100 && (
                            <button type="button" className="slider-reset-button" onClick={() => setMangaTopImageScale(100)} title="重置右上分镜缩放">↺</button>
                          )}
                        </div>
                      </div>
                      <input className="studio-range" style={getSliderVisualStyle((((mangaLinkedCrop ? mangaMainImageScale : mangaTopImageScale) - 100) / 400) * 100)} type="range" min="100" max="500" step="1" value={mangaLinkedCrop ? mangaMainImageScale : mangaTopImageScale} disabled={mangaLinkedCrop} onDoubleClick={() => !mangaLinkedCrop && setMangaTopImageScale(100)} onChange={(event) => setMangaTopImageScale(Number(event.target.value))} />

                      <div className="control-heading manga-control-heading">
                        <label>水平位置 X</label>
                        <div className="control-value-group">
                          <span className="control-value">{mangaLinkedCrop ? (mangaMainImageX > 0 ? '+' : '') + mangaMainImageX : (mangaTopImageX > 0 ? '+' : '') + mangaTopImageX}</span>
                          {!mangaLinkedCrop && mangaTopImageX !== 0 && (
                            <button type="button" className="slider-reset-button" onClick={() => setMangaTopImageX(0)} title="重置右上分镜水平位置">↺</button>
                          )}
                        </div>
                      </div>
                      <input className="studio-range" style={getSliderVisualStyle((((mangaLinkedCrop ? mangaMainImageX : mangaTopImageX) + 100) / 200) * 100)} type="range" min="-100" max="100" step="1" value={mangaLinkedCrop ? mangaMainImageX : mangaTopImageX} disabled={mangaLinkedCrop} onDoubleClick={() => !mangaLinkedCrop && setMangaTopImageX(0)} onChange={(event) => setMangaTopImageX(Number(event.target.value))} />

                      <div className="control-heading manga-control-heading">
                        <label>垂直位置 Y</label>
                        <div className="control-value-group">
                          <span className="control-value">{mangaLinkedCrop ? (mangaMainImageY > 0 ? '+' : '') + mangaMainImageY : (mangaTopImageY > 0 ? '+' : '') + mangaTopImageY}</span>
                          {!mangaLinkedCrop && mangaTopImageY !== 0 && (
                            <button type="button" className="slider-reset-button" onClick={() => setMangaTopImageY(0)} title="重置右上分镜垂直位置">↺</button>
                          )}
                        </div>
                      </div>
                      <input className="studio-range" style={getSliderVisualStyle((((mangaLinkedCrop ? mangaMainImageY : mangaTopImageY) + 100) / 200) * 100)} type="range" min="-100" max="100" step="1" value={mangaLinkedCrop ? mangaMainImageY : mangaTopImageY} disabled={mangaLinkedCrop} onDoubleClick={() => !mangaLinkedCrop && setMangaTopImageY(0)} onChange={(event) => setMangaTopImageY(Number(event.target.value))} />
                    </div>
                  </details>

                  {mangaLayout !== 'layout-3' && (
                    <details className="control-group manga-control-group manga-panel-menu">
                    <summary>
                      <span>{mangaLayout === 'layout-1' ? '右下分镜' : '右下分镜'}</span>
                      <span className="manga-panel-menu-value">
                        {mangaLinkedCrop
                          ? '联动主画面'
                          : `${mangaBottomImageScale}% · X ${mangaBottomImageX > 0 ? '+' : ''}${mangaBottomImageX} · Y ${mangaBottomImageY > 0 ? '+' : ''}${mangaBottomImageY}`}
                      </span>
                    </summary>

                    <div className="manga-panel-menu-body">
                      <div className="control-heading manga-control-heading">
                        <label>画面缩放</label>
                        <div className="control-value-group">
                          <span className="control-value">{mangaLinkedCrop ? mangaMainImageScale : mangaBottomImageScale}%</span>
                          {!mangaLinkedCrop && mangaBottomImageScale !== 100 && (
                            <button type="button" className="slider-reset-button" onClick={() => setMangaBottomImageScale(100)} title="重置右下分镜缩放">↺</button>
                          )}
                        </div>
                      </div>
                      <input className="studio-range" style={getSliderVisualStyle((((mangaLinkedCrop ? mangaMainImageScale : mangaBottomImageScale) - 100) / 400) * 100)} type="range" min="100" max="500" step="1" value={mangaLinkedCrop ? mangaMainImageScale : mangaBottomImageScale} disabled={mangaLinkedCrop} onDoubleClick={() => !mangaLinkedCrop && setMangaBottomImageScale(100)} onChange={(event) => setMangaBottomImageScale(Number(event.target.value))} />

                      <div className="control-heading manga-control-heading">
                        <label>水平位置 X</label>
                        <div className="control-value-group">
                          <span className="control-value">{mangaLinkedCrop ? (mangaMainImageX > 0 ? '+' : '') + mangaMainImageX : (mangaBottomImageX > 0 ? '+' : '') + mangaBottomImageX}</span>
                          {!mangaLinkedCrop && mangaBottomImageX !== 0 && (
                            <button type="button" className="slider-reset-button" onClick={() => setMangaBottomImageX(0)} title="重置右下分镜水平位置">↺</button>
                          )}
                        </div>
                      </div>
                      <input className="studio-range" style={getSliderVisualStyle((((mangaLinkedCrop ? mangaMainImageX : mangaBottomImageX) + 100) / 200) * 100)} type="range" min="-100" max="100" step="1" value={mangaLinkedCrop ? mangaMainImageX : mangaBottomImageX} disabled={mangaLinkedCrop} onDoubleClick={() => !mangaLinkedCrop && setMangaBottomImageX(0)} onChange={(event) => setMangaBottomImageX(Number(event.target.value))} />

                      <div className="control-heading manga-control-heading">
                        <label>垂直位置 Y</label>
                        <div className="control-value-group">
                          <span className="control-value">{mangaLinkedCrop ? (mangaMainImageY > 0 ? '+' : '') + mangaMainImageY : (mangaBottomImageY > 0 ? '+' : '') + mangaBottomImageY}</span>
                          {!mangaLinkedCrop && mangaBottomImageY !== 0 && (
                            <button type="button" className="slider-reset-button" onClick={() => setMangaBottomImageY(0)} title="重置右下分镜垂直位置">↺</button>
                          )}
                        </div>
                      </div>
                      <input className="studio-range" style={getSliderVisualStyle((((mangaLinkedCrop ? mangaMainImageY : mangaBottomImageY) + 100) / 200) * 100)} type="range" min="-100" max="100" step="1" value={mangaLinkedCrop ? mangaMainImageY : mangaBottomImageY} disabled={mangaLinkedCrop} onDoubleClick={() => !mangaLinkedCrop && setMangaBottomImageY(0)} onChange={(event) => setMangaBottomImageY(Number(event.target.value))} />
                    </div>
                  </details>
                  )}
                </>
              )}
                  </>
                )}

                {controlSection === 'type' && (
                  <>
              <div className="control-group">
                <div className="control-heading">
                  <label>字体风格</label>

                  {fontPreset !== 'template' && (
                    <button
                      type="button"
                      className="font-preset-reset"
                      onClick={() =>
                        setFontPreset('template')
                      }
                    >
                      跟随模板
                    </button>
                  )}
                </div>

                <div className="font-preset-grid">
                  <button
                    type="button"
                    className={`font-preset-card ${
                      fontPreset === 'template'
                        ? 'active'
                        : ''
                    }`}
                    onClick={() =>
                      setFontPreset('template')
                    }
                  >
                    <span
                      className="font-preset-sample"
                      style={{
                        fontFamily:
                          templateFontPreset.titleFamily,
                      }}
                    >
                      Aa 文
                    </span>

                    <span className="font-preset-name">
                      跟随模板
                    </span>

                    <span className="font-preset-description">
                      保持模板设计
                    </span>
                  </button>

                  {(
                    Object.entries(
                      FONT_PRESETS,
                    ) as Array<
                      [
                        Exclude<
                          FontPreset,
                          'template'
                        >,
                        FontPresetDefinition,
                      ]
                    >
                  ).map(
                    ([
                      presetKey,
                      preset,
                    ]) => (
                      <button
                        type="button"
                        key={presetKey}
                        className={`font-preset-card ${
                          fontPreset ===
                          presetKey
                            ? 'active'
                            : ''
                        }`}
                        onClick={() =>
                          setFontPreset(
                            presetKey,
                          )
                        }
                      >
                        <span
                          className="font-preset-sample"
                          style={{
                            fontFamily:
                              preset.titleFamily,
                          }}
                        >
                          {preset.sample}
                        </span>

                        <span className="font-preset-name">
                          {preset.name}
                        </span>

                        <span className="font-preset-description">
                          {preset.description}
                        </span>
                      </button>
                    ),
                  )}
                </div>

                <div className="font-preset-note">
                  使用本机系统字体，确保预览与 JPEG 导出尽量一致。
                </div>
              </div>

              <div className="control-group">
                <div className="control-heading">
                  <label>主标题大小</label>
                  <div className="control-value-group">
                    <span className="control-value">{cameraSize}%</span>
                    {cameraSize !== 100 && (
                      <button
                        type="button"
                        className="slider-reset-button"
                        onClick={() => setCameraSize(100)}
                        title="Reset to 100%"
                        aria-label="Reset camera size"
                      >
                        ↺
                      </button>
                    )}
                  </div>
                </div>
                <input
                  className="centered-range studio-range"
                  style={getSliderVisualStyle(
                    sliderPositionFromValue(
                      cameraSize,
                      70,
                      100,
                      150,
                    ),
                  )}
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={sliderPositionFromValue(
                    cameraSize,
                    70,
                    100,
                    150,
                  )}
                  onDoubleClick={() => setCameraSize(100)}
                  onChange={(event) =>
                    setCameraSize(
                      magneticSliderValueFromPosition(
                        Number(event.target.value),
                        cameraSize,
                        70,
                        100,
                        150,
                        1,
                        6,
                        12,
                      ),
                    )
                  }
                />
              </div>
              <div className="control-group">
                <div className="control-heading">
                  <label>信息文字大小</label>
                  <div className="control-value-group">
                    <span className="control-value">{metadataSize}%</span>
                    {metadataSize !== 100 && (
                      <button
                        type="button"
                        className="slider-reset-button"
                        onClick={() => setMetadataSize(100)}
                        title="Reset to 100%"
                        aria-label="Reset metadata size"
                      >
                        ↺
                      </button>
                    )}
                  </div>
                </div>
                <input
                  className="centered-range studio-range"
                  style={getSliderVisualStyle(
                    sliderPositionFromValue(
                      metadataSize,
                      70,
                      100,
                      150,
                    ),
                  )}
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={sliderPositionFromValue(
                    metadataSize,
                    70,
                    100,
                    150,
                  )}
                  onDoubleClick={() => setMetadataSize(100)}
                  onChange={(event) =>
                    setMetadataSize(
                      magneticSliderValueFromPosition(
                        Number(event.target.value),
                        metadataSize,
                        70,
                        100,
                        150,
                        1,
                        6,
                        12,
                      ),
                    )
                  }
                />
              </div>
              <div className="control-group">
                <label>字重</label>
                <div className="segmented-control">
                  <button
                    className={fontWeight === 'regular' ? 'active' : ''}
                    onClick={() => setFontWeight('regular')}
                  >
                    常规
                  </button>
                  <button
                    className={fontWeight === 'medium' ? 'active' : ''}
                    onClick={() => setFontWeight('medium')}
                  >
                    中等
                  </button>
                  <button
                    className={fontWeight === 'bold' ? 'active' : ''}
                    onClick={() => setFontWeight('bold')}
                  >
                    粗体
                  </button>
                </div>
              </div>
                  </>
                )}

                {controlSection === 'metadata' && (
                  <>
              <div className="control-group">
                <label>信息来源</label>

                <div className="segmented-control">
                  <button
                    className={
                      metadataSourceMode === 'auto'
                        ? 'active'
                        : ''
                    }
                    onClick={() =>
                      setMetadataSourceMode('auto')
                    }
                  >
                    自动 EXIF
                  </button>

                  <button
                    className={
                      metadataSourceMode === 'custom'
                        ? 'active'
                        : ''
                    }
                    onClick={() =>
                      setMetadataSourceMode('custom')
                    }
                  >
                    自定义
                  </button>

                  <button
                    className={
                      metadataSourceMode === 'mixed'
                        ? 'active'
                        : ''
                    }
                    onClick={() =>
                      setMetadataSourceMode('mixed')
                    }
                  >
                    混合
                  </button>
                </div>

                <div
                  className={`metadata-source-status ${
                    hasExifMetadata
                      ? 'metadata-source-status--detected'
                      : ''
                  }`}
                >
                  <span className="metadata-source-status-dot" />

                  <span>
                    {metadataSourceMode === 'auto'
                      ? hasExifMetadata
                        ? '已检测到 EXIF · 正在使用图片内嵌信息'
                        : photoUrl
                          ? '未检测到 EXIF · 插画或后期图片可切换到“自定义”'
                          : '上传图片后将自动读取 EXIF'
                      : metadataSourceMode === 'custom'
                        ? '自定义来源 · 预设文字将作为输入建议'
                        : hasExifMetadata
                          ? '混合来源 · 优先建议 EXIF，缺失项使用预设'
                          : '混合来源 · 未发现 EXIF，缺失项使用预设文字'}
                  </span>
                </div>

                {metadataSourceMode !== 'auto' && (
                  <div className="custom-metadata-editor">
                    <div className="custom-metadata-editor-heading">
                      <span>自定义文字</span>

                      <div className="custom-metadata-actions">
                        <button
                          type="button"
                          onClick={resetCustomMetadataSuggestions}
                        >
                          恢复建议
                        </button>

                        <button
                          type="button"
                          className="custom-metadata-remove-blanks"
                          disabled={!hasPreservedBlankMetadataLine}
                          onClick={removeBlankMetadataLines}
                          title="Collapse intentionally preserved blank rows"
                        >
                          移除空行
                        </button>

                        <button
                          type="button"
                          onClick={clearCustomMetadata}
                        >
                          清空
                        </button>
                      </div>
                    </div>

                    <div className="custom-metadata-fields">
                      <label className="custom-metadata-field">
                        <span>标题</span>
                        <input
                          type="text"
                          value={customEditorValues.title}
                          maxLength={64}
                          placeholder={customEditorSuggestions.title}
                          onChange={(event) =>
                            updateCustomMetadataField(
                              'title',
                              event.target.value,
                            )
                          }
                        />
                      </label>

                      <label className="custom-metadata-field">
                        <span>副标题</span>
                        <input
                          type="text"
                          value={customEditorValues.subtitle}
                          maxLength={96}
                          placeholder={customEditorSuggestions.subtitle}
                          onChange={(event) =>
                            updateCustomMetadataField(
                              'subtitle',
                              event.target.value,
                            )
                          }
                        />
                      </label>

                      <label className="custom-metadata-field">
                        <span>参数</span>
                        <input
                          type="text"
                          value={customEditorValues.parameters}
                          maxLength={120}
                          placeholder={customEditorSuggestions.parameters}
                          onChange={(event) =>
                            updateCustomMetadataField(
                              'parameters',
                              event.target.value,
                            )
                          }
                        />
                      </label>

                      <label className="custom-metadata-field">
                        <span>日期</span>
                        <input
                          type="text"
                          value={customEditorValues.date}
                          maxLength={48}
                          placeholder={customEditorSuggestions.date}
                          onChange={(event) =>
                            updateCustomMetadataField(
                              'date',
                              event.target.value,
                            )
                          }
                        />
                      </label>
                    </div>

                    <div className="custom-metadata-note">
                      {metadataSourceMode === 'mixed'
                        ? '灰色文字为当前建议：优先使用 EXIF，缺失时才使用预设。手动清空字段会保留空白行；“移除空行”可收起这些空行。'
                        : '灰色文字为预设建议。手动清空字段会保留空白行；“移除空行”可收起这些空行。'}
                    </div>
                  </div>
                )}
              </div>

              {template.id === 'I03' && (
                <div className="control-group manga-meta-controls">
                  <label>分镜标记</label>

                  <label className="custom-metadata-field manga-meta-field">
                    <span>分镜编号</span>
                    <input
                      type="text"
                      value={mangaSceneLabel}
                      maxLength={32}
                      placeholder="SCENE 03"
                      onChange={(event) =>
                        setMangaSceneLabel(event.target.value)
                      }
                    />
                  </label>

                  <label className="custom-metadata-field manga-meta-field">
                    <span>侧边文字</span>
                    <input
                      type="text"
                      value={mangaSideCaption}
                      maxLength={64}
                      placeholder="FRAME STUDY · ORIGINAL WORK"
                      onChange={(event) =>
                        setMangaSideCaption(event.target.value)
                      }
                    />
                  </label>

                  <label className="toggle-row">
                    <span>显示分镜编号</span>
                    <input
                      type="checkbox"
                      checked={mangaShowSceneLabel}
                      onChange={(event) =>
                        setMangaShowSceneLabel(event.target.checked)
                      }
                    />
                  </label>

                  <label className="toggle-row">
                    <span>显示侧边文字</span>
                    <input
                      type="checkbox"
                      checked={mangaShowSideCaption}
                      onChange={(event) =>
                        setMangaShowSideCaption(event.target.checked)
                      }
                    />
                  </label>
                </div>
              )}

              <div className="control-group">
                <label>信息显示</label>
                <div className="segmented-control segmented-control--four">
                  <button
                    className={metadataMode === 'full' ? 'active' : ''}
                    onClick={() => setMetadataMode('full')}
                  >
                    完整
                  </button>
                  <button
                    className={metadataMode === 'minimal' ? 'active' : ''}
                    onClick={() => setMetadataMode('minimal')}
                  >
                    精简
                  </button>
                  <button
                    className={metadataMode === 'exposure' ? 'active' : ''}
                    onClick={() => setMetadataMode('exposure')}
                  >
                    曝光参数
                  </button>
                  <button
                    className={metadataMode === 'hidden' ? 'active' : ''}
                    onClick={() => setMetadataMode('hidden')}
                  >
                    隐藏
                  </button>
                </div>

                <label className="toggle-row">
                  <span>显示日期</span>
                  <input
                    type="checkbox"
                    checked={showDate}
                    disabled={metadataMode !== 'full'}
                    onChange={(event) => setShowDate(event.target.checked)}
                  />
                </label>

                {template.id !== '02' && metadataMode !== 'hidden' && (
                  <div className="metadata-color-controls">
                    <div className="metadata-color-heading">
                      <span>文字颜色</span>

                      <button
                        type="button"
                        className="metadata-color-reset-all"
                        disabled={
                          metadataPrimaryColorOverride === null &&
                          metadataSecondaryColorOverride === null
                        }
                        onClick={() => {
                          setMetadataPrimaryColorOverride(null)
                          setMetadataSecondaryColorOverride(null)
                        }}
                      >
                        重置
                      </button>
                    </div>

                    <div className="metadata-color-row">
                      <span className="metadata-color-label">
                        主要
                      </span>

                      <input
                        className="metadata-color-picker"
                        type="color"
                        value={metadataPrimaryColor}
                        aria-label="Primary metadata color"
                        onChange={(event) =>
                          setMetadataPrimaryColorOverride(
                            event.target.value,
                          )
                        }
                      />

                      <span className="metadata-color-value">
                        {metadataPrimaryColorOverride
                          ? metadataPrimaryColorOverride.toUpperCase()
                          : '自动'}
                      </span>

                      <button
                        type="button"
                        className="metadata-color-auto"
                        disabled={metadataPrimaryColorOverride === null}
                        onClick={() =>
                          setMetadataPrimaryColorOverride(null)
                        }
                      >
                        自动
                      </button>
                    </div>

                    <div className="metadata-color-row">
                      <span className="metadata-color-label">
                        次要
                      </span>

                      <input
                        className="metadata-color-picker"
                        type="color"
                        value={metadataSecondaryColor}
                        aria-label="Secondary metadata color"
                        onChange={(event) =>
                          setMetadataSecondaryColorOverride(
                            event.target.value,
                          )
                        }
                      />

                      <span className="metadata-color-value">
                        {metadataSecondaryColorOverride
                          ? metadataSecondaryColorOverride.toUpperCase()
                          : '自动'}
                      </span>

                      <button
                        type="button"
                        className="metadata-color-auto"
                        disabled={metadataSecondaryColorOverride === null}
                        onClick={() =>
                          setMetadataSecondaryColorOverride(null)
                        }
                      >
                        自动
                      </button>
                    </div>

                    <div className="metadata-color-note">
                      “主要”控制标题颜色；“次要”控制副标题、参数和日期。
                    </div>
                  </div>
                )}

                {metadataMode !== 'hidden' && (
                  <>
                    <button
                      type="button"
                      className={`advanced-toggle ${
                        metadataAdvancedOpen ? 'active' : ''
                      }`}
                      onClick={() =>
                        setMetadataAdvancedOpen(
                          (current) => !current,
                        )
                      }
                      aria-expanded={metadataAdvancedOpen}
                    >
                      <span>高级定位</span>
                      <span className="advanced-toggle-icon">
                        {metadataAdvancedOpen ? '−' : '+'}
                      </span>
                    </button>

                    {metadataAdvancedOpen && (
                      <div className="advanced-panel">
                        <div className="metadata-position-controls">
                          <label>位置</label>

                          <div className="segmented-control">
                            <button
                              className={
                                metadataPosition === 'left'
                                  ? 'active'
                                  : ''
                              }
                              onClick={() =>
                                setMetadataPosition('left')
                              }
                            >
                              左
                            </button>

                            <button
                              className={
                                metadataPosition === 'center'
                                  ? 'active'
                                  : ''
                              }
                              onClick={() =>
                                setMetadataPosition('center')
                              }
                            >
                              中
                            </button>

                            <button
                              className={
                                metadataPosition === 'right'
                                  ? 'active'
                                  : ''
                              }
                              onClick={() =>
                                setMetadataPosition('right')
                              }
                            >
                              右
                            </button>
                          </div>

                          <div className="control-heading">
                            <label>水平偏移</label>
                            <div className="control-value-group">
                              <span className="control-value">
                                {metadataOffsetX > 0 ? '+' : ''}
                                {metadataOffsetX}%
                              </span>
                              {metadataOffsetX !== 0 && (
                                <button
                                  type="button"
                                  className="slider-reset-button"
                                  onClick={() =>
                                    setMetadataOffsetX(0)
                                  }
                                  title="Reset to 0%"
                                  aria-label="Reset metadata horizontal offset"
                                >
                                  ↺
                                </button>
                              )}
                            </div>
                          </div>

                          <input
                            className="centered-range studio-range"
                            style={getSliderVisualStyle(
                              sliderPositionFromValue(
                                metadataOffsetX,
                                -20,
                                0,
                                20,
                              ),
                            )}
                            type="range"
                            min="0"
                            max="100"
                            step="1"
                            value={sliderPositionFromValue(
                              metadataOffsetX,
                              -20,
                              0,
                              20,
                            )}
                            onDoubleClick={() =>
                              setMetadataOffsetX(0)
                            }
                            onChange={(event) =>
                              setMetadataOffsetX(
                                magneticSliderValueFromPosition(
                                  Number(event.target.value),
                                  metadataOffsetX,
                                  -20,
                                  0,
                                  20,
                                  1,
                                  6,
                                  12,
                                ),
                              )
                            }
                          />

                          <div className="control-heading">
                            <label>垂直偏移</label>
                            <div className="control-value-group">
                              <span className="control-value">
                                {metadataOffsetY > 0 ? '+' : ''}
                                {metadataOffsetY}%
                              </span>
                              {metadataOffsetY !== 0 && (
                                <button
                                  type="button"
                                  className="slider-reset-button"
                                  onClick={() =>
                                    setMetadataOffsetY(0)
                                  }
                                  title="Reset to 0%"
                                  aria-label="Reset metadata vertical offset"
                                >
                                  ↺
                                </button>
                              )}
                            </div>
                          </div>

                          <input
                            className="centered-range studio-range"
                            style={getSliderVisualStyle(
                              sliderPositionFromValue(
                                metadataOffsetY,
                                -20,
                                0,
                                20,
                              ),
                            )}
                            type="range"
                            min="0"
                            max="100"
                            step="1"
                            value={sliderPositionFromValue(
                              metadataOffsetY,
                              -20,
                              0,
                              20,
                            )}
                            onDoubleClick={() =>
                              setMetadataOffsetY(0)
                            }
                            onChange={(event) =>
                              setMetadataOffsetY(
                                magneticSliderValueFromPosition(
                                  Number(event.target.value),
                                  metadataOffsetY,
                                  -20,
                                  0,
                                  20,
                                  1,
                                  6,
                                  12,
                                ),
                              )
                            }
                          />

                          <button
                            type="button"
                            className="metadata-position-reset"
                            onClick={() => {
                              setMetadataOffsetX(0)
                              setMetadataOffsetY(0)
                            }}
                          >
                            重置信息位置
                          </button>

                          <span className="metadata-safe-note">
                            信息会保持在画框安全区域内，并自动避让标识。
                          </span>

                          <div className="layout-safety-status">
                            <span className="layout-safety-dot" />
                            自动防重叠保护
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
                  </>
                )}

                {controlSection === 'logo' && (
                  <>
              <div className="control-group">
                <label>品牌 / 标识</label>

                <div className="segmented-control segmented-control--four">
                  <button
                    className={
                      logoMode === 'brand'
                        ? 'active'
                        : ''
                    }
                    onClick={() =>
                      setLogoMode('brand')
                    }
                  >
                    品牌
                  </button>

                  <button
                    className={
                      logoMode === 'text'
                        ? 'active'
                        : ''
                    }
                    onClick={() =>
                      setLogoMode('text')
                    }
                  >
                    文字
                  </button>

                  <button
                    className={
                      logoMode === 'custom'
                        ? 'active'
                        : ''
                    }
                    onClick={() =>
                      setLogoMode('custom')
                    }
                  >
                    上传
                  </button>

                  <button
                    className={
                      logoMode === 'hidden'
                        ? 'active'
                        : ''
                    }
                    onClick={() =>
                      setLogoMode('hidden')
                    }
                  >
                    隐藏
                  </button>
                </div>

                {logoMode === 'brand' && (
                  <>
                    <label className="select-row">
                      <span>品牌</span>

                      <select
                        value={brandSelection}
                        onChange={(event) =>
                          setBrandSelection(
                            event.target.value as BrandSelection,
                          )
                        }
                      >
                        <option value="auto">
                          自动识别 EXIF
                        </option>
                        <option value="nikon">
                          Nikon
                        </option>
                        <option value="canon">
                          Canon
                        </option>
                        <option value="sony">
                          Sony
                        </option>
                        <option value="fujifilm">
                          Fujifilm
                        </option>
                      </select>
                    </label>

                    <div className="logo-variant-section">
                      <div className="variant-heading">
                        <span>样式</span>

                        {effectiveBrand && (
                          <span className="variant-brand-name">
                            {LOGO_LIBRARY[effectiveBrand].name}
                          </span>
                        )}
                      </div>

                      {effectiveBrand ? (
                        <div className="logo-variant-grid">
                          {logoVariants.map((variant) => (
                            <button
                              type="button"
                              key={variant.id}
                              className={`logo-variant-card ${
                                logoVariant === variant.id
                                  ? 'active'
                                  : ''
                              }`}
                              onClick={() =>
                                setLogoVariant(variant.id)
                              }
                              aria-pressed={
                                logoVariant === variant.id
                              }
                            >
                              <span className="logo-variant-preview">
                                {variant.assetPath ? (
                                  <img
                                    src={variant.assetPath}
                                    alt=""
                                  />
                                ) : (
                                  <span className="logo-variant-fallback">
                                    {variant.primary}
                                  </span>
                                )}
                              </span>

                              <span className="logo-variant-name">
                                {variant.name}
                              </span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="logo-variant-empty">
                          未检测到支持的品牌。可手动选择品牌，或使用“文字”模式。
                        </div>
                      )}
                    </div>

                    <div className="asset-note">
                      {effectiveBrand &&
                      selectedLogoVariant?.assetPath
                        ? `已选择 ${selectedLogoVariant.name} · 矢量资源`
                        : effectiveBrand
                          ? `${selectedLogoVariant?.name ?? ''} 当前使用占位样式，等待加入正式资源。`
                          : '自动模式正在等待可识别的相机 EXIF。'}
                    </div>
                  </>
                )}

                {logoMode === 'text' && (
                  <label className="text-control">
                    <span>标识文字</span>

                    <input
                      type="text"
                      value={customLogoText}
                      maxLength={32}
                      placeholder="FRAME"
                      onChange={(event) =>
                        setCustomLogoText(
                          event.target.value,
                        )
                      }
                    />
                  </label>
                )}

                {logoMode === 'custom' && (
                  <div className="custom-logo-control">
                    <input
                      ref={customLogoInputRef}
                      className="custom-logo-file-input"
                      type="file"
                      accept=".png,.jpg,.jpeg,.webp,.svg,image/png,image/jpeg,image/webp,image/svg+xml"
                      onChange={handleCustomLogoUpload}
                    />

                    {customLogoDataUrl ? (
                      <>
                        <div className="custom-logo-preview-card">
                          <div className="custom-logo-preview">
                            <img
                              src={customLogoDataUrl}
                              alt=""
                            />
                          </div>

                          <div className="custom-logo-file-info">
                            <strong>
                              {customLogoName}
                            </strong>
                            <span>
                              仅保留在当前会话
                            </span>
                          </div>
                        </div>

                        <div className="custom-logo-actions">
                          <button
                            type="button"
                            disabled={isCustomLogoProcessing}
                            onClick={() =>
                              customLogoInputRef.current?.click()
                            }
                          >
                            更换
                          </button>

                          <button
                            type="button"
                            onClick={removeCustomLogo}
                          >
                            移除
                          </button>
                        </div>

                        <div className="custom-logo-options">
                          <label className="toggle-row custom-logo-remove-white">
                            <span>
                              去除白色背景
                            </span>

                            <input
                              type="checkbox"
                              checked={customLogoRemoveWhite}
                              disabled={isCustomLogoProcessing}
                              onChange={(event) =>
                                handleCustomLogoRemoveWhiteChange(
                                  event.target.checked,
                                )
                              }
                            />
                          </label>

                          {customLogoRemoveWhite && (
                            <div className="custom-logo-white-strength">
                              <div className="control-heading">
                                <label>
                                  去白强度
                                </label>
                                <span className="control-value">
                                  {customLogoWhiteStrength}
                                </span>
                              </div>

                              <input
                                className="studio-range"
                                style={getSliderVisualStyle(
                                  ((customLogoWhiteStrength -
                                    8) /
                                    82) *
                                    100,
                                )}
                                type="range"
                                min="8"
                                max="90"
                                step="2"
                                value={customLogoWhiteStrength}
                                onChange={(event) =>
                                  handleCustomLogoWhiteStrengthChange(
                                    Number(
                                      event.target.value,
                                    ),
                                  )
                                }
                                onPointerUp={(event) =>
                                  commitCustomLogoWhiteStrength(
                                    Number(
                                      event.currentTarget.value,
                                    ),
                                  )
                                }
                                onPointerCancel={(event) =>
                                  commitCustomLogoWhiteStrength(
                                    Number(
                                      event.currentTarget.value,
                                    ),
                                  )
                                }
                                onKeyUp={(event) =>
                                  commitCustomLogoWhiteStrength(
                                    Number(
                                      event.currentTarget.value,
                                    ),
                                  )
                                }
                                onBlur={(event) => {
                                  if (
                                    customLogoWhiteStrengthDirty
                                  ) {
                                    commitCustomLogoWhiteStrength(
                                      Number(
                                        event.currentTarget.value,
                                      ),
                                    )
                                  }
                                }}
                              />

                              <span className="custom-logo-process-note">
                                {isCustomLogoProcessing
                                  ? '处理中…'
                                  : customLogoWhiteStrengthDirty
                                    ? '松开滑块后应用。'
                                    : '仅移除与图片边缘连通的白色区域。'}
                              </span>
                            </div>
                          )}

                          <label className="toggle-row custom-logo-invert">
                            <span>
                              深色背景时反相
                            </span>

                            <input
                              type="checkbox"
                              checked={customLogoInvertOnDark}
                              onChange={(event) =>
                                setCustomLogoInvertOnDark(
                                  event.target.checked,
                                )
                              }
                            />
                          </label>
                        </div>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="custom-logo-upload-zone"
                        onClick={() =>
                          customLogoInputRef.current?.click()
                        }
                      >
                        <strong>
                          选择标识文件
                        </strong>
                        <span>
                          PNG · JPG · WebP · SVG
                        </span>
                      </button>
                    )}

                    <div className="asset-note">
                      标识仅保存在浏览器当前会话中，不会上传。
                    </div>
                  </div>
                )}

                {logoMode !== 'hidden' && (
                  <>
                    <div className="control-heading">
                      <label>标识大小</label>
                      <div className="control-value-group">
                        <span className="control-value">
                          {logoSize}%
                        </span>
                        {logoSize !== 100 && (
                          <button
                            type="button"
                            className="slider-reset-button"
                            onClick={() => setLogoSize(100)}
                            title="Reset to 100%"
                            aria-label="Reset logo size"
                          >
                            ↺
                          </button>
                        )}
                      </div>
                    </div>

                    <input
                      className="centered-range studio-range"
                      style={getSliderVisualStyle(
                        sliderPositionFromValue(
                          logoSize,
                          60,
                          100,
                          180,
                        ),
                      )}
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={sliderPositionFromValue(
                        logoSize,
                        60,
                        100,
                        180,
                      )}
                      onDoubleClick={() =>
                        setLogoSize(100)
                      }
                      onChange={(event) =>
                        setLogoSize(
                          magneticSliderValueFromPosition(
                            Number(
                              event.target.value,
                            ),
                            logoSize,
                            60,
                            100,
                            180,
                            1,
                            6,
                            12,
                          ),
                        )
                      }
                    />

                    <button
                      type="button"
                      className={`advanced-toggle ${
                        logoAdvancedOpen ? 'active' : ''
                      }`}
                      onClick={() =>
                        setLogoAdvancedOpen(
                          (current) => !current,
                        )
                      }
                      aria-expanded={logoAdvancedOpen}
                    >
                      <span>高级定位</span>
                      <span className="advanced-toggle-icon">
                        {logoAdvancedOpen ? '−' : '+'}
                      </span>
                    </button>

                    {logoAdvancedOpen && (
                      <div className="advanced-panel">
                        <label>位置</label>

                        <div className="segmented-control">
                          <button
                            className={
                              logoPosition === 'left'
                                ? 'active'
                                : ''
                            }
                            onClick={() =>
                              setLogoPosition('left')
                            }
                          >
                            左
                          </button>

                          <button
                            className={
                              logoPosition === 'center'
                                ? 'active'
                                : ''
                            }
                            onClick={() =>
                              setLogoPosition('center')
                            }
                          >
                            中
                          </button>

                          <button
                            className={
                              logoPosition === 'right'
                                ? 'active'
                                : ''
                            }
                            onClick={() =>
                              setLogoPosition('right')
                            }
                          >
                            右
                          </button>
                        </div>

                        <div className="logo-offset-controls">
                          <div className="control-heading">
                            <label>水平偏移</label>
                            <div className="control-value-group">
                              <span className="control-value">
                                {logoOffsetX > 0 ? '+' : ''}
                                {logoOffsetX}%
                              </span>
                              {logoOffsetX !== 0 && (
                                <button
                                  type="button"
                                  className="slider-reset-button"
                                  onClick={() =>
                                    setLogoOffsetX(0)
                                  }
                                  title="Reset to 0%"
                                  aria-label="Reset logo horizontal offset"
                                >
                                  ↺
                                </button>
                              )}
                            </div>
                          </div>

                          <input
                            className="centered-range studio-range"
                            style={getSliderVisualStyle(
                              sliderPositionFromValue(
                                logoOffsetX,
                                -20,
                                0,
                                20,
                              ),
                            )}
                            type="range"
                            min="0"
                            max="100"
                            step="1"
                            value={sliderPositionFromValue(
                              logoOffsetX,
                              -20,
                              0,
                              20,
                            )}
                            onDoubleClick={() =>
                              setLogoOffsetX(0)
                            }
                            onChange={(event) =>
                              setLogoOffsetX(
                                magneticSliderValueFromPosition(
                                  Number(event.target.value),
                                  logoOffsetX,
                                  -20,
                                  0,
                                  20,
                                  1,
                                  6,
                                  12,
                                ),
                              )
                            }
                          />

                          <div className="control-heading">
                            <label>垂直偏移</label>
                            <div className="control-value-group">
                              <span className="control-value">
                                {logoOffsetY > 0 ? '+' : ''}
                                {logoOffsetY}%
                              </span>
                              {logoOffsetY !== 0 && (
                                <button
                                  type="button"
                                  className="slider-reset-button"
                                  onClick={() =>
                                    setLogoOffsetY(0)
                                  }
                                  title="Reset to 0%"
                                  aria-label="Reset logo vertical offset"
                                >
                                  ↺
                                </button>
                              )}
                            </div>
                          </div>

                          <input
                            className="centered-range studio-range"
                            style={getSliderVisualStyle(
                              sliderPositionFromValue(
                                logoOffsetY,
                                -20,
                                0,
                                20,
                              ),
                            )}
                            type="range"
                            min="0"
                            max="100"
                            step="1"
                            value={sliderPositionFromValue(
                              logoOffsetY,
                              -20,
                              0,
                              20,
                            )}
                            onDoubleClick={() =>
                              setLogoOffsetY(0)
                            }
                            onChange={(event) =>
                              setLogoOffsetY(
                                magneticSliderValueFromPosition(
                                  Number(event.target.value),
                                  logoOffsetY,
                                  -20,
                                  0,
                                  20,
                                  1,
                                  6,
                                  12,
                                ),
                              )
                            }
                          />

                          <button
                            type="button"
                            className="logo-offset-reset"
                            onClick={() => {
                              setLogoOffsetX(0)
                              setLogoOffsetY(0)
                            }}
                          >
                            重置位置
                          </button>

                          <span className="logo-safe-note">
                            标识会保持在画框安全区域内，并自动避让信息文字。
                          </span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
                  </>
                )}
              </div>
            </aside>
          </div>
        </section>
      )}
    </main>
  )
}

export default App
