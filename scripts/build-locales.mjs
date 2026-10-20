// English source keys are already in the app. Bundle only edited English overrides.
import fs from 'node:fs/promises';
const english=JSON.parse(await fs.readFile('src/locales/en.json','utf8'));
const overrides=Object.fromEntries(Object.entries(english).filter(([key,text])=>key!==text));
for(const [key,text] of Object.entries(overrides))if(typeof text!=='string'||!text.trim())throw Error(`Invalid English message: ${key}`);
const path='src/locales/runtime-en.json',json=JSON.stringify(overrides,null,2)+'\n';
if(await fs.readFile(path,'utf8').catch(()=>'')!==json)await fs.writeFile(path,json);
