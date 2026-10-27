/**
 * Stättenwerk 03: Der unabhängige HTML-Versuch muss tatsächlich ausführbares
 * JavaScript enthalten. Der Test baut keinen Browser nach – prüft aber Syntax,
 * Start, Zeichenbefehle, Wegpunkt-Berührung und Gebäudegeste mit einer
 * minimalen Canvas-Sonde. Kein Fremdnetz und keine zusätzlichen Pakete.
 */
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Script, createContext } from 'node:vm';
import { fileURLToPath } from 'node:url';

const datei = join(fileURLToPath(new URL('..', import.meta.url)),
  'entwurf/staettenwerk/demo-03.html');
const html=readFileSync(datei,'utf8');
const match=html.match(/<script>([\s\S]*?)<\/script>/i);
assert.ok(match,'Das Skript fehlt im Prototyp.');
const programm=new Script(match[1],{filename:'staettenwerk-demo-03.js'});

let gezeichnet=0;
const ereignisse={};
const elemente=new Map();
const leinwand={
  width:1200,height:860,classList:{add(){},remove(){}},
  getBoundingClientRect(){return {left:0,top:0,width:1200,height:860};},
  setPointerCapture(){},
  addEventListener(name,fn){ereignisse[name]=fn;},
  getContext(){return ctx;},
};
const gradient={addColorStop(){}};
const ctx=new Proxy({},{
  get(obj,p){
    if(p==='createLinearGradient'||p==='createRadialGradient')return ()=>gradient;
    if(p==='drawImage')return (...args)=>{
      assert.ok(args.length>=5,'Bildquelle oder Abmessungen fehlen');
      gezeichnet++;
    };
    if(p==='fillRect')return (...args)=>{
      assert.ok(args.every(Number.isFinite),'Ungültiges Rechteck');
      gezeichnet++;
    };
    if(typeof p==='string' && typeof obj[p]==='undefined')return ()=>{};
    return obj[p];
  },
  set(obj,p,value){obj[p]=value;return true;}
});
const button=(id)=>{
  if(!elemente.has(id))elemente.set(id,{textContent:'',onclick:null});
  return elemente.get(id);
};
const dokument={
  hidden:false,
  getElementById(id){return id==='world'?leinwand:button(id);},
  addEventListener(name,fn){ereignisse['document:'+name]=fn;},
};
class TestBild{
  naturalWidth=320;complete=true;
  set src(v){this._src=v;} get src(){return this._src;}
}
let naechstesBild=null;
const sandbox=createContext({
  document:dokument, Image:TestBild,
  requestAnimationFrame(fn){naechstesBild=fn;return 1;},
  Math, console,
});
programm.runInContext(sandbox,{timeout:4000});
assert.ok(typeof naechstesBild==='function','Es fehlt die Animationsschleife.');
assert.ok(gezeichnet>0,'Beim Start wurde nichts gezeichnet.');
let zeit=1000;
for(let i=0;i<70;i++){const fn=naechstesBild;naechstesBild=null;fn(zeit);zeit+=34;}
assert.ok(gezeichnet>100,'Die Szene rendert nicht fortlaufend.');
// Auf freien Boden tippen: Ziel setzen, ohne ein Haus zu ziehen.
ereignisse.pointerdown({clientX:510,clientY:485,pointerId:1});
assert.match(button('status').textContent,/Figur geht/);
assert.match(button('patrol').textContent,/aus/);
for(let i=0;i<30;i++){const fn=naechstesBild;naechstesBild=null;fn(zeit);zeit+=34;}
assert.ok(gezeichnet>300,'Nach dem Fingertipp wird nicht mehr gezeichnet.');
// Tippen auf ein Haus: unabhängige Drag-Geste bleibt möglich.
ereignisse.pointerdown({clientX:434,clientY:350,pointerId:2});
assert.match(button('status').textContent,/Haus verschieben/);
ereignisse.pointermove({clientX:445,clientY:352,pointerId:2});
ereignisse.pointerup({pointerId:2});
assert.ok(typeof button('forest').onclick==='function');
assert.ok(typeof button('patrol').onclick==='function');
console.log('  ✓ Figur animiert, Wegpunkt funktioniert, Haus bleibt ziehbar.');
