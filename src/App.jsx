import { useEffect } from 'react';
import ABPaiements from './AB_Paiements_FINAL';
import './App.css';

const API_SCRIPT_ID = 'AKfycbySr3kGVj6Uqjjj44_cV9teMMeZym8ayVWo2RX4RV76KO0Q_AWW8O4PJnKlwXJ1OFmkTw';

const normaliserTexte = (valeur) =>
  String(valeur ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

const montantEnCentimes = (valeur) => {
  const nombre = Number(String(valeur ?? '').replace(',', '.'));
  return Number.isFinite(nombre) ? Math.round(nombre * 100) : null;
};

const reponseLocale = (data) =>
  new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });

export default function App() {
  useEffect(() => {
    const fetchOriginal = window.fetch.bind(window);
    const enregistrementsEnCours = new Set();

    window.fetch = async (input, init = {}) => {
      const url = typeof input === 'string' ? input : input?.url || '';
      const methode = String(init?.method || 'GET').toUpperCase();

      if (!url.includes(API_SCRIPT_ID) || methode !== 'POST' || typeof init?.body !== 'string') {
        return fetchOriginal(input, init);
      }

      let payload;
      try {
        payload = JSON.parse(init.body);
      } catch {
        return fetchOriginal(input, init);
      }

      if (payload?.action !== 'addFacture' || !payload?.facture) {
        return fetchOriginal(input, init);
      }

      const facture = payload.facture;
      const fournisseur = normaliserTexte(facture.fournisseur);
      const numero = normaliserTexte(facture.numero);
      const montant = montantEnCentimes(facture.montantTTC);
      const cle = `${fournisseur}|${numero}|${montant}`;

      // Empêche deux clics rapides d'envoyer deux créations simultanées.
      if (enregistrementsEnCours.has(cle)) {
        window.alert('Enregistrement déjà en cours. Merci de patienter sans recliquer sur Enregistrer.');
        return reponseLocale({
          success: false,
          duplicateRequest: true,
          error: 'Enregistrement déjà en cours'
        });
      }

      enregistrementsEnCours.add(cle);

      try {
        // Le contrôle de doublon n'est pertinent que si un numéro de facture est renseigné.
        if (numero && montant !== null) {
          const controleResponse = await fetchOriginal(url, {
            method: 'POST',
            body: JSON.stringify({ action: 'getFactures' })
          });
          const controleData = await controleResponse.json();
          const existantes = Array.isArray(controleData?.data) ? controleData.data : [];

          const doublon = existantes.find((existante) =>
            normaliserTexte(existante?.fournisseur) === fournisseur &&
            normaliserTexte(existante?.numero) === numero &&
            montantEnCentimes(existante?.montantTTC) === montant
          );

          if (doublon) {
            const montantAffiche = new Intl.NumberFormat('fr-FR', {
              style: 'currency',
              currency: 'EUR'
            }).format(Number(facture.montantTTC));

            const continuer = window.confirm(
              '⚠️ FACTURE DÉJÀ EXISTANTE\n\n' +
              'Une facture existe déjà avec le même fournisseur, le même numéro et le même montant.\n\n' +
              `Fournisseur : ${facture.fournisseur || '-'}\n` +
              `N° facture : ${facture.numero || '-'}\n` +
              `Montant : ${montantAffiche}\n\n` +
              'Merci de vérifier la facture existante avant de continuer.\n\n' +
              'Après vérification, voulez-vous tout de même enregistrer cette facture ?'
            );

            if (!continuer) {
              return reponseLocale({
                success: false,
                cancelled: true,
                duplicate: true,
                error: 'Enregistrement annulé après détection d’un doublon'
              });
            }
          }
        }

        return await fetchOriginal(input, init);
      } finally {
        enregistrementsEnCours.delete(cle);
      }
    };

    return () => {
      window.fetch = fetchOriginal;
    };
  }, []);

  return <ABPaiements />;
}
