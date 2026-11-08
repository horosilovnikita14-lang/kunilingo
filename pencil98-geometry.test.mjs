import test from 'node:test';
import assert from 'node:assert/strict';
import {distanceToSegment,touchesStroke,pathForPoints} from './app/practice98-pencil.js';

test('eraser hits the middle of a long stroke between sampled vertices',()=>{
  const points=[{x:0,y:0},{x:160,y:0}];
  assert.equal(touchesStroke(points,{x:80,y:8},9),true);
  assert.equal(touchesStroke(points,{x:80,y:10},9),false);
  assert.equal(touchesStroke(points,{x:80,y:9},9),true);
});

test('an eraser never erases across the invisible gap created by a line wrap',()=>{
  const points=[{x:0,y:0},{x:160,y:50,breakBefore:true},{x:200,y:50}];
  assert.equal(touchesStroke(points,{x:80,y:25},5),false);
  assert.equal(touchesStroke(points,{x:180,y:50},5),true);
  assert.equal(touchesStroke(points,{x:160,y:50},5),true);
});

test('distance clamps to the endpoints and handles a stationary pencil dot',()=>{
  assert.equal(distanceToSegment({x:50,y:3},{x:0,y:0},{x:100,y:0}),3);
  assert.equal(distanceToSegment({x:103,y:4},{x:0,y:0},{x:100,y:0}),5);
  assert.equal(distanceToSegment({x:-3,y:4},{x:0,y:0},{x:100,y:0}),5);
  assert.equal(distanceToSegment({x:3,y:4},{x:0,y:0},{x:0,y:0}),5);
  assert.equal(touchesStroke([{x:10,y:10}],{x:13,y:14},5),true);
  assert.equal(touchesStroke([{x:10,y:10},{x:10,y:10}],{x:13,y:14},4),false);
  assert.equal(touchesStroke([],{x:0,y:0}),false);
});

test('wrapped pencil paths start a fresh subpath rather than drawing a diagonal',()=>{
  const path=pathForPoints([{x:10,y:12},{x:30,y:12},{x:4,y:40,breakBefore:true},{x:20,y:40}]);
  assert.equal(path,'M10.00 12.00 L30.00 12.00 M4.00 40.00 L20.00 40.00');
  assert.equal((path.match(/M/g)||[]).length,2);
  assert.equal(pathForPoints([]),'');
});

test('normal projected coordinates produce finite paths at two decimal precision',()=>{
  const path=pathForPoints([{x:-0.125,y:4/3},{x:1234.5678,y:1e-9},{x:0,y:-12.3456}]);
  assert.equal(path,'M-0.13 1.33 L1234.57 0.00 L0.00 -12.35');
  assert.doesNotMatch(path,/NaN|Infinity|undefined/);
  for(const coordinate of path.replace(/[ML]/g,'').trim().split(/\s+/))assert.match(coordinate,/^-?\d+\.\d{2}$/);
});
