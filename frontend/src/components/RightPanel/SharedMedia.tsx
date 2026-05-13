export default function SharedMedia({ media, onShowToast }) {
  return (
    <div className="info-section">
      <div className="section-label info-title">Shared Media</div>
      <div className="media-grid">
        {media.length ? (
          <>
            {media.slice(0, 5).map((image) => (
              <div key={image} className="media-thumb">
                <img src={image} alt="Shared item" />
              </div>
            ))}
            <button type="button" className="media-more" onClick={() => onShowToast('View all media')}>
              +12
            </button>
          </>
        ) : (
          <div className="media-empty">No shared media yet</div>
        )}
      </div>
    </div>
  );
}
