import { useMemo } from 'preact/hooks';
import { salamander } from './salamander';

const VOLUME = 1.0;

/** Midi to frequency */
export function mtof(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

interface Voice {
  osc: OscillatorNode | AudioBufferSourceNode;
  gain: GainNode;
}

const samples = new Map<number, AudioBuffer>();

export function usePiano() {
  return useMemo(() => {
    let audioCtx: AudioContext | undefined;
    let masterGain: GainNode | undefined;
    const voices = new Map<number, Voice>();

    function initAudio() {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = audioCtx.createGain();
      // Compressor avoids distortion when multiple samples play
      const compressor = audioCtx.createDynamicsCompressor();
      compressor.connect(audioCtx.destination);
      masterGain.connect(compressor);
      masterGain.gain.value = 1.0;
    }

    async function playTone(midiNote: number) {
      if (!audioCtx) {
        initAudio();
      }
      const voice = voices.get(midiNote);
      if (voice) {
        voice.osc.stop();
      }
      if (!audioCtx || !masterGain) {
        return;
      }

      let sampleKey = midiNote;
      // We only included one out of every 3 piano samples. We fill in the rest by adjusting the playback rate.
      let playbackRate = 1.0;
      if (sampleKey % 3 === 1) {
        sampleKey = sampleKey - 1;
        playbackRate = Math.pow(2, 1 / 12);
      } else if (sampleKey % 3 === 2) {
        sampleKey = sampleKey + 1;
        playbackRate = Math.pow(2, -1 / 12);
      }
      const note = salamander[sampleKey];
      if (note) {
        try {
          let sample: AudioBuffer;
          if (!samples.has(sampleKey)) {
            const response = await fetch(note);
            const buffer = await (await response.blob()).arrayBuffer();
            sample = await audioCtx.decodeAudioData(buffer);
            samples.set(sampleKey, sample);
          } else {
            sample = samples.get(sampleKey)!;
          }

          const osc = audioCtx.createBufferSource();
          osc.buffer = sample;
          osc.playbackRate.value = playbackRate;
          const gain = audioCtx.createGain();
          gain.gain.setValueAtTime(0, audioCtx.currentTime);
          gain.gain.linearRampToValueAtTime(VOLUME, audioCtx.currentTime + 0.05);
          osc.connect(gain);
          gain.connect(masterGain);
          osc.start();
          voices.set(midiNote, { osc, gain });
          return;
        } catch (e) {
          console.error('Failed to load sample', midiNote, e);
        }
      }

      // Fall back to a synth sound
      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(VOLUME, audioCtx.currentTime + 0.05);
      const osc = audioCtx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(mtof(midiNote), audioCtx.currentTime);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start();
      voices.set(midiNote, { osc, gain });
    }

    function stopTone(midiNote: number) {
      if (!audioCtx || !masterGain) {
        return;
      }
      const voice = voices.get(midiNote);
      if (voice) {
        const currentVoice = voice;
        currentVoice.gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.5);
        setTimeout(() => {
          currentVoice.osc.stop();
          currentVoice.osc.disconnect();
          currentVoice.gain.disconnect();
          if (voices.get(midiNote) === currentVoice) {
            voices.delete(midiNote);
          }
        }, 1200);
      }
    }

    return [playTone, stopTone] as const;
  }, []);
}
