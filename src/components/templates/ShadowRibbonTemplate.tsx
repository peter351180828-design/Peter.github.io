import type {
  ComponentProps,
} from 'react'

import { ClassicMetadataTemplate } from './ClassicMetadataTemplate'

type ShadowRibbonTemplateProps =
  ComponentProps<
    typeof ClassicMetadataTemplate
  > & {
    shadowRibbonOpacity: number
    shadowRibbonPositionY: number
  }

export function ShadowRibbonTemplate({
  previewRef,
  frameInfoRef,
  metadataCopyRef,
  logoSlotRef,
  photoOrientation,
  previewStyle,
  photoUrl,
  photoAspectRatio,
  frameSize,
  shadowRibbonOpacity,
  shadowRibbonPositionY,
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
}: ShadowRibbonTemplateProps) {
  return (
    <div
      ref={previewRef}
      className={`editor-preview editor-preview--${photoOrientation} shadow-ribbon-template`}
      style={previewStyle}
    >
      <div
        className="shadow-ribbon-surface"
        style={{
          padding:
            `${Math.max(
              14,
              frameSize * 1.35,
            )}px`,
        }}
      >
        {photoUrl && (
          <img
            className="shadow-ribbon-backdrop"
            src={photoUrl}
            alt=""
            aria-hidden="true"
          />
        )}

        <div
          className={`fake-photo shadow-ribbon-photo ${
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

          <div
            ref={frameInfoRef}
            data-glass-opacity={shadowRibbonOpacity}
            data-glass-position={shadowRibbonPositionY}
            className={`fake-frame-info shadow-ribbon-info frame-info--logo-${logoPosition} ${
              metadataMode === 'hidden'
                ? 'metadata-hidden'
                : ''
            }`}
          >
            {metadataMode !== 'hidden' && (
              <div
                ref={metadataCopyRef}
                className={`metadata-copy shadow-ribbon-metadata metadata-copy--${metadataPosition}`}
                style={metadataCopyStyle}
              >
                {showCamera && (
                  <strong className="camera-name">
                    {cameraText}
                  </strong>
                )}

                {showLens &&
                  lensText && (
                    <span className="metadata-line shadow-ribbon-lens">
                      {lensText}
                    </span>
                  )}

                {showExposure && (
                  <span className="metadata-line shadow-ribbon-exposure">
                    {exposureText}
                  </span>
                )}

                {showDateLine && (
                  <span className="metadata-line metadata-date shadow-ribbon-date">
                    {dateText}
                  </span>
                )}
              </div>
            )}

            <div
              ref={logoSlotRef}
              className="logo-slot shadow-ribbon-logo"
              style={logoSlotStyle}
            >
              {logoContent}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
