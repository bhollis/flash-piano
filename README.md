# Flash Piano

The "Flash Piano" is the modern successor to a Macromedia Flash-based piano I built in 1999. Now that Flash is gone, I've rebuilt it on top of modern browser technology, making use of Web Components, the Web Audio API, and Web MIDI.

The Flash Piano is a web component, meaning you can use it in any website from any framework - it works just like a normal HTML component:

```html
<!doctype html>
<html lang="">
  <head>
    <script src="https://unpkg.com/flash-piano"></script>
  </head>
  <body>
    <flash-piano>
  </body>
</html>
```

There are no attributes to configure. There are two CSS variables you can use to customize the piano:

```css
flash-piano {
  --piano-key-width: 50px;
  --piano-keybed-color: blue;
}
```

Setting `--piano-key-width` will scale the entire piano up or down.

If you have a MIDI keyboard connected, you can play the piano with it while the piano is focused (click on it first).
