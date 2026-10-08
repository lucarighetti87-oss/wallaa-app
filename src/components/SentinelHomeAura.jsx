import {useSentinelMode} from '../hooks/useSentinelMode';
// Kept outside the animated/scrolling screen so the glow always covers the viewport.
export default function SentinelHomeAura(){
 const active=useSentinelMode();
 return active?<div className="sentinel-mode-sweep" aria-hidden="true"/>:null;
}
