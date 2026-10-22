export function platformText(value,platform){
 if(platform!=='android')return value;
 let text=String(value);
 if(text.includes('Generali → Aggiornamento app in background'))return 'Per la protezione a schermo bloccato controlla Impostazioni → App → Wallaa → Autorizzazioni. Consenti la posizione sempre e i dispositivi nelle vicinanze; verifica anche le limitazioni della batteria.';
 return text.replaceAll('iPhone','Android').replaceAll('iOS','Android').replaceAll('iPad','tablet Android');
}
