import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';

// ============================================
// HOOK GOOGLE SHEETS
// ============================================

const useGoogleSheets = () => {
  // ✅ VOTRE DEPLOYMENT_ID (configuré)
  const API_URL = 'https://script.google.com/macros/s/AKfycbwnR4gsuuEnZtn4eqDRwG_PXKi2cSpXnwM7bMS1er8IkUvppKSh8K1EJmADG-MTz1jMTw/exec';

  const callAPI = async (action, data = null) => {
    try {
      const params = new URLSearchParams();
      params.append('action', action);
      if (data) params.append('data', JSON.stringify(data));

      const url = `${API_URL}?${params.toString()}`;
      const response = await fetch(url);
      const result = await response.json();
      
      return result.success ? result.data : null;
    } catch (error) {
      console.error(`Erreur API (${action}):`, error);
      return null;
    }
  };

  return {
    getAll: () => callAPI('getAll'),
    getFactures: () => callAPI('getFactures'),
    getFournisseurs: () => callAPI('getFournisseurs'),
    addFacture: (f) => callAPI('addFacture', f),
    updateFacture: (f) => callAPI('updateFacture', f),
    deleteFacture: (id) => callAPI('deleteFacture', { id }),
    addFournisseur: (f) => callAPI('addFournisseur', f),
    updateFournisseur: (f) => callAPI('updateFournisseur', f),
    deleteFournisseur: (id) => callAPI('deleteFournisseur', { id })
  };
};

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export default function ABPaiements() {
  const gs = useGoogleSheets();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [factures, setFactures] = useState([]);
  const [fournisseurs, setFournisseurs] = useState([]);
  const [editingFacture, setEditingFacture] = useState(null);
  const [showFormulaire, setShowFormulaire] = useState(false);
  const [loading, setLoading] = useState(true);

  // Charger les données au démarrage
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const data = await gs.getAll();
    if (data) {
      setFactures(data.factures || []);
      setFournisseurs(data.fournisseurs || []);
    }
    setLoading(false);
  };

  const getFournisseur = (id) => fournisseurs.find(f => f.id === id);
  const aujourd = new Date();

  const estEnRetard = (dateEcheance, statut) => {
    if (statut === 'payée') return false;
    return new Date(dateEcheance) < aujourd;
  };

  const estEcheanceProche = (dateEcheance, statut) => {
    if (statut === 'payée') return false;
    const d = new Date(dateEcheance);
    const limite = new Date(aujourd);
    limite.setDate(limite.getDate() + 7);
    return d >= aujourd && d <= limite;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00Z');
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatMontant = (montant) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(montant);
  };

  const totalAPayer = factures.filter(f => f.statut === 'à payer').reduce((sum, f) => sum + f.montantTTC, 0);
  const totalEnRetard = factures.filter(f => estEnRetard(f.dateEcheance, f.statut)).reduce((sum, f) => sum + f.montantTTC, 0);

  const handleSauvegarder = async (nouvelleFacture) => {
    if (editingFacture) {
      await gs.updateFacture({ ...nouvelleFacture, id: editingFacture.id });
    } else {
      await gs.addFacture(nouvelleFacture);
    }
    loadData();
    setEditingFacture(null);
    setShowFormulaire(false);
  };

  const handleSupprimer = async (id) => {
    if (window.confirm('Êtes-vous sûr ?')) {
      await gs.deleteFacture(id);
      loadData();
    }
  };

  const handleAjouterFournisseur = async (nouveauFournisseur) => {
    await gs.addFournisseur(nouveauFournisseur);
    loadData();
  };

  const handleModifierFournisseur = async (fournisseur) => {
    await gs.updateFournisseur(fournisseur);
    loadData();
  };

  const handleSupprimerFournisseur = async (id) => {
    if (window.confirm('Supprimer ce fournisseur ?')) {
      await gs.deleteFournisseur(id);
      loadData();
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#F5F4F0',
        fontSize: '14px',
        color: '#162D49'
      }}>
        ⏳ Chargement des données depuis Google Sheets...
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#F5F4F0', color: '#162D49', minHeight: '100vh' }}>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; font-family: 'Avenir Next', 'Segoe UI', system-ui, -apple-system, sans-serif; }
      `}</style>

      {/* HEADER */}
      <div style={{
        backgroundColor: '#162D49',
        color: '#fff',
        padding: '14px 16px',
        position: 'sticky',
        top: 0,
        zIndex: 20,
        boxShadow: '0 2px 4px rgba(22,45,73,.15)'
      }}>
        <div style={{ maxWidth: '980px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap' }}>
            <b style={{ fontSize: '21px' }}>AB – Paiements</b>
            <span style={{ fontSize: '10.5px', color: '#C9A227', letterSpacing: '.12em', textTransform: 'uppercase' }}>Fournisseurs</span>
            <div style={{ marginLeft: 'auto', fontSize: '11px', opacity: 0.85 }}>
              {factures.length} facture{factures.length > 1 ? 's' : ''} | Google Sheets ☁️
            </div>
          </div>

          {/* Onglets */}
          <div style={{ display: 'flex', gap: '7px', marginTop: '11px', flexWrap: 'wrap' }}>
            {[
              { id: 'dashboard', label: 'Tableau de bord' },
              { id: 'a-payer', label: 'À payer' },
              { id: 'payees', label: 'Payées' },
              { id: 'fournisseurs', label: 'Fournisseurs' },
              { id: 'annuaire', label: 'Annuaire' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  border: activeTab === tab.id ? '1px solid #C9A227' : '1px solid rgba(255,255,255,.35)',
                  background: activeTab === tab.id ? '#C9A227' : 'transparent',
                  color: activeTab === tab.id ? '#162D49' : '#fff',
                  borderRadius: '7px',
                  padding: '7px 13px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* BODY */}
      <div style={{ padding: '14px 12px 26px', maxWidth: '980px', margin: '0 auto' }}>
        {showFormulaire && (
          <FormulaireFacture
            facture={editingFacture}
            fournisseurs={fournisseurs}
            onSauvegarder={handleSauvegarder}
            onAnnuler={() => { setShowFormulaire(false); setEditingFacture(null); }}
            onAjouterFournisseur={handleAjouterFournisseur}
          />
        )}

        {/* TABLEAU DE BORD */}
        {activeTab === 'dashboard' && (
          <div>
            <div style={{ display: 'flex', gap: '9px', marginBottom: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              <b style={{ fontSize: '14.5px' }}>Tableau de bord</b>
              <div style={{ flex: 1 }}></div>
              <button
                onClick={() => setShowFormulaire(!showFormulaire)}
                style={{
                  background: '#162D49',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '7px',
                  padding: '10px 16px',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer'
                }}
              >
                <Plus size={18} /> Nouvelle
              </button>
            </div>

            {/* KPIs */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '9px',
              marginBottom: '16px',
              fontVariantNumeric: 'tabular-nums'
            }}>
              <StatCard titre="À payer" montant={totalAPayer} bg="rgba(179,53,44,.10)" color="#B3352C" />
              <StatCard titre="En retard" montant={totalEnRetard} bg="rgba(185,106,0,.10)" color="#B96A00" />
              <StatCard titre="Total factures" montant={factures.reduce((s, f) => s + f.montantTTC, 0)} bg="rgba(22,45,73,.08)" color="#162D49" />
              <StatCard titre="Fournisseurs" montant={fournisseurs.length} bg="rgba(46,125,70,.10)" color="#2E7D46" montantBrut={true} />
            </div>

            {/* Synthèse */}
            <div style={{
              background: '#fff',
              borderRadius: '10px',
              padding: '13px 15px',
              boxShadow: '0 1px 4px rgba(22,45,73,.10)'
            }}>
              <b style={{ fontSize: '15.5px', display: 'block', marginBottom: '12px' }}>Prochaines échéances</b>
              <div>
                {factures
                  .filter(f => f.statut === 'à payer')
                  .sort((a, b) => new Date(a.dateEcheance) - new Date(b.dateEcheance))
                  .slice(0, 10)
                  .map(f => {
                    const fournisseur = getFournisseur(f.fournisseurId);
                    const enRetard = estEnRetard(f.dateEcheance, f.statut);
                    return (
                      <div key={f.id} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '6px 0',
                        fontSize: '12px',
                        borderTop: '1px dashed rgba(22,45,73,.12)'
                      }}>
                        <div>
                          <div style={{ fontWeight: 600, color: enRetard ? '#B3352C' : '#162D49' }}>
                            {fournisseur?.nom}
                          </div>
                          <div style={{ opacity: 0.6, fontSize: '11px' }}>
                            {f.numero} • {formatDate(f.dateEcheance)}
                            {enRetard && <span style={{ color: '#B3352C', marginLeft: '6px', fontWeight: 600 }}>EN RETARD</span>}
                          </div>
                        </div>
                        <div style={{ fontWeight: 700, color: enRetard ? '#B3352C' : '#162D49' }}>
                          {formatMontant(f.montantTTC)}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}

        {/* FACTURES À PAYER */}
        {activeTab === 'a-payer' && (
          <div>
            <div style={{ display: 'flex', gap: '9px', marginBottom: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              <b style={{ fontSize: '14.5px' }}>Factures à payer</b>
              <div style={{ flex: 1 }}></div>
              <button
                onClick={() => setShowFormulaire(!showFormulaire)}
                style={{
                  background: '#162D49',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '7px',
                  padding: '10px 16px',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer'
                }}
              >
                <Plus size={18} /> Nouvelle
              </button>
            </div>
            <TableFactures
              factures={factures.filter(f => f.statut === 'à payer').sort((a, b) => new Date(a.dateEcheance) - new Date(b.dateEcheance))}
              fournisseurs={fournisseurs}
              onEdit={(f) => {
                setEditingFacture(f);
                setShowFormulaire(true);
              }}
              onDelete={handleSupprimer}
              estEnRetard={estEnRetard}
              estEcheanceProche={estEcheanceProche}
              formatDate={formatDate}
              formatMontant={formatMontant}
            />
          </div>
        )}

        {/* FACTURES PAYÉES */}
        {activeTab === 'payees' && (
          <div>
            <div style={{ display: 'flex', gap: '9px', marginBottom: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              <b style={{ fontSize: '14.5px' }}>Factures payées</b>
              <div style={{ flex: 1 }}></div>
            </div>
            <TableFactures
              factures={factures.filter(f => f.statut === 'payée').sort((a, b) => new Date(b.datePaiement) - new Date(a.datePaiement))}
              fournisseurs={fournisseurs}
              onEdit={(f) => {
                setEditingFacture(f);
                setShowFormulaire(true);
              }}
              onDelete={handleSupprimer}
              estEnRetard={estEnRetard}
              estEcheanceProche={estEcheanceProche}
              formatDate={formatDate}
              formatMontant={formatMontant}
              afficherDatePaiement={true}
            />
          </div>
        )}

        {/* FOURNISSEURS */}
        {activeTab === 'fournisseurs' && (
          <div>
            <b style={{ fontSize: '14.5px', display: 'block', marginBottom: '12px' }}>Fournisseurs</b>
            {fournisseurs.map(fournisseur => {
              const factureFournisseur = factures.filter(f => f.fournisseurId === fournisseur.id);
              const totalFacture = factureFournisseur.reduce((s, f) => s + f.montantTTC, 0);
              const totalPaye = factureFournisseur.filter(f => f.statut === 'payée').reduce((s, f) => s + f.montantTTC, 0);
              const restant = totalFacture - totalPaye;

              return (
                <div key={fournisseur.id} style={{
                  background: '#fff',
                  borderRadius: '10px',
                  padding: '13px 15px',
                  boxShadow: '0 1px 4px rgba(22,45,73,.10)',
                  marginBottom: '12px'
                }}>
                  <b style={{ fontSize: '15.5px', display: 'block', marginBottom: '8px' }}>{fournisseur.nom}</b>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', fontSize: '12px', marginBottom: '12px' }}>
                    <div><div style={{ opacity: 0.6, fontSize: '10px', textTransform: 'uppercase' }}>Email</div><div>{fournisseur.email}</div></div>
                    <div><div style={{ opacity: 0.6, fontSize: '10px', textTransform: 'uppercase' }}>Téléphone</div><div>{fournisseur.telephone}</div></div>
                    <div><div style={{ opacity: 0.6, fontSize: '10px', textTransform: 'uppercase' }}>Conditions</div><div>{fournisseur.conditionsPaiement}</div></div>
                  </div>
                  <div style={{ paddingTop: '12px', borderTop: '1px solid rgba(22,45,73,.08)', display: 'flex', gap: '20px' }}>
                    <div><small style={{ opacity: 0.6 }}>Total facturé</small><b style={{ display: 'block', fontSize: '14px' }}>{formatMontant(totalFacture)}</b></div>
                    <div><small style={{ opacity: 0.6 }}>Payé</small><b style={{ display: 'block', fontSize: '14px', color: '#2E7D46' }}>{formatMontant(totalPaye)}</b></div>
                    <div><small style={{ opacity: 0.6 }}>Restant</small><b style={{ display: 'block', fontSize: '14px', color: restant > 0 ? '#B3352C' : '#2E7D46' }}>{formatMontant(restant)}</b></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ANNUAIRE */}
        {activeTab === 'annuaire' && (
          <AnnuaireFournisseurs fournisseurs={fournisseurs} onAjouter={handleAjouterFournisseur} onModifier={handleModifierFournisseur} onSupprimer={handleSupprimerFournisseur} />
        )}
      </div>
    </div>
  );
}

// ============================================
// COMPOSANTS UTILITAIRES
// ============================================

function StatCard({ titre, montant, bg, color, montantBrut }) {
  return (
    <div style={{
      background: bg,
      border: `1px solid ${color}33`,
      borderRadius: '9px',
      padding: '8px 11px',
      fontVariantNumeric: 'tabular-nums'
    }}>
      <small style={{ display: 'block', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '.08em', opacity: 0.6, marginBottom: '3px' }}>
        {titre}
      </small>
      <b style={{ fontSize: '16.5px', color }}>
        {montantBrut ? montant : new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(montant)}
      </b>
    </div>
  );
}

function TableFactures({ factures, fournisseurs, onEdit, onDelete, estEnRetard, estEcheanceProche, formatDate, formatMontant, afficherDatePaiement }) {
  return (
    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <table style={{
        borderCollapse: 'separate',
        borderSpacing: 0,
        width: '100%',
        minWidth: '640px',
        background: '#fff',
        borderRadius: '10px',
        overflow: 'hidden',
        boxShadow: '0 1px 4px rgba(22,45,73,.10)',
        fontSize: '13px'
      }}>
        <thead>
          <tr style={{ backgroundColor: '#162D49', color: '#fff' }}>
            <th style={{ padding: '8px 7px', fontSize: '12px', textAlign: 'left', fontWeight: 600 }}>Fournisseur</th>
            <th style={{ padding: '8px 7px', fontSize: '12px', textAlign: 'left', fontWeight: 600 }}>Facture</th>
            <th style={{ padding: '8px 7px', fontSize: '12px', textAlign: 'left', fontWeight: 600 }}>Échéance</th>
            <th style={{ padding: '8px 7px', fontSize: '12px', textAlign: 'right', fontWeight: 600 }}>Montant</th>
            <th style={{ padding: '8px 7px', fontSize: '12px', textAlign: 'center', fontWeight: 600 }}>Statut</th>
            <th style={{ padding: '8px 7px', fontSize: '12px', textAlign: 'center', fontWeight: 600 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {factures.length === 0 ? (
            <tr>
              <td colSpan="6" style={{ padding: '24px', textAlign: 'center', opacity: 0.6, borderTop: '1px solid rgba(22,45,73,.08)' }}>
                Aucune facture
              </td>
            </tr>
          ) : (
            factures.map((f, idx) => {
              const fournisseur = fournisseurs.find(fn => fn.id === f.fournisseurId);
              const enRetard = estEnRetard(f.dateEcheance, f.statut);
              const echeanceProche = estEcheanceProche(f.dateEcheance, f.statut);
              return (
                <tr key={f.id} style={{ backgroundColor: idx % 2 === 0 ? '#FAF9F6' : '#fff' }}>
                  <td style={{ padding: '6px 7px', borderTop: '1px solid rgba(22,45,73,.08)', fontWeight: 600 }}>
                    {fournisseur?.nom}
                  </td>
                  <td style={{ padding: '6px 7px', borderTop: '1px solid rgba(22,45,73,.08)' }}>{f.numero}</td>
                  <td style={{ padding: '6px 7px', borderTop: '1px solid rgba(22,45,73,.08)' }}>
                    {formatDate(f.dateEcheance)}
                    {enRetard && <div style={{ fontSize: '10px', color: '#B3352C', fontWeight: 600 }}>EN RETARD</div>}
                  </td>
                  <td style={{
                    padding: '6px 7px',
                    borderTop: '1px solid rgba(22,45,73,.08)',
                    textAlign: 'right',
                    fontWeight: 700,
                    fontVariantNumeric: 'tabular-nums'
                  }}>
                    {formatMontant(f.montantTTC)}
                  </td>
                  <td style={{ padding: '6px 7px', borderTop: '1px solid rgba(22,45,73,.08)', textAlign: 'center' }}>
                    {f.statut === 'payée' ? (
                      <div style={{
                        display: 'inline-block',
                        fontSize: '10.5px',
                        fontWeight: 700,
                        padding: '3px 4px',
                        borderRadius: '14px',
                        background: 'rgba(46,125,70,.15)',
                        color: '#2E7D46'
                      }}>
                        ✓ Payée
                      </div>
                    ) : (
                      <div style={{
                        display: 'inline-block',
                        fontSize: '10.5px',
                        fontWeight: 700,
                        padding: '3px 4px',
                        borderRadius: '14px',
                        background: enRetard ? 'rgba(179,53,44,.15)' : echeanceProche ? 'rgba(185,106,0,.15)' : 'rgba(22,45,73,.08)',
                        color: enRetard ? '#B3352C' : echeanceProche ? '#B96A00' : '#162D49'
                      }}>
                        {enRetard ? '⚠ RETARD' : echeanceProche ? '⏰ Bientôt' : 'À payer'}
                      </div>
                    )}
                  </td>
                  <td style={{
                    padding: '6px 7px',
                    borderTop: '1px solid rgba(22,45,73,.08)',
                    textAlign: 'center',
                    display: 'flex',
                    gap: '6px',
                    justifyContent: 'center'
                  }}>
                    <button
                      onClick={() => onEdit(f)}
                      style={{
                        background: '#fff',
                        border: '1px solid rgba(22,45,73,.25)',
                        borderRadius: '5px',
                        padding: '4px 6px',
                        cursor: 'pointer',
                        fontSize: '13px'
                      }}
                    >
                      ✎
                    </button>
                    <button
                      onClick={() => onDelete(f.id)}
                      style={{
                        background: '#fff',
                        border: '1px solid rgba(229,62,62,.4)',
                        borderRadius: '5px',
                        padding: '4px 6px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        color: '#B3352C'
                      }}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

function FormulaireFacture({ facture, fournisseurs, onSauvegarder, onAnnuler, onAjouterFournisseur }) {
  const [formData, setFormData] = useState(facture || {
    fournisseurId: '',
    numero: '',
    dateFacture: new Date().toISOString().split('T')[0],
    dateEnregistrement: new Date().toISOString().split('T')[0],
    dateEcheance: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    montantTTC: '',
    chantier: '',
    statut: 'à payer',
    datePaiement: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    const updated = { ...formData, [name]: value };
    
    if (name === 'dateFacture') {
      const date = new Date(value);
      const echeance = new Date(date);
      echeance.setDate(echeance.getDate() + 30);
      updated.dateEcheance = echeance.toISOString().split('T')[0];
    }
    
    setFormData(updated);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSauvegarder(formData);
  };

  return (
    <div style={{
      background: 'rgba(201,162,39,.10)',
      border: '1px solid rgba(201,162,39,.4)',
      borderRadius: '10px',
      padding: '14px 15px',
      marginBottom: '16px'
    }}>
      <h4 style={{
        margin: '0 0 11px',
        fontSize: '12px',
        textTransform: 'uppercase',
        letterSpacing: '.1em'
      }}>
        {facture ? 'Modifier la facture' : 'Nouvelle facture'}
      </h4>
      
      <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '9px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px', opacity: 0.7 }}>Fournisseur *</label>
          <select
            name="fournisseurId"
            value={formData.fournisseurId}
            onChange={handleChange}
            required
            style={{
              background: '#fff',
              border: '1px solid rgba(22,45,73,.25)',
              borderRadius: '7px',
              padding: '9px 11px',
              fontSize: '13.5px',
              width: '100%'
            }}
          >
            <option value="">-- Sélectionner --</option>
            {fournisseurs.map(f => (
              <option key={f.id} value={f.id}>{f.nom}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px', opacity: 0.7 }}>N° facture *</label>
          <input
            type="text"
            name="numero"
            value={formData.numero}
            onChange={handleChange}
            required
            style={{
              background: '#fff',
              border: '1px solid rgba(22,45,73,.25)',
              borderRadius: '7px',
              padding: '9px 11px',
              fontSize: '13.5px',
              width: '100%'
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px', opacity: 0.7 }}>Date facture *</label>
          <input
            type="date"
            name="dateFacture"
            value={formData.dateFacture}
            onChange={handleChange}
            required
            style={{
              background: '#fff',
              border: '1px solid rgba(22,45,73,.25)',
              borderRadius: '7px',
              padding: '9px 11px',
              fontSize: '13.5px',
              width: '100%'
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px', opacity: 0.7 }}>Date enreg. *</label>
          <input
            type="date"
            name="dateEnregistrement"
            value={formData.dateEnregistrement}
            onChange={handleChange}
            required
            style={{
              background: '#fff',
              border: '1px solid rgba(22,45,73,.25)',
              borderRadius: '7px',
              padding: '9px 11px',
              fontSize: '13.5px',
              width: '100%'
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px', opacity: 0.7 }}>Échéance *</label>
          <input
            type="date"
            name="dateEcheance"
            value={formData.dateEcheance}
            onChange={handleChange}
            required
            style={{
              background: '#fff',
              border: '1px solid rgba(22,45,73,.25)',
              borderRadius: '7px',
              padding: '9px 11px',
              fontSize: '13.5px',
              width: '100%'
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px', opacity: 0.7 }}>Montant TTC (€) *</label>
          <input
            type="number"
            name="montantTTC"
            value={formData.montantTTC}
            onChange={handleChange}
            required
            step="0.01"
            style={{
              background: '#fff',
              border: '1px solid rgba(22,45,73,.25)',
              borderRadius: '7px',
              padding: '9px 11px',
              fontSize: '13.5px',
              width: '100%'
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px', opacity: 0.7 }}>Chantier</label>
          <input
            type="text"
            name="chantier"
            value={formData.chantier}
            onChange={handleChange}
            style={{
              background: '#fff',
              border: '1px solid rgba(22,45,73,.25)',
              borderRadius: '7px',
              padding: '9px 11px',
              fontSize: '13.5px',
              width: '100%'
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px', opacity: 0.7 }}>Statut *</label>
          <select
            name="statut"
            value={formData.statut}
            onChange={handleChange}
            required
            style={{
              background: '#fff',
              border: '1px solid rgba(22,45,73,.25)',
              borderRadius: '7px',
              padding: '9px 11px',
              fontSize: '13.5px',
              width: '100%'
            }}
          >
            <option value="à payer">À payer</option>
            <option value="payée">Payée</option>
          </select>
        </div>

        {formData.statut === 'payée' && (
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px', opacity: 0.7 }}>Date paiement *</label>
            <input
              type="date"
              name="datePaiement"
              value={formData.datePaiement}
              onChange={handleChange}
              required
              style={{
                background: '#fff',
                border: '1px solid rgba(22,45,73,.25)',
                borderRadius: '7px',
                padding: '9px 11px',
                fontSize: '13.5px',
                width: '100%'
              }}
            />
          </div>
        )}

        <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '9px' }}>
          <button
            type="submit"
            style={{
              background: '#2E7D46',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '11px 22px',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            {facture ? 'Modifier' : 'Enregistrer'}
          </button>
          <button
            type="button"
            onClick={onAnnuler}
            style={{
              background: '#fff',
              border: '1px solid rgba(22,45,73,.25)',
              borderRadius: '7px',
              padding: '10px 16px',
              fontSize: '13.5px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Annuler
          </button>
        </div>
      </form>
    </div>
  );
}

function AnnuaireFournisseurs({ fournisseurs, onAjouter, onModifier, onSupprimer }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ nom: '' });
  const [erreur, setErreur] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setErreur('');

    if (!formData.nom.trim()) {
      setErreur('Le nom est requis');
      return;
    }

    // Vérifier les doublons (sauf si on edit le même)
    const nomExiste = fournisseurs.some(f => 
      f.nom.toLowerCase() === formData.nom.trim().toLowerCase() && 
      f.id !== editingId
    );

    if (nomExiste) {
      setErreur('Ce fournisseur existe déjà');
      return;
    }

    if (editingId) {
      onModifier({ ...formData, id: editingId });
    } else {
      onAjouter({ nom: formData.nom.trim() });
    }

    setFormData({ nom: '' });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (fournisseur) => {
    setFormData({ nom: fournisseur.nom });
    setEditingId(fournisseur.id);
    setShowForm(true);
    setErreur('');
  };

  const handleAnnuler = () => {
    setFormData({ nom: '' });
    setEditingId(null);
    setShowForm(false);
    setErreur('');
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: '9px', marginBottom: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <b style={{ fontSize: '14.5px' }}>Fournisseurs / Sous-traitants</b>
        <div style={{ flex: 1 }}></div>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            background: '#162D49',
            color: '#fff',
            border: 'none',
            borderRadius: '7px',
            padding: '10px 16px',
            fontSize: '13.5px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          <Plus size={18} style={{ marginRight: '6px', display: 'inline' }} /> Ajouter
        </button>
      </div>

      {showForm && (
        <div style={{
          background: 'rgba(201,162,39,.10)',
          border: '1px solid rgba(201,162,39,.4)',
          borderRadius: '10px',
          padding: '14px 15px',
          marginBottom: '16px'
        }}>
          <form onSubmit={handleSubmit}>
            {erreur && (
              <div style={{
                background: 'rgba(179,53,44,.15)',
                color: '#B3352C',
                padding: '9px 11px',
                borderRadius: '7px',
                marginBottom: '9px',
                fontSize: '13px'
              }}>
                ⚠️ {erreur}
              </div>
            )}
            <input
              type="text"
              placeholder="Nom du fournisseur / sous-traitant"
              value={formData.nom}
              onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
              required
              autoFocus
              style={{
                background: '#fff',
                border: '1px solid rgba(22,45,73,.25)',
                borderRadius: '7px',
                padding: '9px 11px',
                fontSize: '13.5px',
                width: '100%',
                marginBottom: '9px'
              }}
            />
            <div style={{ display: 'flex', gap: '9px' }}>
              <button
                type="submit"
                style={{
                  background: '#2E7D46',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '11px 22px',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {editingId ? 'Modifier' : 'Ajouter'}
              </button>
              <button
                type="button"
                onClick={handleAnnuler}
                style={{
                  background: '#fff',
                  border: '1px solid rgba(22,45,73,.25)',
                  borderRadius: '7px',
                  padding: '10px 16px',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '12px'
      }}>
        {fournisseurs.map(f => (
          <div key={f.id} style={{
            background: '#fff',
            borderRadius: '10px',
            padding: '13px 15px',
            boxShadow: '0 1px 4px rgba(22,45,73,.10)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <b style={{ fontSize: '15.5px', marginBottom: '10px', color: '#162D49' }}>{f.nom}</b>
            <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
              <button
                onClick={() => handleEdit(f)}
                style={{
                  flex: 1,
                  background: '#C9A227',
                  color: '#162D49',
                  border: 'none',
                  borderRadius: '7px',
                  padding: '8px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                ✎ Modifier
              </button>
              <button
                onClick={() => onSupprimer(f.id)}
                style={{
                  flex: 1,
                  background: '#B3352C',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '7px',
                  padding: '8px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                🗑️ Supprimer
              </button>
            </div>
          </div>
        ))}
      </div>

      {fournisseurs.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '20px',
          color: '#888',
          fontSize: '14px'
        }}>
          Aucun fournisseur pour le moment
        </div>
      )}
    </div>
  );
}
