// TODO: should each piano own an audio context or should they all share?
// TODO: polyphony, sampling, start on focus

import { useMemo } from 'preact/hooks';

const VOLUME = 1.0;

export function mtof(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function usePiano() {
  return useMemo(() => {
    let audioCtx: AudioContext | undefined;
    let gainNode: GainNode | undefined;
    let osc: OscillatorNode | undefined;

    function initAudio() {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      gainNode = audioCtx.createGain();
      gainNode.connect(audioCtx.destination);
      gainNode.gain.value = VOLUME;
    }

    function playTone(midiNote: number) {
      if (!audioCtx || !gainNode) {
        initAudio();
      }
      if (osc) {
        osc.stop();
      }
      if (!audioCtx || !gainNode) {
        return;
      }
      gainNode.gain.cancelScheduledValues(audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(VOLUME, audioCtx.currentTime + 0.05);
      osc = audioCtx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = mtof(midiNote);
      osc.connect(gainNode);
      osc.start();
    }

    function stopTone() {
      if (!audioCtx || !gainNode) {
        return;
      }
      if (osc) {
        const currentOsc = osc;
        gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 1);
        setTimeout(() => {
          currentOsc.stop();
          if (osc === currentOsc) {
            osc = undefined;
          }
        }, 1000);
      }
    }

    return [playTone, stopTone] as const;
  }, []);
}
