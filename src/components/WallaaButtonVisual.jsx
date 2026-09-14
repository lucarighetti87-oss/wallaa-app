export default function WallaaButtonVisual({ size = 'md', connected = false }) {
  return (
    <div className={`wallaa-button-visual image-product ${size} ${connected ? 'connected' : 'disconnected'}`} aria-hidden="true">
      <span className="visual-ring ring-1" />
      <span className="visual-ring ring-2" />
      <span className="visual-ring ring-3" />
      <img src="/wallaa-button.png" alt="" draggable="false" />
    </div>
  );
}
