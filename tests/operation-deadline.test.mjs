import {test} from 'node:test';
import assert from 'node:assert/strict';
import {withDeadline} from '../src/services/operationDeadline.mjs';
test('a missing native callback rejects without waiting forever',async()=>{
 await assert.rejects(withDeadline(()=>new Promise(()=>{}),5,'Bluetooth unavailable'),/Bluetooth unavailable/);
});
test('completed and failed native calls retain their result',async()=>{
 assert.equal(await withDeadline(()=>Promise.resolve('ready'),100,'timeout'),'ready');
 await assert.rejects(withDeadline(()=>{throw new Error('denied');},100,'timeout'),/denied/);
});
