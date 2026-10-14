import {useSentinelMode} from '../hooks/useSentinelMode';
// Home-local background layer, below its interactive content.
export default function SentinelHomeAura(){
 const active=useSentinelMode();
 return active?<div className="sentinel-mode-sweep" aria-hidden="true"/>:null;
}
