// Motion uses elapsed scene time. Pausing or hiding the page never advances it.
export const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
export function ease(v){v=clamp(v);return v*v*v*(v*(v*6-15)+10);}

export const BLINK_DURATION=.22;
export function eyelid(elapsed){
 if(elapsed<0||elapsed>=BLINK_DURATION)return 0;
 if(elapsed<.055)return ease(elapsed/.055);
 if(elapsed<.085)return 1;
 return 1-ease((elapsed-.085)/.135);
}

// Unlike a sine pulse, the endpoints also have zero velocity.
export function gesture(elapsed,duration){
 if(elapsed<=0||elapsed>=duration)return 0;
 const phase=elapsed/duration;
 return phase<.35?ease(phase/.35):1-ease((phase-.35)/.65);
}

function settle(position,velocity,target,dt,rate){
 const offset=position-target,impulse=velocity+rate*offset,decay=Math.exp(-rate*dt);
 return [target+(offset+impulse*dt)*decay,(velocity-rate*impulse*dt)*decay];
}

export function createCharacterMotion(random=Math.random){
 let nextBlink=1.7,blinkStart=-10,secondBlink=false;
 let nextPause=12+random()*6,pauseStart=-10,pauseUntil=-1;
 let thinking=0,thinkingVelocity=0,writing=1,writingVelocity=0,penTime=0;
 // 0: the painted downward reading pose; 1: the original raised gaze.
 // Change the eye drawing only while the lids are closed, never by sliding
 // or cross-fading two visible irises across each other.
 let gaze=0;
 let finished=false;
 // A word consists of several short wrist strokes. Word and phrase gaps are
 // timed independently of the stroke phase, which is never reset mid-motion.
 let writingClock=0,wordActive=true,wordUntil=.9+random(),wordTempo=.84+random()*.24;
 let wordsInPhrase=0,phraseLength=3+Math.floor(random()*3),phraseBreak=false;
 return {
  finishWriting(time){if(!finished){finished=true;this.pause(time,5.2);}},
  pause(time,duration=4.8){
   if(time>=pauseUntil)pauseStart=time;
   pauseUntil=Math.max(pauseUntil,time+Math.max(3.3,duration));
   nextPause=pauseUntil+18+random()*12;
   // Prepare a fresh word for the return without changing the held wrist pose.
   wordActive=true;phraseBreak=false;wordsInPhrase=0;
   wordUntil=writingClock+.9+random();
  },
  step(time,dt,{transfer=false,authored=false}={}){
   if(dt>0&&time>=nextPause&&!transfer)this.pause(time,4.2+random()*1.5);
   const resting=time<pauseUntil;
   const lookingAway=resting&&time>=pauseStart+.5&&time<pauseUntil-1.35;
   const desiredGaze=Number(lookingAway);
   if(dt>0){
    let blinkAge=time-blinkStart;
    if(gaze!==desiredGaze){
     // Reuse an ongoing blink if it has not opened yet. Otherwise leave a
     // short gap before the deliberate blink, including after repeated clicks.
     if(blinkAge>=BLINK_DURATION+.18){
      blinkStart=time;blinkAge=0;
      nextBlink=time+3.5+random()*4.2;secondBlink=false;
     }
     // The .05 s maximum scene step can cross the short fully closed hold;
     // this window still hides at least 98% of the open eye at that step size.
     if(blinkAge>=.055&&blinkAge<.105){
      gaze=desiredGaze;
      nextBlink=time+3.5+random()*4.2;secondBlink=false;
     }
    }else if(time>=nextBlink){
     blinkStart=time;
     if(!secondBlink&&random()<.065){nextBlink=time+.32;secondBlink=true;}
     else{nextBlink=time+3.5+random()*4.2;secondBlink=false;}
    }
   }
   if(dt>0&&!resting&&!finished&&!transfer&&!authored){
    writingClock+=dt;
    while(writingClock>=wordUntil){
     if(wordActive){
      wordActive=false;wordsInPhrase++;
      phraseBreak=wordsInPhrase>=phraseLength;
      wordUntil+=phraseBreak?.72+random()*.45:.25+random()*.22;
     }else{
      if(phraseBreak){wordsInPhrase=0;phraseLength=3+Math.floor(random()*3);}
      wordActive=true;phraseBreak=false;wordTempo=.84+random()*.24;
      wordUntil+=.85+random()*1.1;
     }
    }
   }
   // First stop the pen, then lift the head. Return to the page before the next
   // word. The support at the cheek and the wrist stay fixed throughout.
   // Critically damped responses retain position AND velocity at action changes.
   // In particular, a new rest never snaps the head into a different pose.
   [thinking,thinkingVelocity]=settle(thinking,thinkingVelocity,Number(lookingAway&&gaze===1),dt,4.2);
   // The authored pen path already contains letter and word gaps. Adding the
   // old random word stops on top made the whole arm repeatedly brake mid-word.
   const writingTempo=authored?.96+.02*Math.sin(time*.35):wordActive?wordTempo:0;
   [writing,writingVelocity]=settle(writing,writingVelocity,!finished&&!resting&&gaze===0?(transfer?1:writingTempo):0,dt,16);
   penTime+=dt*clamp(writing,0,1.1);
   const activity=resting?(lookingAway?'thinking':time<pauseStart+.5?'settling':'returning'):finished?'reading':transfer?'moving':wordActive?'writing':phraseBreak?'phrase-pause':'word-pause';
   return {blink:eyelid(time-blinkStart),thinking:clamp(thinking),writing:clamp(writing),penTime,gaze,resting,activity,finished};
  }
 };
}
