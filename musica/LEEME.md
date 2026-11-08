# Música para historias (biblioteca de Z&R)

Los vendedores Plus y Pro pueden ponerle música a sus **videos** de historia, solo con las canciones de esta carpeta.
Mientras `lista.json` esté vacío (`[]`), el botón 🎵 no aparece en el editor.

## Cómo agregar canciones

1. Entra a **https://pixabay.com/music/** (gratis, permite uso comercial sin pagar ni dar crédito).
   Antes de usar una canción, abre su página y confirma que dice "Pixabay Content License".
2. Descarga 10 a 20 canciones en **MP3**. Que no pesen más de 3 MB cada una.
3. Ponles un nombre sencillo, sin espacios ni acentos: `fiesta-1.mp3`, `relajada-2.mp3`…
4. Súbelas a esta carpeta (`musica/`).
5. Edita `lista.json` con una línea por canción:

```json
[
  { "archivo": "fiesta-1.mp3", "titulo": "Fiesta", "artista": "Nombre del autor", "inicio": 0, "licencia": "Pixabay" },
  { "archivo": "relajada-2.mp3", "titulo": "Tarde tranquila", "artista": "Nombre del autor", "inicio": 12, "licencia": "Pixabay" }
]
```

- `inicio`: segundo de la canción donde empieza a sonar (usa la parte más pegajosa).
- `licencia`: para tu control, de dónde salió cada canción.

Al publicar el cambio, el botón 🎵 aparece solo en el editor de historias.
