import type {
  ComponentProps,
} from 'react'

import { ClassicMetadataTemplate } from './ClassicMetadataTemplate'
import { ColorPaletteTemplate } from './ColorPaletteTemplate'
import { FilmMatteTemplate } from './FilmMatteTemplate'
import { ShadowRibbonTemplate } from './ShadowRibbonTemplate'
import { IllustrationGalleryTemplate } from './IllustrationGalleryTemplate'
import { IllustrationPosterTemplate } from './IllustrationPosterTemplate'
import { IllustrationMangaPanelTemplate } from './IllustrationMangaPanelTemplate'

type SharedTemplateProps =
  ComponentProps<
    typeof ClassicMetadataTemplate
  >

type TemplateRendererProps =
  SharedTemplateProps & {
    templateId: string
    shadowRibbonOpacity: number
    shadowRibbonPositionY: number
    mangaLinkedCrop: boolean
    mangaLayout: 'layout-1' | 'layout-2' | 'layout-3'
    mangaPrimarySplit: number
    mangaSecondarySplit: number
    onMangaPrimarySplitChange: (value: number) => void
    onMangaSecondarySplitChange: (value: number) => void
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
  }

export function TemplateRenderer({
  templateId,
  shadowRibbonOpacity,
  shadowRibbonPositionY,
  mangaLinkedCrop,
  mangaLayout,
  mangaPrimarySplit,
  mangaSecondarySplit,
  onMangaPrimarySplitChange,
  onMangaSecondarySplitChange,
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
  ...props
}: TemplateRendererProps) {
  if (templateId === '02') {
    return (
      <FilmMatteTemplate
        {...props}
      />
    )
  }

  if (templateId === '03') {
    return (
      <ColorPaletteTemplate
        {...props}
      />
    )
  }

  if (templateId === '04') {
    return (
      <ShadowRibbonTemplate
        {...props}
        shadowRibbonOpacity={
          shadowRibbonOpacity
        }
        shadowRibbonPositionY={
          shadowRibbonPositionY
        }
      />
    )
  }

  if (templateId === 'I01') {
    return (
      <IllustrationGalleryTemplate
        {...props}
      />
    )
  }

  if (templateId === 'I02') {
    return (
      <IllustrationPosterTemplate
        {...props}
      />
    )
  }

  if (templateId === 'I03') {
    return (
      <IllustrationMangaPanelTemplate
        {...props}
        mangaLinkedCrop={mangaLinkedCrop}
        mangaLayout={mangaLayout}
        mangaPrimarySplit={mangaPrimarySplit}
        mangaSecondarySplit={mangaSecondarySplit}
        onMangaPrimarySplitChange={onMangaPrimarySplitChange}
        onMangaSecondarySplitChange={onMangaSecondarySplitChange}
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
      />
    )
  }

  return (
    <ClassicMetadataTemplate
      {...props}
    />
  )
}
