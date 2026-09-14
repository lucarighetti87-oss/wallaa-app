import { ShieldCheck, Sparkles } from 'lucide-react';
import WallaaButtonVisual from './WallaaButtonVisual';

export default function PremiumHeroVisual({ connected = false, t }) {
  return (
    <section className="premium-hero-visual" aria-hidden="true">
      <div className="hero-visual-aurora hero-visual-aurora-a" />
      <div className="hero-visual-aurora hero-visual-aurora-b" />
      <div className="hero-visual-grid" />
      <div className="hero-visual-ring ring-one" />
      <div className="hero-visual-ring ring-two" />
      <div className="hero-visual-ring ring-three" />
      <div className="hero-icon-plate"><img src="/wallaa-app-icon.png" alt="" /><span className="hero-icon-sheen" /></div>
      <div className="floating-button-product"><WallaaButtonVisual size="md" connected={connected} /><span className="floating-device-shadow" /></div>
      <div className="hero-floating-badge badge-protection"><ShieldCheck size={14}/><span>{t?.('hero.ready') || 'Protection ready'}</span></div>
      <div className="hero-floating-badge badge-smart"><Sparkles size={14}/><span>{t?.('hero.smart') || 'Smart alert'}</span></div>
    </section>
  );
}
