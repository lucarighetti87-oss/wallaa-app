export default function Logo({ compact = false }) {
  return (
    <div className={`brand-mark ${compact ? 'compact' : ''}`} aria-label="Wallaa Safety">
      <img className="brand-symbol-img" src="/wallaa-app-icon.png" alt="Wallaa" />
      {!compact && (
        <span className="brand-word">
          <strong>Wallaa</strong>
          <span>Safety</span>
        </span>
      )}
    </div>
  );
}
