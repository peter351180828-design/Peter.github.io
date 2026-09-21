import type { ComponentProps } from 'react'
import { ClassicMetadataTemplate } from './ClassicMetadataTemplate'

type Props = ComponentProps<typeof ClassicMetadataTemplate>

export function IllustrationCollectorCardTemplate({
  previewRef, frameInfoRef, metadataCopyRef, logoSlotRef,
  photoOrientation, previewStyle, photoUrl, frameSize,
  metadataMode, logoPosition, metadataPosition,
  metadataCopyStyle, logoSlotStyle,
  showCamera, showLens, showExposure, showDateLine,
  cameraText, lensText, exposureText, dateText, logoContent,
}: Props) {
  return (
    <div ref={previewRef} className={`editor-preview editor-preview--${photoOrientation} illustration-card-template`} style={previewStyle}>
      <div className="illustration-card-shell" style={{ padding: `${Math.max(14, frameSize * .82)}px` }}>
        <div className="illustration-card-top"><span>ARCHIVE / 003</span><span>LIMITED STUDY</span></div>
        <div className="illustration-card-photo-frame">
          <div className="illustration-card-photo">
            {photoUrl ? <img src={photoUrl} alt="Selected artwork" className="collector-card-image" /> : <><span className="collector-fake-bg"/><span className="collector-fake-subject"/></>}
          </div>
          <span className="illustration-card-badge">03</span>
          <span className="illustration-card-serial">A-03 / ORIGINAL ART</span>
        </div>
        <div ref={frameInfoRef} className={`fake-frame-info illustration-card-info frame-info--logo-${logoPosition} ${metadataMode==='hidden'?'metadata-hidden':''}`}>
          {metadataMode !== 'hidden' && (
            <div ref={metadataCopyRef} className={`metadata-copy illustration-card-metadata metadata-copy--${metadataPosition}`} style={metadataCopyStyle}>
              {showCamera && <strong className="camera-name illustration-card-title">{cameraText}</strong>}
              {showLens && lensText && <span className="metadata-line illustration-card-subtitle">{lensText}</span>}
              {showExposure && exposureText && <span className="metadata-line illustration-card-edition">{exposureText}</span>}
              {showDateLine && dateText && <span className="metadata-line metadata-date illustration-card-date">{dateText}</span>}
            </div>
          )}
          <div ref={logoSlotRef} className="logo-slot illustration-card-logo" style={logoSlotStyle}>{logoContent}</div>
        </div>
        <div className="illustration-card-footer"><span>CHARACTER ARCHIVE</span><span>FRAME / ART STUDY</span></div>
      </div>
    </div>
  )
}
