import Link from 'next/link';
import { JsonLd } from '@/components/json-ld';
import { absoluteUrl, breadcrumbLd, publisherLd } from '@/lib/seo';
import {
  SKILL_GUIDES_REVIEWED_AT,
  skillGuidePath,
  skillGuides,
  type SkillGuide,
} from '@/domain/skill-guides';
import styles from './skill-guide.module.css';

export function SkillGuideLinks({ currentSlug }: { currentSlug?: string }) {
  return (
    <section className={styles['related']} aria-label="Guides de choix des skills" lang="fr">
      <h2>Choisir tes skills selon ton outil</h2>
      <ul>
        {skillGuides
          .filter((guide) => guide.slug !== currentSlug)
          .map((guide) => (
            <li key={guide.slug}>
              <Link href={skillGuidePath(guide.slug)}>{guide.heading}</Link>
            </li>
          ))}
      </ul>
    </section>
  );
}

export function SkillGuideArticle({ guide }: { guide: SkillGuide }) {
  const path = skillGuidePath(guide.slug);
  return (
    <article className={`wrap ${styles['guide']}`} lang="fr">
      <JsonLd
        data={[
          breadcrumbLd([
            { name: 'Accueil', path: '/' },
            { name: 'Guides des skills IA', path: '/guides' },
            { name: guide.heading, path },
          ]),
          {
            '@context': 'https://schema.org',
            '@type': 'Article',
            '@id': absoluteUrl(`${path}#article`),
            headline: guide.heading,
            description: guide.description,
            inLanguage: 'fr-FR',
            mainEntityOfPage: absoluteUrl(path),
            dateModified: SKILL_GUIDES_REVIEWED_AT,
            author: { ...publisherLd, url: absoluteUrl('/about') },
            publisher: publisherLd,
            citation: [
              ...new Set([
                guide.documentation.url,
                ...guide.options.map((option) => option.source),
              ]),
            ],
          },
        ]}
      />
      <nav className={styles['breadcrumbs']} aria-label="Fil d’Ariane">
        <Link href="/">Accueil</Link>
        <span aria-hidden="true">/</span>
        <Link href="/guides">Guides des skills IA</Link>
      </nav>
      <header className={styles['heading']}>
        <p className={styles['eyebrow']}>Le guide {guide.tool}</p>
        <h1>{guide.heading}</h1>
        <p>{guide.introduction}</p>
        <p className={styles['byline']}>
          <Link href="/about">Sandbox</Link> · Revue documentaire du{' '}
          <time dateTime={SKILL_GUIDES_REVIEWED_AT}>26 octobre 2026</time>
        </p>
      </header>
      <nav className={styles['contents']} aria-label="Sommaire du guide">
        <a href="#choix">{guide.kind === 'recipes' ? 'Les quatre recettes' : 'Choisir un skill'}</a>
        <a href="#installation">{guide.kind === 'recipes' ? 'Créer ton skill' : 'Installation'}</a>
        <a href="#methode">À propos de ce guide</a>
        <a href="#questions">Questions fréquentes</a>
      </nav>
      <section className={styles['takeaway']} aria-label="Pour commencer">
        <h2>Par où commencer ?</h2>
        <p>{guide.takeaway}</p>
      </section>
      <section className={styles['scope']} aria-label="Avant de commencer">
        <p>{guide.scope}</p>
        <p>
          Guide documentaire : les exemples de demandes sont à essayer, pas des résultats de tests
          réalisés par Sandbox.
        </p>
      </section>
      <section id="choix" className={styles['section']}>
        <h2>
          {guide.kind === 'recipes'
            ? 'Quatre recettes à adapter'
            : 'Choisis la tâche qui te concerne'}
        </h2>
        <ul className={styles['options']}>
          {guide.options.map((option) => (
            <li key={option.name}>
              <h3>{option.use}</h3>
              <p className={styles['skillName']}>
                {guide.kind === 'recipes' ? 'Recette' : 'Skill'} : {option.name}
              </p>
              <p>{option.description}</p>
              <div className={styles['example']}>
                <h4>Une demande à essayer</h4>
                <blockquote>{option.prompt}</blockquote>
              </div>
              <p className={styles['limitation']}>
                <strong>À garder en tête.</strong> {option.limitation}
              </p>
              <details className={styles['verification']}>
                <summary>Comment vérifier le résultat</summary>
                <p>{option.check}</p>
              </details>
              <a className={styles['source']} href={option.source}>
                {guide.kind === 'recipes'
                  ? `Documentation pour créer le skill « ${option.name} »`
                  : `Voir le skill ${option.name} chez ${guide.tool === 'Claude' ? 'Anthropic' : 'OpenAI'}`}
              </a>
            </li>
          ))}
        </ul>
      </section>
      <section id="installation" className={styles['section']}>
        <h2>
          {guide.kind === 'recipes'
            ? 'Transformer ta recette en skill'
            : `Passer à la pratique dans ${guide.tool === 'Claude' ? 'Claude Code' : 'Codex'}`}
        </h2>
        <ol className={styles['steps']}>
          {guide.installation.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        {guide.command ? (
          <pre>
            <code>{guide.command}</code>
          </pre>
        ) : null}
        <p>
          <a href={guide.documentation.url}>{guide.documentation.name}</a>
        </p>
      </section>
      <section id="methode" className={styles['section']}>
        <h2>Sur quoi repose ce guide ?</h2>
        <p>
          Nous avons lu les instructions et la documentation liées dans chaque fiche. Nous n’avons
          pas testé tous ces usages : les demandes proposées servent de point de départ pour tes
          propres essais. L’ordre des fiches ne correspond pas à une note de qualité.
        </p>
        <p>
          Pour comparer deux skills, donne-leur le même fichier et la même demande. Regarde les
          erreurs et le temps passé à corriger le résultat. Un document qui semble réussi peut
          encore contenir un chiffre faux ou un tableau inutilisable.
        </p>
        <p>
          Le <Link href="/charts/skills">classement Skills de Sandbox</Link> permet de suivre
          l’adoption observée. Sa <Link href="/charts/skills/methodology">méthodologie</Link> décrit
          les mesures et leurs limites. Cette donnée complète un essai fonctionnel, sans le
          remplacer.
        </p>
      </section>
      <section id="questions" className={styles['section']}>
        <h2>Questions fréquentes</h2>
        {guide.questions.map((item) => (
          <details className={styles['question']} key={item.question}>
            <summary>{item.question}</summary>
            <p>{item.answer}</p>
          </details>
        ))}
      </section>
      <SkillGuideLinks currentSlug={guide.slug} />
    </article>
  );
}
