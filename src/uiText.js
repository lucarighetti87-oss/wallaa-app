import english from './locales/ui-en.json' with {type:'json'};
import {detectDeviceLanguage,normalizeLanguage,translate,dictionaryEntries} from './i18n.js';
let language=detectDeviceLanguage();
const aliases=new Map();
for(const [key,value] of dictionaryEntries('it'))if(!aliases.has(value))aliases.set(value,key);
export function setUiLanguage(value){language=normalizeLanguage(value);if(typeof document!=='undefined')document.documentElement.lang=language;}
export function uiLocale(){return {en:'en-US',it:'it-IT',es:'es-ES',fr:'fr-FR',de:'de-DE',pt:'pt-PT'}[language];}
export function uiText(source,vars={}){
 const key=aliases.get(source);
 if(key)return translate(language,key,vars);
 const value=language==='en'?english[source]??source:source;
 return String(value).replace(/\{(\w+)\}/g,(_,name)=>vars[name]??`{${name}}`);
}
