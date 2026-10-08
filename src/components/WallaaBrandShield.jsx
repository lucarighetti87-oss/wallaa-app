import {useSentinelMode} from '../hooks/useSentinelMode';
export default function WallaaBrandShield({alt='Wallaa',...props}){
 const sentinelActive=useSentinelMode();
 return <img {...props} src={sentinelActive?'/sentinel-shield.png':'/wallaa-app-icon.png'} alt={alt} data-wallaa-brand={sentinelActive?'sentinel':'wallaa'}/>;
}
