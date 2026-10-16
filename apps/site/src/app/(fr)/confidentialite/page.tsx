import { Text } from '@/components/localization';
import { MeasurementPreferencesButton } from '@/components/analytics-consent';
import { Breadcrumbs, ExtLink } from '@/components/ui';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: "Données personnelles et mesure d'audience",
  description:
    'Responsable, services de mesure, durées de conservation et retrait du consentement sur Sandbox.',
  path: '/confidentialite',
  noindex: false,
});

export default function PrivacyPage() {
  return (
    <article className="wrap localized-content privacy-page">
      <Breadcrumbs items={[{ label: 'Confidentialité' }]} />
      <header className="localized-content-heading">
        <p className="label">
          <Text>{'Mise à jour : 16 octobre 2026'}</Text>
        </p>
        <h1>
          <Text>{"Données personnelles et mesure d'audience"}</Text>
        </h1>
      </header>
      <section>
        <h2>
          <Text>{'Qui est responsable ?'}</Text>
        </h2>
        <p>
          <Text>
            {
              "L'équipe du Talk Show Sandbox est responsable des traitements décrits ici. Pour une question ou l'exercice de vos droits, écrivez à"
            }
          </Text>{' '}
          <a className="underline" href="mailto:sandbox.podcast.pro@gmail.com">
            sandbox.podcast.pro@gmail.com
          </a>
          .
        </p>
      </section>
      <section>
        <h2>
          <Text>{'Votre choix'}</Text>
        </h2>
        <p>
          <Text>
            {
              "La mesure d'audience repose sur votre consentement. Accepter et refuser sont proposés au même niveau. Le site reste accessible en cas de refus. Aucun script de mesure n'est chargé avant votre accord."
            }
          </Text>
        </p>
        <p>
          <Text>
            {
              "Votre choix est enregistré dans le stockage local de ce navigateur pendant 180 jours, pour l'accord comme pour le refus. Il est ensuite redemandé. Effacer ce stockage ou changer de navigateur vous fera également refaire ce choix."
            }
          </Text>
        </p>
        <p>
          <Text>
            {
              'Vous pouvez retirer votre accord à tout moment avec les préférences ci-dessous ou le bouton présent en bas de chaque page. Le retrait arrête les nouveaux envois et supprime les cookies GA4 accessibles au site. Il ne supprime pas automatiquement les événements déjà reçus.'
            }
          </Text>
        </p>
        <MeasurementPreferencesButton />
      </section>
      <section>
        <h2>
          <Text>{'Ce qui est mesuré après accord'}</Text>
        </h2>
        <p>
          <Text>
            {
              "Google Analytics 4 mesure les pages consultées et les actions utiles, comme l'ouverture du lecteur ou d'une ressource. Les événements peuvent inclure le chemin de la page, son titre, le site d'origine, la date, le type d'appareil, le navigateur et une localisation approximative. Les paramètres de recherche et fragments d'URL sont retirés de nos envois ; aucun nom, e-mail ou texte saisi dans la recherche n'est envoyé par nos événements."
            }
          </Text>
        </p>
        <p>
          <Text>
            {
              "GA4 utilise les cookies _ga et _ga_* pour distinguer les visites. Leur durée est limitée à 180 jours sans prolongation automatique. La durée retenue par l'équipe pour les données d'événements GA4 est de 14 mois ; le réglage effectif du flux doit être vérifié avant son activation. Cette durée ne s'applique pas de la même façon aux rapports agrégés, selon les règles de Google."
            }
          </Text>
        </p>
        <p>
          <Text>
            {
              "Vercel Web Analytics produit également des statistiques de fréquentation. Vercel indique ne pas utiliser de cookies pour ce service et supprimer sous 24 heures l'identifiant calculé pour distinguer les visites. Les statistiques agrégées restent consultables selon l'offre Vercel, de 1 à 24 mois. Nos envois excluent les paramètres d'URL et la zone d'administration."
            }
          </Text>
        </p>
        <p>
          <Text>
            {
              "Nous désactivons les signaux Google et la personnalisation publicitaire dans le tag du site. Nous n'envoyons pas d'identifiant utilisateur ni de données de compte dans nos événements."
            }
          </Text>
        </p>
        <p>
          <Text>
            {
              "Vercel Speed Insights mesure aussi les temps de chargement, la réactivité et la stabilité visuelle des pages. Il suit le même choix de consentement. Les paramètres d'URL et la zone d'administration sont exclus de nos envois."
            }
          </Text>
        </p>
      </section>
      <section>
        <h2>
          <Text>{'Prestataires et services externes'}</Text>
        </h2>
        <p>
          <Text>
            {
              "Google et Vercel reçoivent les données nécessaires à leurs services de mesure. Leur traitement peut avoir lieu hors de l'Union européenne. Leurs politiques décrivent les lieux de traitement, les destinataires et les garanties de transfert. Vous pouvez refuser ces services ou retirer votre accord."
            }
          </Text>
        </p>
        <ul>
          <li>
            <ExtLink href="https://policies.google.com/privacy">
              <Text>{'Politique de confidentialité de Google'}</Text>
            </ExtLink>
          </li>
          <li>
            <ExtLink href="https://support.google.com/analytics/answer/7667196">
              <Text>{'Conservation des données dans Google Analytics'}</Text>
            </ExtLink>
          </li>
          <li>
            <ExtLink href="https://vercel.com/docs/analytics/privacy-policy">
              <Text>{'Données traitées par Vercel Web Analytics'}</Text>
            </ExtLink>
          </li>
          <li>
            <ExtLink href="https://vercel.com/legal/privacy-policy">
              <Text>{'Politique de confidentialité de Vercel'}</Text>
            </ExtLink>
          </li>
        </ul>
        <p>
          <Text>
            {
              "Le lecteur YouTube est chargé lorsque vous demandez la lecture d'un épisode. YouTube peut alors recevoir votre adresse IP et des informations de lecture, selon ses propres règles. Le choix de mesure du site ne remplace pas les paramètres de votre compte YouTube. Les liens vers les autres plateformes vous conduisent sur leurs services."
            }
          </Text>
        </p>
        <p>
          <Text>
            {
              "L'hébergement doit traiter les requêtes réseau nécessaires à l'affichage et à la sécurité du site. Les préférences d'affichage et les favoris éventuels sont conservés dans votre navigateur pour rendre les fonctions demandées ; ils ne déclenchent pas la mesure d'audience."
            }
          </Text>
        </p>
      </section>
      <section>
        <h2>
          <Text>{'Vos droits'}</Text>
        </h2>
        <p>
          <Text>
            {
              "Vous pouvez demander l'accès, la rectification, l'effacement ou la limitation des données qui vous concernent, et leur portabilité lorsque ce droit s'applique. Vous pouvez retirer votre consentement sans remettre en cause les traitements réalisés avant son retrait. Contactez l'équipe à l'adresse indiquée plus haut en précisant votre demande, sans transmettre de document d'identité spontanément."
            }
          </Text>
        </p>
        <p>
          <Text>{'Vous pouvez aussi adresser une réclamation à la CNIL.'}</Text>{' '}
          <ExtLink href="https://www.cnil.fr/fr/plaintes">
            <Text>{'Contacter la CNIL'}</Text>
          </ExtLink>
        </p>
      </section>
    </article>
  );
}
