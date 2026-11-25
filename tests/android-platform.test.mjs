import test from 'node:test';import assert from 'node:assert/strict';
import {platformText} from '../src/platformText.mjs';
test('Android guidance uses Android device settings and leaves Apple subscription terms untouched',()=>{
 assert.equal(platformText('Impostazioni iPhone','android'),'Impostazioni Android');
 assert.equal(platformText('Impostazioni iPhone','ios'),'Impostazioni iPhone');
 assert.match(platformText('Generali → Aggiornamento app in background','android'),/Autorizzazioni/);
 assert.equal(platformText('Gestisci abbonamento Apple','android'),'Gestisci abbonamento Apple');
});
