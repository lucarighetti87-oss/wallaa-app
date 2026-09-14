import { Activity, Home, Map, UserRound } from 'lucide-react';

const items = [
  ['home','Home',Home],
  ['map','Mappa',Map],
  ['activity','Attività',Activity],
  ['settings','Profilo',UserRound]
];

export default function V4BottomNav({ active, onChange }) {
  return <nav className="aa-bottom-nav aa-bottom-nav-v35 aa-bottom-nav-v36" aria-label="Navigazione principale">
    {items.map(([id,label,Icon])=><button type="button" key={id} className={active===id?'active':''} onClick={()=>onChange(id)}><Icon size={22}/><span>{label}</span></button>)}
  </nav>;
}
