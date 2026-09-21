import {
  useEffect,
  useState,
  type ComponentProps,
} from 'react'

import {
  DEFAULT_PHOTO_PALETTE,
  extractDominantColors,
} from '../../utils/colors'
import { ClassicMetadataTemplate } from './ClassicMetadataTemplate'

type ColorPaletteTemplateProps =
  ComponentProps<
    typeof ClassicMetadataTemplate
  >

export function ColorPaletteTemplate({
  previewRef,
  frameInfoRef,
  metadataCopyRef,
  logoSlotRef,
  photoOrientation,
  previewStyle,
  photoUrl,
  photoAspectRatio,
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
}: ColorPaletteTemplateProps) {
  const [palette, setPalette] =
    useState<string[]>(
      DEFAULT_PHOTO_PALETTE,
    )

  const [isSampling, setIsSampling] =
    useState(false)

  useEffect(() => {
    let cancelled = false

    if (!photoUrl) {
      setPalette(
        DEFAULT_PHOTO_PALETTE,
      )
      setIsSampling(false)

      return () => {
        cancelled = true
      }
    }

    setIsSampling(true)

    void extractDominantColors(
      photoUrl,
      5,
    )
      .then((colors) => {
        if (!cancelled) {
          setPalette(colors)
        }
      })
      .catch((error) => {
        console.error(
          'Palette extraction failed:',
          error,
        )

        if (!cancelled) {
          setPalette(
            DEFAULT_PHOTO_PALETTE,
          )
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsSampling(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [photoUrl])

  const showFullDetails =
    metadataMode === 'full'

  const showExposureOnly =
    metadataMode === 'exposure'

  return (
    <div
      ref={previewRef}
      className={`editor-preview editor-preview--${photoOrientation} color-palette-template`}
      style={previewStyle}
    >
      <div
        className={`fake-photo color-palette-photo ${
          photoUrl
            ? 'fake-photo--loaded'
            : ''
        }`}
        style={
          photoUrl && photoAspectRatio
            ? {
                aspectRatio:
                  photoAspectRatio,
              }
            : undefined
        }
      >
        {photoUrl ? (
          <img
            src={photoUrl}
            alt="Selected photograph"
            className="uploaded-photo"
          />
        ) : (
          <>
            <div className="fake-horizon" />
            <div className="fake-subject" />
          </>
        )}
      </div>

      <div
        ref={frameInfoRef}
        className={`fake-frame-info color-palette-info frame-info--logo-${logoPosition} ${
          metadataMode === 'hidden'
            ? 'metadata-hidden'
            : ''
        }`}
        style={{
          paddingBlock:
            `${Math.max(
              2.5,
              frameSize / 5,
            )}%`,
        }}
      >
        {metadataMode !== 'hidden' && (
          <div
            ref={metadataCopyRef}
            className={`metadata-copy color-palette-metadata metadata-copy--${metadataPosition} ${
              isSampling
                ? 'color-palette-metadata--sampling'
                : ''
            }`}
            style={metadataCopyStyle}
          >
            {showCamera && (
              <strong className="camera-name">
                {cameraText}
              </strong>
            )}

            {showFullDetails &&
              showLens &&
              lensText && (
                <span className="metadata-line">
                  {lensText}
                </span>
              )}

            {(showFullDetails ||
              showExposureOnly) &&
              showExposure && (
                <span className="metadata-line">
                  {exposureText}
                </span>
              )}

            {showFullDetails &&
              showDateLine && (
                <span className="metadata-line metadata-date">
                  {dateText}
                </span>
              )}

            <div
              className="color-palette-swatches"
              aria-label="Extracted color palette"
            >
              {palette.map(
                (color, index) => (
                  <span
                    className="color-palette-dot"
                    key={`${color}-${index}`}
                    style={{
                      backgroundColor:
                        color,
                    }}
                    aria-hidden="true"
                  />
                ),
              )}
            </div>
          </div>
        )}

        <div
          ref={logoSlotRef}
          className="logo-slot color-palette-logo"
          style={logoSlotStyle}
        >
          {logoContent}
        </div>
      </div>
    </div>
  )
}
