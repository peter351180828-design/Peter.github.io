import type {
  CSSProperties,
  ReactNode,
  RefObject,
} from 'react'

import type {
  LogoPosition,
  MetadataMode,
  MetadataPosition,
  PhotoOrientation,
} from '../../types/studio'

type ClassicMetadataTemplateProps = {
  previewRef:
    RefObject<HTMLDivElement | null>
  frameInfoRef:
    RefObject<HTMLDivElement | null>
  metadataCopyRef:
    RefObject<HTMLDivElement | null>
  logoSlotRef:
    RefObject<HTMLDivElement | null>

  photoOrientation: PhotoOrientation
  templateStyleIndex: number
  previewStyle: CSSProperties

  photoUrl: string | null
  photoAspectRatio: number | null

  frameSize: number
  metadataMode: MetadataMode
  logoPosition: LogoPosition
  metadataPosition: MetadataPosition

  metadataCopyStyle: CSSProperties
  logoSlotStyle: CSSProperties

  showCamera: boolean
  showLens: boolean
  showExposure: boolean
  showDateLine: boolean

  cameraText: string
  lensText: string | null
  exposureText: string
  dateText: string | null

  logoContent: ReactNode
}

export function ClassicMetadataTemplate({
  previewRef,
  frameInfoRef,
  metadataCopyRef,
  logoSlotRef,
  photoOrientation,
  templateStyleIndex,
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
}: ClassicMetadataTemplateProps) {
  return (
    <div
      ref={previewRef}
      className={`editor-preview editor-preview--${photoOrientation} template-card-style-${templateStyleIndex}`}
      style={previewStyle}
    >
      <div
        className={`fake-photo ${
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
        className={`fake-frame-info frame-info--logo-${logoPosition} ${
          metadataMode === 'hidden'
            ? 'metadata-hidden'
            : ''
        }`}
        style={{
          paddingBlock:
            `${frameSize / 3}%`,
        }}
      >
        {metadataMode !== 'hidden' && (
          <div
            ref={metadataCopyRef}
            className={`metadata-copy metadata-copy--${metadataPosition}`}
            style={metadataCopyStyle}
          >
            {showCamera && (
              <strong className="camera-name">
                {cameraText}
              </strong>
            )}

            {showLens && lensText && (
              <span className="metadata-line">
                {lensText}
              </span>
            )}

            {showExposure && (
              <span className="metadata-line">
                {exposureText}
              </span>
            )}

            {showDateLine && (
              <span className="metadata-line metadata-date">
                {dateText}
              </span>
            )}
          </div>
        )}

        <div
          ref={logoSlotRef}
          className="logo-slot"
          style={logoSlotStyle}
        >
          {logoContent}
        </div>
      </div>
    </div>
  )
}
