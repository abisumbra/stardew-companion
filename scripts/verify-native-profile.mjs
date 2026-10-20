// Optional private local QA: validate the ignored scanner output without exposing player data.
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {createServer}from 'vite';
const server=await createServer({logLevel:'error'});
try{
 const {ScanSchema}=await server.ssrLoadModule('/src/domain/models.ts');
 const snapshot=ScanSchema.parse(JSON.parse((await fs.readFile('artifacts/save-0.10.local.json','utf8')).replace(/^\uFEFF/,'')));
 let containers=0;
 for(const save of snapshot.saves){
   assert.equal(crypto.createHash('sha256').update(await fs.readFile(save.path)).digest('hex'),save.fingerprint,'An original save changed since the scan');
   const records=save.containers??[];assert.equal(new Set(records.map(c=>c.id)).size,records.length,'Container identities must be unique');containers+=records.length;
 }
 console.log(JSON.stringify({validatedSaves:snapshot.saves.length,containers,originalSaveFingerprintsUnchanged:true,issues:snapshot.issues.length}));
}finally{await server.close();}
