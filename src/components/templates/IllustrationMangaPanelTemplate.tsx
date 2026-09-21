import {
  useRef,
  type ComponentProps,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react'

import { ClassicMetadataTemplate } from './ClassicMetadataTemplate'

type MangaLayout = 'layout-1' | 'layout-2' | 'layout-3'

type IllustrationMangaPanelTemplateProps =
  ComponentProps<typeof ClassicMetadataTemplate> & {
    mangaLayout: MangaLayout
    mangaPrimarySplit: number
    mangaSecondarySplit: number
    onMangaPrimarySplitChange: (value: number) => void
    onMangaSecondarySplitChange: (value: number) => void
    mangaLinkedCrop: boolean
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

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value))

export function IllustrationMangaPanelTemplate({
  previewRef,
  frameInfoRef,
  metadataCopyRef,
  logoSlotRef,
  photoOrientation,
  previewStyle,
  photoUrl,
  frameSize,
  metadataMode,
  logoPosition,
  metadataPosition,
  metadataCopyStyle,
  logoSlotStyle,
  showCamera,
  showLens,
  showExposure,
  showDateLine,
  cameraText,
  lensText,
  exposureText,
  dateText,
  logoContent,
  mangaLayout,
  mangaPrimarySplit,
  mangaSecondarySplit,
  onMangaPrimarySplitChange,
  onMangaSecondarySplitChange,
  mangaLinkedCrop,
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
}: IllustrationMangaPanelTemplateProps) {
  const gridRef = useRef<HTMLDivElement | null>(null)
  const detailStackRef = useRef<HTMLDivElement | null>(null)

  const clampPosition = (value: number) =>
    clamp(value, -100, 100)

  const positionToPercent = (value: number) =>
    (clampPosition(value) + 100) / 2

  const renderArtwork = (
    className: string,
    imageX: number,
    imageY: number,
    imageScale: number,
    baseOffsetX: number,
    baseOffsetY: number,
    scaleBoost: number,
    fitMode: 'contain' | 'cover',
  ) => {
    const sourceX = mangaLinkedCrop ? mangaMainImageX : imageX
    const sourceY = mangaLinkedCrop ? mangaMainImageY : imageY
    const sourceScale = mangaLinkedCrop ? mangaMainImageScale : imageScale

    const focalX = clampPosition(sourceX + baseOffsetX)
    const focalY = clampPosition(sourceY + baseOffsetY)
    const focalPoint = `${positionToPercent(focalX)}% ${positionToPercent(focalY)}%`
    const scale = Math.max(1, (sourceScale + scaleBoost) / 100)

    return (
      <div
        className={className}
        style={{ borderWidth: `${mangaBorderWidth}px` }}
      >
        {photoUrl ? (
          <img
            src={photoUrl}
            alt="Selected artwork"
            className="manga-panel-image"
            style={{
              objectFit: fitMode,
              objectPosition: focalPoint,
              transformOrigin: focalPoint,
              transform: `scale(${scale})`,
            }}
          />
        ) : (
          <div
            className="manga-fake-art"
            style={{
              transformOrigin: focalPoint,
              transform: `scale(${scale})`,
            }}
          >
            <span className="manga-fake-sky" />
            <span className="manga-fake-sun" />
            <span className="manga-fake-subject" />
          </div>
        )}
      </div>
    )
  }

  const startSplitDrag = (
    kind: 'primary' | 'secondary',
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    event.preventDefault()
    event.stopPropagation()

    const host =
      kind === 'primary'
        ? gridRef.current
        : detailStackRef.current

    if (!host) return

    const pointerId = event.pointerId
    event.currentTarget.setPointerCapture(pointerId)

    const update = (clientX: number, clientY: number) => {
      const rect = host.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) return

      if (kind === 'primary') {
        if (mangaLayout === 'layout-1') {
          const ratio = ((clientX - rect.left) / rect.width) * 100
          onMangaPrimarySplitChange(clamp(ratio, 48, 84))
        } else if (mangaLayout === 'layout-2') {
          const ratio = ((clientY - rect.top) / rect.height) * 100
          onMangaPrimarySplitChange(clamp(ratio, 48, 82))
        } else {
          const ratio = ((clientY - rect.top) / rect.height) * 100
          onMangaPrimarySplitChange(clamp(ratio, 52, 84))
        }
        return
      }

      if (mangaLayout === 'layout-1') {
        const ratio = ((clientY - rect.top) / rect.height) * 100
        onMangaSecondarySplitChange(clamp(ratio, 24, 76))
      } else if (mangaLayout === 'layout-2') {
        const ratio = ((clientX - rect.left) / rect.width) * 100
        onMangaSecondarySplitChange(clamp(ratio, 24, 76))
      }
    }

    update(event.clientX, event.clientY)

    const handleMove = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) return
      update(moveEvent.clientX, moveEvent.clientY)
    }

    const handleUp = (upEvent: PointerEvent) => {
      if (upEvent.pointerId !== pointerId) return
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
      window.removeEventListener('pointercancel', handleUp)
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    window.addEventListener('pointercancel', handleUp)
  }

  const hero = (
    <div
      className="manga-panel-hero-wrap"
      data-export-photo-anchor
    >
      {renderArtwork(
        'manga-panel manga-panel--hero',
        mangaMainImageX,
        mangaMainImageY,
        mangaMainImageScale,
        0,
        0,
        0,
        'contain',
      )}

      {mangaShowSceneLabel && (
        <span className="manga-scene-label">
          {mangaSceneLabel || 'SCENE 03'}
        </span>
      )}
    </div>
  )

  const panelA = renderArtwork(
    'manga-panel manga-panel--crop manga-panel--detail-a',
    mangaTopImageX,
    mangaTopImageY,
    mangaTopImageScale,
    mangaLayout === 'layout-1' ? -16 : mangaLayout === 'layout-2' ? -10 : 0,
    mangaLayout === 'layout-1' ? -14 : mangaLayout === 'layout-2' ? 8 : 14,
    mangaLayout === 'layout-3' ? 18 : 28,
    'cover',
  )

  const panelB = renderArtwork(
    'manga-panel manga-panel--crop manga-panel--detail-b',
    mangaBottomImageX,
    mangaBottomImageY,
    mangaBottomImageScale,
    mangaLayout === 'layout-1' ? 16 : 10,
    mangaLayout === 'layout-1' ? 16 : 8,
    mangaLayout === 'layout-2' ? 28 : 38,
    'cover',
  )

  const gridStyle: CSSProperties = {
    gap: `${mangaPanelGap}px`,
  }

  if (mangaLayout === 'layout-1') {
    gridStyle.gridTemplateColumns = `${mangaPrimarySplit}% minmax(0, 1fr)`
  } else {
    gridStyle.gridTemplateRows = `${mangaPrimarySplit}% minmax(0, 1fr)`
  }

  const stackStyle: CSSProperties = {
    gap: `${mangaPanelGap}px`,
  }

  if (mangaLayout === 'layout-1') {
    stackStyle.gridTemplateRows = `${mangaSecondarySplit}% minmax(0, 1fr)`
  } else if (mangaLayout === 'layout-2') {
    stackStyle.gridTemplateColumns = `${mangaSecondarySplit}% minmax(0, 1fr)`
  }

  const primaryHandleStyle = {
    '--manga-handle-position': `${mangaPrimarySplit}%`,
    '--manga-handle-offset': `${mangaPanelGap / 2}px`,
  } as CSSProperties

  const secondaryHandleStyle = {
    '--manga-handle-position': `${mangaSecondarySplit}%`,
    '--manga-handle-offset': `${mangaPanelGap / 2}px`,
  } as CSSProperties

  return (
    <div
      ref={previewRef}
      className={`editor-preview editor-preview--${photoOrientation} illustration-manga-template illustration-manga-template--${mangaLayout}`}
      style={previewStyle}
    >
      <div
        className="illustration-manga-sheet"
        style={{ padding: `${Math.max(14, frameSize * 0.8)}px` }}
      >
        <div className="illustration-manga-header">
          <span>I / 03</span>
          <span>VISUAL SEQUENCE · STORY PANEL</span>
        </div>

        <div
          ref={gridRef}
          className={`illustration-manga-grid illustration-manga-grid--${mangaLayout}`}
          style={gridStyle}
        >
          {mangaLayout === 'layout-1' && (
            <>
              {hero}
              <div
                ref={detailStackRef}
                className="manga-panel-stack manga-panel-stack--vertical"
                style={stackStyle}
              >
                {panelA}
                {panelB}
                <button
                  type="button"
                  className="manga-resize-handle manga-resize-handle--horizontal manga-resize-handle--secondary"
                  style={secondaryHandleStyle}
                  onPointerDown={(event) => startSplitDrag('secondary', event)}
                  aria-label="拖动调整右侧两个分镜高度"
                  title="拖动调整右侧两个分镜高度"
                >
                  <span />
                </button>
              </div>
              <button
                type="button"
                className="manga-resize-handle manga-resize-handle--vertical manga-resize-handle--primary"
                style={primaryHandleStyle}
                onPointerDown={(event) => startSplitDrag('primary', event)}
                aria-label="拖动调整主画面与右侧分镜宽度"
                title="拖动调整主画面与右侧分镜宽度"
              >
                <span />
              </button>
            </>
          )}

          {mangaLayout === 'layout-2' && (
            <>
              {hero}
              <div
                ref={detailStackRef}
                className="manga-panel-stack manga-panel-stack--horizontal"
                style={stackStyle}
              >
                {panelA}
                {panelB}
                <button
                  type="button"
                  className="manga-resize-handle manga-resize-handle--vertical manga-resize-handle--secondary"
                  style={secondaryHandleStyle}
                  onPointerDown={(event) => startSplitDrag('secondary', event)}
                  aria-label="拖动调整下方两个分镜宽度"
                  title="拖动调整下方两个分镜宽度"
                >
                  <span />
                </button>
              </div>
              <button
                type="button"
                className="manga-resize-handle manga-resize-handle--horizontal manga-resize-handle--primary"
                style={primaryHandleStyle}
                onPointerDown={(event) => startSplitDrag('primary', event)}
                aria-label="拖动调整主画面与下方分镜高度"
                title="拖动调整主画面与下方分镜高度"
              >
                <span />
              </button>
            </>
          )}

          {mangaLayout === 'layout-3' && (
            <>
              {hero}
              <div className="manga-panel-wide-detail">
                {panelA}
              </div>
              <button
                type="button"
                className="manga-resize-handle manga-resize-handle--horizontal manga-resize-handle--primary"
                style={primaryHandleStyle}
                onPointerDown={(event) => startSplitDrag('primary', event)}
                aria-label="拖动调整主画面与底部特写高度"
                title="拖动调整主画面与底部特写高度"
              >
                <span />
              </button>
            </>
          )}

          {mangaShowSideCaption && (
            <span className="manga-side-caption">
              {mangaSideCaption || 'FRAME STUDY · ORIGINAL WORK'}
            </span>
          )}
        </div>

        <div className="illustration-manga-divider" />

        <div
          ref={frameInfoRef}
          className={`fake-frame-info illustration-manga-info frame-info--logo-${logoPosition} ${
            metadataMode === 'hidden' ? 'metadata-hidden' : ''
          }`}
        >
          {metadataMode !== 'hidden' && (
            <div
              ref={metadataCopyRef}
              className={`metadata-copy illustration-manga-metadata metadata-copy--${metadataPosition}`}
              style={metadataCopyStyle}
            >
              {showCamera && (
                <strong className="camera-name illustration-manga-title">
                  {cameraText}
                </strong>
              )}

              {showLens && lensText && (
                <span className="metadata-line illustration-manga-subtitle">
                  {lensText}
                </span>
              )}

              {showExposure && exposureText && (
                <span className="metadata-line illustration-manga-edition">
                  {exposureText}
                </span>
              )}

              {showDateLine && dateText && (
                <span className="metadata-line metadata-date illustration-manga-date">
                  {dateText}
                </span>
              )}
            </div>
          )}

          <div
            ref={logoSlotRef}
            className="logo-slot illustration-manga-logo"
            style={logoSlotStyle}
          >
            {logoContent}
          </div>
        </div>
      </div>
    </div>
  )
}
