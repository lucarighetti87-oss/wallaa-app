export default function WallaaButton3D({ status = 'connected', size = 'lg', compact = false }) {
  const normalized = status === 'weak' ? 'weak' : status === 'connected' ? 'connected' : 'disconnected';
  const cls = `wallaa-hardware-3d wallaa-hardware-image status-${normalized} size-${size}${compact ? ' compact' : ''}`;
  return (
    <div className={cls} aria-label={`Wallaa Button ${normalized}`}>
      <span className="hardware-radar ring-a" aria-hidden="true" />
      <span className="hardware-radar ring-b" aria-hidden="true" />
      <span className="hardware-radar ring-c" aria-hidden="true" />
      <span className="hardware-shadow" aria-hidden="true" />
      <img className="hardware-product-img" src="/wallaa-button.png" alt="Wallaa Button" draggable="false" />
    </div>
  );
}
