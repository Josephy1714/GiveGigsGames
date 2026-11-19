'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
require('../campaign-ui.js');
class Element {
  constructor(tag, doc) { this.tagName=tag; this.ownerDocument=doc; this.children=[]; this.parentNode=null; this.className=''; this.textContent=''; this.attributes={}; this.listeners={}; this.classes=new Set(); this.style={}; this.classList={add:v=>this.classes.add(v),remove:v=>this.classes.delete(v),toggle:(v,f)=>{const n=f===undefined?!this.classes.has(v):!!f;n?this.classes.add(v):this.classes.delete(v);},contains:v=>this.classes.has(v)}; }
  appendChild(c){this.children.push(c);c.parentNode=this;return c;} removeChild(c){this.children.splice(this.children.indexOf(c),1);c.parentNode=null;} get firstChild(){return this.children[0]||null;}
  setAttribute(k,v){this.attributes[k]=String(v);} addEventListener(k,f){(this.listeners[k]||=[]).push(f);} dispatch(k){(this.listeners[k]||[]).forEach(f=>f());}
}
class Document { createElement(t){return new Element(t,this);} }
function find(el, predicate){if(predicate(el))return el;for(const child of el.children){const found=find(child,predicate);if(found)return found;}return null;}
function setup(){
  const doc=new Document(), root=new Element('div',doc);
  let state={semester:1,chapter:{id:'s1-arrival',title:'A Room of Your Own',objective:'Meet Brian and settle in.'},steps:[
    {id:'meet',title:'Meet Brian',description:'Talk to your roommate.',count:0,requiredCount:1,complete:false},
    {id:'study',title:'Study twice',description:'Complete two sessions.',count:1,requiredCount:2,complete:false}
  ],completedSteps:0,totalSteps:2,campaignComplete:false};
  const runtime={getState:()=>state};
  const ui=globalThis.SemesterCampaignUI.create({root,document:doc,campaignRuntime:runtime});
  return {root,ui,set:value=>{state=value;}};
}
test('renders current chapter, objective checklist, and progress semantics',()=>{
  const h=setup();
  assert.equal(find(h.root,e=>e.className==='ss-campaign-ui__title').textContent,'A Room of Your Own');
  const meter=find(h.root,e=>e.className==='ss-campaign-ui__meter');
  assert.equal(meter.attributes['aria-valuenow'],'0');
  assert.equal(find(h.root,e=>e.className==='ss-campaign-ui__step-count').textContent,'1 of 2');
});
test('supports a collapsible objective list and updates progress',()=>{
  const h=setup();
  find(h.root,e=>e.className==='ss-campaign-ui__toggle').dispatch('click');
  assert.equal(find(h.root,e=>e.className==='ss-campaign-ui__steps'),null);
  h.set({semester:1,chapter:{id:'s1-arrival',title:'A Room of Your Own',objective:'Meet Brian.'},steps:[],completedSteps:1,totalSteps:2,campaignComplete:false});
  h.ui.render();
  assert.equal(find(h.root,e=>e.className==='ss-campaign-ui__count').textContent,'1 / 2');
});
test('destroy clears mounted UI',()=>{
  const h=setup(); h.ui.destroy(); assert.equal(h.root.children.length,0); assert.equal(h.root.classList.contains('is-active'),false);
});
