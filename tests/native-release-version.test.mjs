import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

test('native synchronization replaces stale plist and project versions from the same release source',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'wallaa-native-release-'));
 try{
  fs.mkdirSync(path.join(temp,'ios/App/App'),{recursive:true});
  fs.mkdirSync(path.join(temp,'ios/App/App.xcodeproj'),{recursive:true});
  fs.writeFileSync(path.join(temp,'package.json'),JSON.stringify({version:'8.2.3',wallaaBuild:123}));
  fs.writeFileSync(path.join(temp,'ios/App/App/Info.plist'),'<plist><dict><key>CFBundleShortVersionString</key><string>4.0.72</string><key>CFBundleVersion</key><string>72</string></dict></plist>');
  fs.writeFileSync(path.join(temp,'ios/App/App.xcodeproj/project.pbxproj'),'MARKETING_VERSION = 4.0.68; CURRENT_PROJECT_VERSION = 68;');
  execFileSync(process.execPath,[fileURLToPath(new URL('../scripts/patch-native.mjs',import.meta.url))],{cwd:temp});
  const plist=fs.readFileSync(path.join(temp,'ios/App/App/Info.plist'),'utf8');
  const project=fs.readFileSync(path.join(temp,'ios/App/App.xcodeproj/project.pbxproj'),'utf8');
  assert.match(plist,/<key>CFBundleShortVersionString<\/key>\s*<string>8\.2\.3<\/string>/);
  assert.match(plist,/<key>CFBundleVersion<\/key>\s*<string>123<\/string>/);
  assert.match(project,/MARKETING_VERSION = 8\.2\.3;/);assert.match(project,/CURRENT_PROJECT_VERSION = 123;/);
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
