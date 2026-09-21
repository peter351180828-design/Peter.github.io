import type {
  ComponentProps,
} from 'react'

import { ClassicMetadataTemplate } from './ClassicMetadataTemplate'

type IllustrationPosterTemplateProps =
  ComponentProps<
    typeof ClassicMetadataTemplate
  >

export function IllustrationPosterTemplate({
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
}: IllustrationPosterTemplateProps) {
  return (
    <div
      ref={previewRef}
      className={`editor-preview editor-preview--${photoOrientation} illustration-poster-template`}
      style={previewStyle}
    >
      <div
        className="illustration-poster-stage"
        style={{
          padding: `${Math.max(
            4,
            frameSize * 0.45,
          )}px`,
        }}
      >
        <div
          className={`fake-photo illustration-poster-photo ${
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

          <div
            className="illustration-poster-topline"
            aria-hidden="true"
          >
            <span>ILLUSTRATION / POSTER</span>
            <span>I / 02</span>
          </div>

          <div
            className="illustration-poster-side-mark"
            aria-hidden="true"
          >
            VISUAL STUDY · ORIGINAL WORK
          </div>

          <div
            ref={frameInfoRef}
            className={`fake-frame-info illustration-poster-info frame-info--logo-${logoPosition} ${
              metadataMode === 'hidden'
                ? 'metadata-hidden'
                : ''
            }`}
          >
            {metadataMode !== 'hidden' && (
              <div
                ref={metadataCopyRef}
                className={`metadata-copy illustration-poster-metadata metadata-copy--${metadataPosition}`}
                style={metadataCopyStyle}
              >
                {showCamera && (
                  <strong className="camera-name illustration-poster-title">
                    {cameraText}
                  </strong>
                )}

                {showLens && lensText && (
                  <span className="metadata-line illustration-poster-subtitle">
                    {lensText}
                  </span>
                )}

                {showExposure && exposureText && (
                  <span className="metadata-line illustration-poster-edition">
                    {exposureText}
                  </span>
                )}

                {showDateLine && dateText && (
                  <span className="metadata-line metadata-date illustration-poster-date">
                    {dateText}
                  </span>
                )}
              </div>
            )}

            <div
              ref={logoSlotRef}
              className="logo-slot illustration-poster-logo"
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
