// One-time source migration. Only explicit, reviewed UI catalog entries are changed.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {parse} from '@babel/parser';
import traverse from '@babel/traverse';
const english=JSON.parse(fs.readFileSync('src/locales/ui-en.json','utf8'));
const context=vm.createContext({});vm.runInContext(fs.readFileSync('src/i18n.js','utf8').replaceAll('export ','')+';globalThis.it=dictionaries.it;',context);
const catalog=new Set([...Object.keys(english),...Object.values(context.it)]);
const files=[];function scan(dir){for(const item of fs.readdirSync(dir,{withFileTypes:true})){const name=path.join(dir,item.name);if(item.isDirectory())scan(name);else if(name.endsWith('.jsx'))files.push(name);}}scan('src/screens');scan('src/components');files.push('src/App.jsx');
let count=0;
for(const file of files){let source=fs.readFileSync(file,'utf8');const ast=parse(source,{sourceType:'module',plugins:['jsx']});const edits=[];
 const add=(node,text,jsx)=>{if(!catalog.has(text)||/^[\w.]+$/.test(text)&&text===text.toLowerCase())return;edits.push({start:node.start,end:node.end,value:jsx?`{uiText(${JSON.stringify(text)})}`:` uiText(${JSON.stringify(text)})`});};
 traverse.default(ast,{
  JSXText(p){let text=p.node.value.replace(/\s+/g,' ').trim();if(!text)return;const raw=p.node.value;const trailing=/ $/.test(raw)&&!raw.endsWith('\n')?' ':'';const leading=/^ /.test(raw)&&!raw.includes('\n')?' ':'';if(catalog.has(text)){edits.push({start:p.node.start,end:p.node.end,value:`{${JSON.stringify(leading)} + uiText(${JSON.stringify(text)}) + ${JSON.stringify(trailing)}}`});}},
  JSXAttribute(p){if(['placeholder','aria-label','title','alt'].includes(p.node.name.name)&&p.node.value?.type==='StringLiteral')add(p.node.value,p.node.value.value,true);},
  StringLiteral(p){if(p.parent.type==='JSXAttribute'||p.parent.type==='ImportDeclaration'||p.parent.type==='BinaryExpression'||p.parent.type==='SwitchCase'||p.parent.type==='ObjectProperty'&&p.parent.key===p.node)return;if(p.parent.type==='CallExpression'&&p.parent.callee.type==='Identifier'&&['uiText','t','translate','tx'].includes(p.parent.callee.name))return;add(p.node,p.node.value,false);}
 });
 if(!edits.length)continue;edits.sort((a,b)=>b.start-a.start);for(const edit of edits)source=source.slice(0,edit.start)+edit.value+source.slice(edit.end);
 const relative=path.relative(path.dirname(file),'src/uiText.js').replaceAll('\\','/');if(!source.includes('import {uiText,uiLocale}'))source=`import {uiText,uiLocale} from '${relative.startsWith('.')?relative:'./'+relative}';\n`+source;
 // Date formatting follows the selected app language, not a fixed Italian locale.
 source=source.replaceAll("toLocaleTimeString('it-IT'","toLocaleTimeString(uiLocale()").replaceAll("toLocaleString('it-IT'","toLocaleString(uiLocale()");
 fs.writeFileSync(file,source);count+=edits.length;
}
console.log(`Migrated ${count} reviewed UI text occurrences.`);
