import type {
  ComponentProps,
} from 'react'

import { ClassicMetadataTemplate } from './ClassicMetadataTemplate'

type IllustrationGalleryTemplateProps =
  ComponentProps<
    typeof ClassicMetadataTemplate
  >

export function IllustrationGalleryTemplate({
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
}: IllustrationGalleryTemplateProps) {
  return (
    <div
      ref={previewRef}
      className={`editor-preview editor-preview--${photoOrientation} illustration-gallery-template`}
      style={previewStyle}
    >
      <div
        className="illustration-gallery-sheet"
        style={{
          padding:
            `${Math.max(
              18,
              frameSize * 1.15,
            )}px`,
        }}
      >
        <div className="illustration-gallery-index">
          I / 01
        </div>

        <div
          className={`fake-photo illustration-gallery-photo ${
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
              alt="Selected artwork"
              className="uploaded-photo"
            />
          ) : (
            <>
              <div className="fake-horizon" />
              <div className="fake-subject" />
            </>
          )}
        </div>

        <div className="illustration-gallery-rule" />

        <div
          ref={frameInfoRef}
          className={`fake-frame-info illustration-gallery-info frame-info--logo-${logoPosition} ${
            metadataMode === 'hidden'
              ? 'metadata-hidden'
              : ''
          }`}
        >
          {metadataMode !== 'hidden' && (
            <div
              ref={metadataCopyRef}
              className={`metadata-copy illustration-gallery-metadata metadata-copy--${metadataPosition}`}
              style={metadataCopyStyle}
            >
              {showCamera && (
                <strong className="camera-name">
                  {cameraText}
                </strong>
              )}

              {showLens && lensText && (
                <span className="metadata-line illustration-gallery-subtitle">
                  {lensText}
                </span>
              )}

              {showExposure && exposureText && (
                <span className="metadata-line illustration-gallery-tags">
                  {exposureText}
                </span>
              )}

              {showDateLine && dateText && (
                <span className="metadata-line metadata-date illustration-gallery-date">
                  {dateText}
                </span>
              )}
            </div>
          )}

          <div
            ref={logoSlotRef}
            className="logo-slot illustration-gallery-logo"
            style={logoSlotStyle}
          >
            {logoContent}
          </div>
        </div>
      </div>
    </div>
  )
}
