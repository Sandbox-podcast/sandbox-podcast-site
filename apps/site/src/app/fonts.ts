import localFont from 'next/font/local';

// Les fontes sont locales, et les fontes du titre et de lecture sont préchargées. Elles sont accompagnées d'un repli aux métriques ajustées.
// `optional` garde le texte lisible et stable lorsque leur chargement dépasse le premier affichage.
const archivo = localFont({
  src: '../../node_modules/@fontsource-variable/archivo/files/archivo-latin-wdth-normal.woff2',
  variable: '--font-archivo',
  weight: '100 900',
  display: 'optional',
  declarations: [{ prop: 'font-stretch', value: '62% 125%' }],
  adjustFontFallback: 'Arial',
});
const newsreader = localFont({
  src: '../../node_modules/@fontsource-variable/newsreader/files/newsreader-latin-wght-normal.woff2',
  weight: '200 800',
  variable: '--font-newsreader',
  display: 'optional',
  adjustFontFallback: 'Times New Roman',
});
const newsreaderItalic = localFont({
  src: '../../node_modules/@fontsource-variable/newsreader/files/newsreader-latin-wght-italic.woff2',
  weight: '200 800',
  style: 'italic',
  variable: '--font-newsreader-italic',
  preload: false,
  display: 'optional',
  adjustFontFallback: 'Times New Roman',
});
const jetbrains = localFont({
  src: '../../node_modules/@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2',
  variable: '--font-jetbrains',
  preload: false,
  weight: '100 800',
  display: 'optional',
  adjustFontFallback: 'Arial',
});
export const siteFonts = `${archivo.variable} ${newsreader.variable} ${newsreaderItalic.variable} ${jetbrains.variable}`;
