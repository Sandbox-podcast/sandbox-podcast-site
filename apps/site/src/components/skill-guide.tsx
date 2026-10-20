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
        <h1>{guide.heading}</h1>
        <p>{guide.introduction}</p>
        <p className={styles['byline']}>
          <Link href="/about">Sandbox</Link> · Revue documentaire du{' '}
          <time dateTime={SKILL_GUIDES_REVIEWED_AT}>20 octobre 2026</time>
        </p>
      </header>
      <nav className={styles['contents']} aria-label="Sommaire du guide">
        <a href="#choix">Choix par usage</a>
        <a href="#installation">Installation</a>
        <a href="#methode">Méthode de sélection</a>
        <a href="#questions">Questions fréquentes</a>
      </nav>
      <section className={styles['scope']} aria-label="Périmètre et compatibilité">
        <p>{guide.scope}</p>
        <p>
          Cette sélection repose sur la documentation consultée. Les essais proposés ci-dessous
          restent à exécuter dans ton environnement ; aucun score de performance ne leur est
          attribué.
        </p>
      </section>
      <section id="choix" className={styles['section']}>
        <h2>Quel skill choisir pour quel usage ?</h2>
        <ul className={styles['options']}>
          {guide.options.map((option) => (
            <li key={option.name}>
              <h3>{option.name}</h3>
              <p className={styles['use']}>{option.use}</p>
              <p>{option.description}</p>
              <dl>
                <dt>Limite à vérifier</dt>
                <dd>{option.limitation}</dd>
                <dt>Essai proposé</dt>
                <dd>{option.check}</dd>
              </dl>
              <a href={option.source}>Lire la source de {option.name}</a>
            </li>
          ))}
        </ul>
      </section>
      <section id="installation" className={styles['section']}>
        <h2>Comment installer et vérifier ton skill</h2>
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
        <h2>Comment nous avons retenu ces pistes</h2>
        <p>
          Nous avons rapproché les tâches décrites dans les sources de livrables concrets : un
          fichier à modifier, une information à vérifier ou un problème de code à résoudre. Chaque
          option indique son périmètre et un contrôle à effectuer. L’ordre de présentation ne
          constitue pas un palmarès.
        </p>
        <p>
          Pour comparer deux candidats, conserve la même entrée et les mêmes outils. Écris le
          résultat attendu avant l’essai, puis relève les erreurs et les corrections nécessaires.
          Note la version du skill et la date : une modification de ses instructions peut changer le
          résultat.
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
          <div key={item.question}>
            <h3>{item.question}</h3>
            <p>{item.answer}</p>
          </div>
        ))}
      </section>
      <SkillGuideLinks currentSlug={guide.slug} />
    </article>
  );
}
