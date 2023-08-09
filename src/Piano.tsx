import { computed, signal, useSignal, useSignalEffect } from '@preact/signals';
import './Piano.css';

// TODO: start with C
const notes = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'];
const noteFlat = ['A', 'Bb', 'B', 'C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab'];
interface PianoKeyData {
  // TODO: note name including sharp
  // TODO: note indexes?
  names: string[];
  /** Note name including octave and accidental */
  fullNote: string;
  /** Sharp-oriented note name, without octave */
  note: string;
  sharp: boolean;
  octave: number;
  // TODO: use midi note more places
  midiNote: number;
}
const keyboardKeys = ['a', 'w', 's', 'e', 'd', 'f', 't', 'g', 'y', 'h', 'u', 'j', 'k'];
let localizedKeyboardKeys = keyboardKeys;
if (navigator.keyboard) {
  const keyboard = navigator.keyboard;
  keyboard.getLayoutMap().then((keyboardLayoutMap) => {
    localizedKeyboardKeys = keyboardKeys.map((k) => keyboardLayoutMap.get(`Key${k.toUpperCase()}`));
    console.log({ keyboardKeys, localizedKeyboardKeys });
  });
}

const keys: PianoKeyData[] = [];

// Assumes the keyboard starts with A0
for (let i = 0; i < 88; i++) {
  const note = notes[i % notes.length];
  const sharp = note.endsWith('#');
  const octave = Math.floor(i / 12) + 1;
  keys.push({
    fullNote: `${note}${octave}`,
    note,
    names: [...new Set([note, noteFlat[i % notes.length]])],
    sharp,
    octave,
    midiNote: i + 21,
  });
}

function keyFromKeyboardEvent(e: KeyboardEvent, currentOctave: number) {
  // Get the key given an english language keycode
  const keyName = e.code[e.code.length - 1].toLowerCase();
  const index = keyboardKeys.indexOf(keyName);
  if (index >= 0) {
    // Offset the index so we start on C, not A
    const noteIndex = index + 3;
    // Allow the keys to wrap to the next octave
    const octave = currentOctave + Math.floor(noteIndex / notes.length);
    const noteName = notes[noteIndex % notes.length];
    const pianoKey = keys.find((k) => k.octave === octave && k.note === noteName);
    return pianoKey;
  }
}

function findKeyboardKey(pianoKey: PianoKeyData, currentOctave: number) {
  const offset = pianoKey.octave - currentOctave;
  const keyIndex = notes.indexOf(pianoKey.note) - 3 + offset * notes.length;
  return localizedKeyboardKeys[keyIndex];
}

// TODO: connect/disconnect midi on page visibility / focus
// TODO: probably attach to the actual piano

const midi = signal<MIDIAccess | undefined>(undefined);
let triedMidi = false;
async function getMidi() {
  if (!triedMidi) {
    triedMidi = true;
    navigator.requestMIDIAccess().then(
      (midiAccess) => {
        midi.value = midiAccess;
      },
      () => {
        console.log('No midi');
      },
    );
  }
}

const midiDevices = computed(() => {
  const names: string[] = [];
  for (const input of midi.value?.inputs.values() ?? []) {
    names.push(input.name ?? 'Unknown');
  }
  return names;
});

// TODO: should each piano own an audio context or should they all share?

function makeAudio() {
  const noteFreq: { [key: string]: number }[] = [];
  for (let i = 0; i < 9; i++) {
    noteFreq[i] = {};
  }

  // TODO: is there a formula? or, just use midi numbers
  noteFreq[0].A = 27.5;
  noteFreq[0]['A#'] = 29.135235094880619;
  noteFreq[0].B = 30.867706328507756;

  noteFreq[1].C = 32.703195662574829;
  noteFreq[1]['C#'] = 34.647828872109012;
  noteFreq[1].D = 36.708095989675945;
  noteFreq[1]['D#'] = 38.890872965260113;
  noteFreq[1].E = 41.203444614108741;
  noteFreq[1].F = 43.653528929125485;
  noteFreq[1]['F#'] = 46.249302838954299;
  noteFreq[1].G = 48.999429497718661;
  noteFreq[1]['G#'] = 51.913087197493142;
  noteFreq[1].A = 55.0;
  noteFreq[1]['A#'] = 58.270470189761239;
  noteFreq[1].B = 61.735412657015513;
  // …

  noteFreq[2].C = 65.406391325149658;
  noteFreq[2]['C#'] = 69.295657744218024;
  noteFreq[2].D = 73.41619197935189;
  noteFreq[2]['D#'] = 77.781745930520227;
  noteFreq[2].E = 82.406889228217482;
  noteFreq[2].F = 87.307057858250971;
  noteFreq[2]['F#'] = 92.498605677908599;
  noteFreq[2].G = 97.998858995437323;
  noteFreq[2]['G#'] = 103.826174394986284;
  noteFreq[2].A = 110.0;
  noteFreq[2]['A#'] = 116.540940379522479;
  noteFreq[2].B = 123.470825314031027;

  noteFreq[3].C = 130.812782650299317;
  noteFreq[3]['C#'] = 138.591315488436048;
  noteFreq[3].D = 146.83238395870378;
  noteFreq[3]['D#'] = 155.563491861040455;
  noteFreq[3].E = 164.813778456434964;
  noteFreq[3].F = 174.614115716501942;
  noteFreq[3]['F#'] = 184.997211355817199;
  noteFreq[3].G = 195.997717990874647;
  noteFreq[3]['G#'] = 207.652348789972569;
  noteFreq[3].A = 220.0;
  noteFreq[3]['A#'] = 233.081880759044958;
  noteFreq[3].B = 246.941650628062055;

  noteFreq[4].C = 261.625565300598634;
  noteFreq[4]['C#'] = 277.182630976872096;
  noteFreq[4].D = 293.66476791740756;
  noteFreq[4]['D#'] = 311.12698372208091;
  noteFreq[4].E = 329.627556912869929;
  noteFreq[4].F = 349.228231433003884;
  noteFreq[4]['F#'] = 369.994422711634398;
  noteFreq[4].G = 391.995435981749294;
  noteFreq[4]['G#'] = 415.304697579945138;
  noteFreq[4].A = 440.0;
  noteFreq[4]['A#'] = 466.163761518089916;
  noteFreq[4].B = 493.883301256124111;

  noteFreq[5].C = 523.251130601197269;
  noteFreq[5]['C#'] = 554.365261953744192;
  noteFreq[5].D = 587.32953583481512;
  noteFreq[5]['D#'] = 622.253967444161821;
  noteFreq[5].E = 659.255113825739859;
  noteFreq[5].F = 698.456462866007768;
  noteFreq[5]['F#'] = 739.988845423268797;
  noteFreq[5].G = 783.990871963498588;
  noteFreq[5]['G#'] = 830.609395159890277;
  noteFreq[5].A = 880.0;
  noteFreq[5]['A#'] = 932.327523036179832;
  noteFreq[5].B = 987.766602512248223;

  noteFreq[6].C = 1046.502261202394538;
  noteFreq[6]['C#'] = 1108.730523907488384;
  noteFreq[6].D = 1174.659071669630241;
  noteFreq[6]['D#'] = 1244.507934888323642;
  noteFreq[6].E = 1318.510227651479718;
  noteFreq[6].F = 1396.912925732015537;
  noteFreq[6]['F#'] = 1479.977690846537595;
  noteFreq[6].G = 1567.981743926997176;
  noteFreq[6]['G#'] = 1661.218790319780554;
  noteFreq[6].A = 1760.0;
  noteFreq[6]['A#'] = 1864.655046072359665;
  noteFreq[6].B = 1975.533205024496447;

  noteFreq[7].C = 2093.004522404789077;
  noteFreq[7]['C#'] = 2217.461047814976769;
  noteFreq[7].D = 2349.318143339260482;
  noteFreq[7]['D#'] = 2489.015869776647285;
  noteFreq[7].E = 2637.020455302959437;
  noteFreq[7].F = 2793.825851464031075;
  noteFreq[7]['F#'] = 2959.955381693075191;
  noteFreq[7].G = 3135.963487853994352;
  noteFreq[7]['G#'] = 3322.437580639561108;
  noteFreq[7].A = 3520.0;
  noteFreq[7]['A#'] = 3729.310092144719331;
  noteFreq[7].B = 3951.066410048992894;

  noteFreq[8].C = 4186.009044809578154;

  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const gainNode = audioCtx.createGain();
  gainNode.connect(audioCtx.destination);
  gainNode.gain.value = 0.1;

  let osc: OscillatorNode | undefined;

  return [
    function playTone(pianoKey: PianoKeyData) {
      if (osc) {
        osc.stop();
      }
      gainNode.gain.cancelScheduledValues(audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      osc = audioCtx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = noteFreq[pianoKey.octave][pianoKey.names[0]];
      osc.connect(gainNode);
      osc.start();
    },
    () => {
      if (osc) {
        const currentOsc = osc;
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 1);
        setTimeout(() => {
          currentOsc.stop();
          if (osc === currentOsc) {
            osc = undefined;
          }
        }, 1000);
      }
    },
  ] as const;
}

const [playTone, stopTone] = makeAudio();

export default function Piano() {
  // TODO: these could just be midi notes?
  const pressedKeys = useSignal<PianoKeyData[]>([]);
  const octave = useSignal(4);
  const showNoteNames = useSignal(true);
  const showKeyboardMapping = useSignal(true);
  // highlight?: Scale | Chord;

  const handleKeyDown = (key: PianoKeyData) => {
    if (!pressedKeys.value.includes(key)) {
      pressedKeys.value = [...pressedKeys.value, key];
      playTone(key);
    }
  };

  const handleKeyUp = (key: PianoKeyData) => {
    pressedKeys.value = pressedKeys.value.filter((k) => k !== key);
    stopTone();
  };

  const handleKeyboardKeyDown = (e: KeyboardEvent) => {
    const pianoKey = keyFromKeyboardEvent(e, octave.value);
    if (pianoKey) {
      handleKeyDown(pianoKey);
    }
  };

  const handleKeyboardKeyUp = (e: KeyboardEvent) => {
    const pianoKey = keyFromKeyboardEvent(e, octave.value);
    if (pianoKey) {
      handleKeyUp(pianoKey);
    }
  };

  const handleFocus = () => {
    getMidi();
  };

  useSignalEffect(() => {
    const currentMidi = midi.value;
    if (!currentMidi) {
      return;
    }

    for (const input of currentMidi.inputs.values()) {
      input.onmidimessage = (message) => {
        const data = (message as any).data as Uint8Array;
        const signal = data[0] & 0xf0;
        const note = data[1];

        const pianoKey = keys.find((k) => k.midiNote === note);
        if (!pianoKey) {
          return;
        }

        if (signal === 0x90) {
          handleKeyDown(pianoKey);
        } else if (signal === 0x80) {
          handleKeyUp(pianoKey);
        }
      };
    }

    // TODO: better cleanup, listen to status change events
    return () => {
      for (const entry of currentMidi.inputs) {
        const input = entry[1];
        input.onmidimessage = null;
      }
    };
  });

  return (
    <div
      tabIndex={0}
      onKeyDown={handleKeyboardKeyDown}
      onKeyUp={handleKeyboardKeyUp}
      onFocus={handleFocus}
    >
      <div className="keyboard">
        {keys.map((key) => (
          <Key
            key={key.note}
            keyboardKey={showKeyboardMapping ? findKeyboardKey(key, octave.value) : undefined}
            noteNames={showNoteNames ? key.names : undefined}
            pressed={pressedKeys.value.includes(key)}
            black={key.sharp}
            onKeyDown={() => handleKeyDown(key)}
            onKeyUp={() => handleKeyUp(key)}
          />
        ))}
      </div>
      <div>
        {JSON.stringify({
          pressedKeys: pressedKeys.value,
          octave: octave.value,
          showNoteNames: showNoteNames.value,
          showKeyboardMapping: showKeyboardMapping.value,
        })}
      </div>
      <div>{midiDevices}</div>
    </div>
  );
}

function Key({
  pressed,
  keyboardKey,
  noteNames,
  black,
  onKeyDown,
  onKeyUp,
}: {
  pressed: boolean;
  black: boolean;
  keyboardKey: string | undefined;
  noteNames: string[] | undefined;
  onKeyDown: () => void;
  onKeyUp: () => void;
}) {
  const handlePointerDown = (e: PointerEvent) => {
    (e.target! as HTMLElement).setPointerCapture(e.pointerId);
    onKeyDown();
  };
  const handlePointerUp = (e: PointerEvent) => {
    (e.target! as HTMLElement).setPointerCapture(e.pointerId);
    onKeyUp();
  };

  return (
    <div
      className={['key', black ? 'black' : 'white', pressed ? 'pressed' : undefined]
        .filter(Boolean)
        .join(' ')}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
    >
      {noteNames?.map((noteName) => <div key={noteName}>{noteName}</div>)}
      <div>{keyboardKey}</div>
    </div>
  );
}
