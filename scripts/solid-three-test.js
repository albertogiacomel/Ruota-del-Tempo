import assert from 'node:assert/strict';
import test from 'node:test';
import { spinTarget, indexAtPointer, SpinClock, TAU } from '../experiment/spin.js';

test('every days/months outcome matches the actual pointer after repeated spins', () => {
  for (const count of [7,12]) {
    let angle=0;
    for(let round=0;round<10;round++)for(let index=0;index<count;index++){
      const target=spinTarget(angle,index,count);
      assert.ok(target-angle>=4*TAU-1e-10);
      assert.equal(indexAtPointer(target,count),index);
      angle=target;
    }
  }
  assert.throws(()=>spinTarget(0,7,7),RangeError);
});
test('settings/visibility pause cannot skip the outcome or consume spin time', () => {
  const clock=new SpinClock({from:0,to:100,duration:1000,now:0});
  assert.equal(clock.sample(200).done,false);
  clock.pause(300);
  const frozen=clock.sample(9000);
  assert.equal(frozen.done,false);
  clock.resume(10000);
  assert.deepEqual(clock.sample(10700),{angle:100,done:true});
});
