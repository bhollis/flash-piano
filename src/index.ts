import register from 'preact-custom-element';
import Piano from './Piano';

register(Piano, 'flash-piano', ['name'], { shadow: false });
