import type {
  ComponentProps,
} from 'react'

import { ClassicMetadataTemplate } from './ClassicMetadataTemplate'

type FilmMatteTemplateProps =
  ComponentProps<
    typeof ClassicMetadataTemplate
  >

const FILM_MARKS = [
  '10',
  '10A',
  '10',
  '10A',
  '11',
  '11A',
]

export function FilmMatteTemplate({
  previewRef,
  frameInfoRef,
  metadataCopyRef,
  logoSlotRef,
  photoOrientation,
  previewStyle,
  photoUrl,
  photoAspectRatio,
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
}: FilmMatteTemplateProps) {
  const exposureDetail =
    showExposure && exposureText
      ? exposureText.trim()
      : ''

  const lensDetail =
    showLens && lensText
      ? lensText.trim()
      : ''

  const compactDateLine =
    showDateLine && dateText
      ? dateText.trim()
      : ''

  const secondaryCandidates = [
    exposureDetail,
    lensDetail,
  ].filter(Boolean)

  let secondaryLine = ''

  if (secondaryCandidates.length > 0) {
    const combinedPrimary = secondaryCandidates.join(' · ')

    if (compactDateLine) {
      const combinedWithDate = `${combinedPrimary} · ${compactDateLine}`

      secondaryLine = combinedWithDate.length <= 34
        ? combinedWithDate
        : combinedPrimary.length <= 26
          ? `${combinedPrimary} · ${compactDateLine}`
          : exposureDetail || lensDetail
    } else {
      secondaryLine = combinedPrimary.length <= 34
        ? combinedPrimary
        : exposureDetail || lensDetail
    }
  } else if (compactDateLine) {
    secondaryLine = compactDateLine
  }

  return (
    <div
      ref={previewRef}
      className={`editor-preview editor-preview--${photoOrientation} film-matte-template`}
      style={previewStyle}
    >
      <div className="film-matte-surface">
        <div
          className="film-matte-rail film-matte-rail--top"
          aria-hidden="true"
        >
          <div className="film-matte-perforations" />

          <div className="film-matte-frame-marks">
            {FILM_MARKS.map(
              (mark, index) => (
                <span key={`${mark}-${index}`}>
                  {mark}
                </span>
              ),
            )}
          </div>

          <div className="film-matte-end-mark film-matte-end-mark--left" />
          <div className="film-matte-end-mark film-matte-end-mark--right" />
        </div>

        <div className="film-matte-gate">
          <div
            className={`fake-photo film-matte-photo ${
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
              className="film-matte-grain"
              aria-hidden="true"
            />
          </div>
        </div>

        <div className="film-matte-rail film-matte-rail--bottom">
          <div
            className="film-matte-perforations"
            aria-hidden="true"
          />

          <div
            className="film-matte-direction-marks"
            aria-hidden="true"
          >
            <span>▶▶</span>
            <span>▶</span>
            <span>▶▶</span>
            <span>▶</span>
          </div>

          <div
            ref={frameInfoRef}
            className={`fake-frame-info film-matte-info frame-info--logo-${logoPosition} ${
              metadataMode === 'hidden'
                ? 'metadata-hidden'
                : ''
            }`}
          >
            {metadataMode !== 'hidden' && (
              <div
                ref={metadataCopyRef}
                className={`metadata-copy film-matte-metadata metadata-copy--${metadataPosition}`}
                style={metadataCopyStyle}
              >
                {showCamera && (
                  <strong className="camera-name">
                    {cameraText}
                  </strong>
                )}

                {secondaryLine && (
                  <span className="metadata-line">
                    {secondaryLine}
                  </span>
                )}
              </div>
            )}

            <div
              ref={logoSlotRef}
              className="logo-slot film-matte-logo"
              style={logoSlotStyle}
            >
              {logoContent}
            </div>
          </div>

          <div className="film-matte-edge-caption" aria-hidden="true">
            <span>PF / 35</span>
            <span>FRAME 02</span>
            <span>LOCAL PROCESS</span>
          </div>

          <div className="film-matte-end-mark film-matte-end-mark--left film-matte-end-mark--bottom" />
          <div className="film-matte-end-mark film-matte-end-mark--right film-matte-end-mark--bottom" />
        </div>
      </div>
    </div>
  )
}
