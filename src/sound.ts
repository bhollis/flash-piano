// TODO: should each piano own an audio context or should they all share?
// TODO: polyphony, sampling, start on focus

import { useMemo } from 'preact/hooks';

const VOLUME = 1.0;

export function mtof(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

interface Voice {
  osc: OscillatorNode;
  gain: GainNode;
}

export function usePiano() {
  return useMemo(() => {
    let audioCtx: AudioContext | undefined;
    let masterGain: GainNode | undefined;
    const oscs = new Map<number, Voice>();

    function initAudio() {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = audioCtx.createGain();
      const compressor = audioCtx.createDynamicsCompressor();
      compressor.connect(audioCtx.destination);
      masterGain.connect(compressor);
      masterGain.gain.value = 0.8;
    }

    function playTone(midiNote: number) {
      if (!audioCtx) {
        initAudio();
      }
      const voice = oscs.get(midiNote);
      if (voice) {
        voice.osc.stop();
      }
      if (!audioCtx || !masterGain) {
        return;
      }
      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(VOLUME, audioCtx.currentTime + 0.05);
      const osc = audioCtx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(mtof(midiNote), audioCtx.currentTime);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start();
      oscs.set(midiNote, { osc, gain });
    }

    // TODO why is there a pop on release?
    function stopTone(midiNote: number) {
      if (!audioCtx || !masterGain) {
        return;
      }
      const voice = oscs.get(midiNote);
      if (voice) {
        const currentVoice = voice;
        currentVoice.gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 1);
        setTimeout(() => {
          currentVoice.osc.stop();
        }, 1200);
      }
    }

    return [playTone, stopTone] as const;
  }, []);
}
