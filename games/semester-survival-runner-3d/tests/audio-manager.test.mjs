import test from "node:test";
import assert from "node:assert/strict";
import { createAudioManager } from "../src/audio/audio-manager.js";

test("audio manager exposes independent default channel levels",()=>{
 const manager=createAudioManager({musicUrl:"/test.mp3"});
 const state=manager.getSettings();
 assert.deepEqual(state.volumes,{master:.8,music:.35,sfx:.75,ambience:.2,ui:.45});
 assert.deepEqual(state.muted,{master:false,music:false,sfx:false});
 manager.destroy();
});
test("audio settings update one channel and persist separately",()=>{
 const values=new Map();
 globalThis.localStorage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)};
 const manager=createAudioManager();
 manager.setVolume("music",.5);manager.setMuted("sfx",true);
 const saved=JSON.parse(values.get("semester-survival-audio-v1"));
 assert.equal(saved.volumes.music,.5);assert.equal(saved.volumes.sfx,.75);
 assert.equal(saved.muted.sfx,true);assert.equal(saved.muted.music,false);
 manager.destroy();delete globalThis.localStorage;
});
test("audio settings safely recover from malformed stored preferences",()=>{
 globalThis.localStorage={getItem:()=>"not-json",setItem:()=>{}};
 const manager=createAudioManager();
 assert.equal(manager.getSettings().volumes.master,.8);
 manager.destroy();delete globalThis.localStorage;
});
