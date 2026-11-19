const test=require('node:test');
const assert=require('node:assert/strict');
require('../weather-runtime.js');

test('weather follows a deterministic Nairobi-inspired seasonal calendar',()=>{
 const a=global.SemesterWeatherRuntime.create(),b=global.SemesterWeatherRuntime.create();
 const calendar={week:12,dayIndex:2,minuteOfDay:9*60};
 const first=a.update(calendar,'campus',1/60),second=b.update(calendar,'campus',1/60);
 assert.equal(first.season,'long-rains');
 assert.equal(first.condition,second.condition);
 assert.equal(first.district,'campus');
 assert.ok(['clear','cloudy','drizzle','rain','storm'].includes(first.condition));
});

test('weather evolves with in-game time and daylight',()=>{
 const weather=global.SemesterWeatherRuntime.create();
 const morning=weather.update({week:25,dayIndex:1,minuteOfDay:7*60},'residence',1/60);
 const night=weather.update({week:25,dayIndex:1,minuteOfDay:23*60},'residence',1/60);
 assert.ok(morning.light>night.light);
 assert.equal(night.timeOfDay,23*60);
});

test('district travel changes the local weather context',()=>{
 const weather=global.SemesterWeatherRuntime.create();
 weather.update({week:42,dayIndex:4,minuteOfDay:15*60},'campus',0.1);
 weather.setDistrict('city');
 const city=weather.update({week:42,dayIndex:4,minuteOfDay:15*60},'city',0.1);
 assert.equal(city.district,'city');
 assert.ok(city.fog>=0.08);
});

test('forecast provides three authored in-game days without network access',()=>{
 const weather=global.SemesterWeatherRuntime.create();
 const forecast=weather.forecast({week:51,dayIndex:6,minuteOfDay:12*60},'township');
 assert.equal(forecast.length,3);
 assert.equal(forecast[0].week,51);
 assert.equal(forecast[1].week,52);
 assert.equal(forecast[2].week,52);
 assert.ok(forecast.every(day=>day.morning&&day.afternoon&&day.season));
});

test('weather emits changes and rejects invalid district or disposed use',()=>{
 const events=[],weather=global.SemesterWeatherRuntime.create({onEvent:event=>events.push(event)});
 weather.update({week:1,dayIndex:0,minuteOfDay:7*60},'residence',0.1);
 weather.setDistrict('campus');
 weather.update({week:1,dayIndex:0,minuteOfDay:7*60},'campus',0.1);
 assert.ok(events.some(event=>event.type==='weather:changed'));
 assert.throws(()=>weather.setDistrict('unknown'),/Unknown weather district/);
 weather.destroy();
 assert.throws(()=>weather.update({week:1,dayIndex:0,minuteOfDay:0},'campus',0.1),/disposed/);
});
