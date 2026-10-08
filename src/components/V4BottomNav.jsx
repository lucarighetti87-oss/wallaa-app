import {uiText,uiLocale} from '../uiText.js';
import { Home, Map, MessageCircle, UserRound } from 'lucide-react';



export default function V4BottomNav({ active, onChange }) {
const items = [
  ['home',uiText("Home"),Home],
  ['map',uiText("Mappa"),Map],
  ['messages',uiText("Messaggi"),MessageCircle],
  ['settings',uiText("Profilo"),UserRound]
];
  return (
    <nav
      className="aa-bottom-nav aa-bottom-nav-v35 aa-bottom-nav-v36"
      aria-label={uiText("Navigazione principale")}
    >
      {items.map(([id,label,Icon]) => (
        <button
          type="button"
          key={id}
          className={active === id ? 'active' : ''}
          onClick={() => onChange(id)}
        >
          <Icon size={22}/>
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
