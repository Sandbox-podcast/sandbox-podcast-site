import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { TimeMachine } from '../src/components/time-machine.tsx';
import { TimeMachineChart } from '../src/components/time-machine-chart.tsx';
import { timeMachineData } from '../src/lib/time-machine.ts';

describe('interface historique Time Machine', () => {
  it('présente une histoire mondiale sourcée sans scores, collections ou simulation', () => {
    const html = renderToStaticMarkup(createElement(TimeMachine, { data: timeMachineData() }));
    expect(html).toContain('Histoire de l&#x27;intelligence artificielle');
    expect(html).toContain('sources primaires');
    expect(html).toContain('30 novembre 2022');
    expect(html).toContain('https://openai.com/index/chatgpt/');
    expect(html).toContain('Toutes les annonces');
    expect(html).toContain('Année en cours, recherche vérifiée le');
    expect(html).toContain('Sélection non exhaustive.');
    expect(html).not.toContain('les chiffres sont simulés');
    expect(html).not.toContain('Projets comparés');
    expect(html).not.toContain('SCORE SANDBOX');
    expect(html).not.toContain('rang 1');
  });
  it('donne un parcours clavier, les types de dates et une liste équivalente au graphique', () => {
    const html = renderToStaticMarkup(createElement(TimeMachine, { data: timeMachineData() }));
    expect(html).toContain('type="range"');
    expect(html).toContain('aria-valuetext="30 novembre 2022, L&#x27;ouverture de ChatGPT"');
    expect(html).toContain('Flèches pour parcourir les événements');
    expect(html).toContain('Publication scientifique');
    expect(html).toContain('Ouverture / sortie');
    expect(html).toContain('Explorer : Deep Blue');
    expect(html).toContain('aria-label="Source primaire :');
    expect(html).toContain('aria-controls="tm-wrapped-panel"');
    expect(html).toContain('aria-pressed="true"');
    expect(html).not.toContain('Mettre la lecture en pause');
    expect(html).toContain('aria-label="Année de début"');
    expect(html).toContain('aria-label="Année de fin"');
    expect(html).toContain('Toutes les années');
  });
  it('affiche des mois sur une année isolée et des graduations sans doublon', () => {
    const source = timeMachineData();
    const event = source.events[0];
    if (!event) throw new Error('Corpus vide');
    const html = renderToStaticMarkup(
      createElement(TimeMachineChart, {
        events: [{ ...event, date: '2024-05' }],
        selectedIndex: 0,
        fromYear: 2024,
        toYear: 2024,
        onSelect: () => undefined,
      }),
    );
    expect(html).toContain('Chronologie mondiale de l&#x27;IA en 2024');
    expect(html).toContain('janv.');
    expect(html).toContain('oct.');
    expect(html.match(/<text[^>]*>0<\/text>/g)).toHaveLength(1);
    expect(html.match(/<text[^>]*>1<\/text>/g)).toHaveLength(1);
  });
  it("rend l'état vide et désactive la lecture pour un événement isolé", () => {
    const source = timeMachineData();
    const empty = renderToStaticMarkup(
      createElement(TimeMachine, { data: { ...source, events: [] } }),
    );
    expect(empty).toContain('Aucun résultat.');
    expect(empty).toContain('Réinitialiser les filtres');
    const single = renderToStaticMarkup(
      createElement(TimeMachine, { data: { ...source, events: source.events.slice(0, 1) } }),
    );
    expect(single).toMatch(/<button[^>]*aria-label="Rejouer l&#x27;histoire"[^>]*disabled=""/);
    expect(single).toContain('Date documentée au mois.');
  });
  it('échappe le contenu des événements et garde un titre SVG textuel unique', () => {
    const source = timeMachineData();
    const first = source.events[0];
    if (!first) throw new Error('Corpus vide');
    const event = { ...first, title: '<script>injection</script>' };
    const html = renderToStaticMarkup(
      createElement(TimeMachine, { data: { ...source, events: [event] } }),
    );
    expect(html).toContain('&lt;script&gt;injection&lt;/script&gt;');
    expect(html).not.toContain('<script>injection</script>');
    const chart = renderToStaticMarkup(
      createElement(TimeMachineChart, {
        events: [event],
        selectedIndex: 0,
        fromYear: 1996,
        toYear: 2026,
        onSelect: () => undefined,
      }),
    );
    expect(chart).toMatch(/<title[^>]*>Chronologie mondiale de l&#x27;IA, de 1996 à 2026<\/title>/);
    expect(chart).toContain('Cumul des événements retenus.');
  });
});
