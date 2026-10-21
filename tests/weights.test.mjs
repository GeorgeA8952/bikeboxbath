import test from 'node:test';import assert from 'node:assert/strict';import {packedWeight} from '../dist/airlines.js';
test('case weight counts towards the full purchased allowance',()=>assert.deepEqual(packedWeight(13.5,8.5,1,23),{total:23,remaining:0,over:false}));
test('reports overweight without treating remaining capacity as negative allowance',()=>assert.deepEqual(packedWeight(13.5,10,1,23),{total:24.5,remaining:-1.5,over:true}));
test('larger bicycle allowances and decimal packing weights',()=>{assert.deepEqual(packedWeight(13.5,9,0.6,30),{total:23.1,remaining:6.9,over:false});assert.equal(packedWeight(13.5,9,0.5,32).remaining,9)});
test('invalid inputs and negative weights are rejected',()=>{assert.throws(()=>packedWeight(13.5,'bad',1,23));assert.throws(()=>packedWeight(13.5,-1,1,23));assert.throws(()=>packedWeight(13.5,8,1,0))});
