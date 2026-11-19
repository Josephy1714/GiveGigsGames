'use strict';
const assert=require('node:assert/strict');
require('../input-manager.js');
class FakeTarget{
 constructor(){this.handlers={};}
 addEventListener(k,fn){(this.handlers[k] ||= []).push(fn);}
 removeEventListener(k,fn){this.handlers[k]=(this.handlers[k]||[]).filter(x=>x!==fn);}
 fire(k,e){(this.handlers[k]||[]).forEach(fn=>fn(e));}
}
const target=new FakeTarget(),input=globalThis.SemesterInputManager.createInputManager(target);
const event=(key)=>({key,target:{tagName:'CANVAS'},preventDefault(){}});
target.fire('keydown',event('d'));
assert.equal(input.consume().moveX,1);
target.fire('keyup',event('d'));
target.fire('keydown',event('i'));
assert.equal(input.consume().moveY,1);
target.fire('keyup',event('i'));
target.fire('keydown',event('Shift'));
assert.equal(input.consume().sprint,true);
target.fire('keyup',event('Shift'));
target.fire('keydown',{...event(' '),code:'Space'}); // browser reports key=" " and code="Space"
const jump=input.consume();
assert.equal(jump.jumpPressed,true);
assert.equal(input.consume().jumpPressed,true);
input.setContext({dialogueOpen:true});
target.fire('keydown',event('a'));
assert.equal(input.consume().moveX,0);
input.setContext({dialogueOpen:false});
const interaction={closest:()=>({getAttribute:()=> 'talk-to-brian'})};
target.fire('pointerdown',{pointerType:'touch',pointerId:1,clientX:10,clientY:10,target:interaction});
target.fire('pointerup',{pointerId:1,clientX:12,clientY:11});
assert.equal(input.consume().interaction,'talk-to-brian');
target.fire('pointerdown',{pointerType:'touch',pointerId:2,clientX:100,clientY:100,target:{}});
target.fire('pointerup',{pointerId:2,clientX:150,clientY:102});
assert.equal(input.consume().moveX,1);
input.destroy();
console.log('input-manager tests passed');
