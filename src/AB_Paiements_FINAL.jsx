import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';

// API Google Sheets
const useGoogleSheets = () => {
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
      console.error(`Erreur API:`, error);
      return null;
    }
  };

  return {
    getFactures: () => callAPI('getFactures'),
    addFacture: (f) => callAPI('addFacture', f),
    updateFacture: (f) => callAPI('updateFacture', f),
    deleteFacture: (id) => callAPI('deleteFacture', { id })
  };
};

export default function ABPaiements() {
  const gs = useGoogleSheets();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [factures, setFactures] = useState([]);
  const [fournisseurs, setFournisseurs] = useState([]);
  const [editingFacture, setEditingFacture] = useState(null);
  const [editingFournisseur, setEditingFournisseur] = useState(null);
  const [showFormulaire, setShowFormulaire] = useState(false);
  const [factureToPay, setFactureToPay] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    // Charger depuis localStorage
    const savedFactures = localStorage.getItem('ab_factures');
    const savedFournisseurs = localStorage.getItem('ab_fournisseurs');
    
    if (savedFactures) {
      setFactures(JSON.parse(savedFactures));
    }
    if (savedFournisseurs) {
      setFournisseurs(JSON.parse(savedFournisseurs));
    }
    
    setLoading(false);
  };

  const handleAjouterFournisseur = async (newFourn) => {
    if (!fournisseurs.find(f => f.nom.toLowerCase() === newFourn.nom.toLowerCase())) {
      const newFournisseur = { id: Math.random().toString(36).substr(2, 9), ...newFourn };
      const updatedFournisseurs = [...fournisseurs, newFournisseur];
      setFournisseurs(updatedFournisseurs);
      localStorage.setItem('ab_fournisseurs', JSON.stringify(updatedFournisseurs));
    }
  };

  const handleModifierFournisseur = (updatedFourn) => {
    const updated = fournisseurs.map(f => f.id === updatedFourn.id ? updatedFourn : f);
    setFournisseurs(updated);
    localStorage.setItem('ab_fournisseurs', JSON.stringify(updated));
    setEditingFournisseur(null);
  };

  const handleSupprimerFournisseur = (id) => {
    if (window.confirm('Supprimer ce fournisseur ?')) {
      const updated = fournisseurs.filter(f => f.id !== id);
      setFournisseurs(updated);
      localStorage.setItem('ab_fournisseurs', JSON.stringify(updated));
    }
  };

  const handleChangeTab = (tabId) => {
    setActiveTab(tabId);
    setShowFormulaire(false);
    setEditingFacture(null);
  };

  const handlePayer = (facture) => {
    setFactureToPay(facture);
  };

  const handleConfirmerPaiement = (facturePayee) => {
    let updatedFactures = factures.map(f => f.id === facturePayee.id ? facturePayee : f);
    setFactures(updatedFactures);
    localStorage.setItem('ab_factures', JSON.stringify(updatedFactures));
    setFactureToPay(null);
  };

  const handleSauvegarder = async (nouvelleFacture) => {
    let updatedFactures;
    if (editingFacture) {
      updatedFactures = factures.map(f => f.id === editingFacture.id ? { ...nouvelleFacture, id: editingFacture.id } : f);
    } else {
      const newId = Math.random().toString(36).substr(2, 9);
      updatedFactures = [...factures, { ...nouvelleFacture, id: newId }];
    }
    setFactures(updatedFactures);
    localStorage.setItem('ab_factures', JSON.stringify(updatedFactures));
    setEditingFacture(null);
    setShowFormulaire(false);
  };

  const handleSupprimer = async (id) => {
    if (window.confirm('Êtes-vous sûr ?')) {
      const updatedFactures = factures.filter(f => f.id !== id);
      setFactures(updatedFactures);
      localStorage.setItem('ab_factures', JSON.stringify(updatedFactures));
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00Z');
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const sortByEcheance = (factures) => {
    return [...factures].sort((a, b) => new Date(a.dateEcheance) - new Date(b.dateEcheance));
  };

  const formatMontant = (montant) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }).format(montant);
  };

  const estEnRetard = (dateEcheance, statut) => {
    if (statut === 'payée') return false;
    return new Date(dateEcheance) < new Date();
  };

  const estEcheanceProche = (dateEcheance, statut) => {
    if (statut === 'payée') return false;
    const d = new Date(dateEcheance);
    const limite = new Date();
    limite.setDate(limite.getDate() + 7);
    return d >= new Date() && d <= limite;
  };

  const totalAPayer = factures.filter(f => f.statut === 'à payer').reduce((sum, f) => sum + (parseFloat(f.montantTTC) || 0), 0);
  const totalEnRetard = factures.filter(f => estEnRetard(f.dateEcheance, f.statut)).reduce((sum, f) => sum + (parseFloat(f.montantTTC) || 0), 0);
  const factureBientot = sortByEcheance(factures.filter(f => estEcheanceProche(f.dateEcheance, f.statut)));

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center', color: '#162D49' }}>⏳ Chargement...</div>;
  }

  return (
    <div style={{ backgroundColor: '#F5F4F0', color: '#162D49', minHeight: '100vh' }}>
      {/* HEADER */}
      <div style={{ backgroundColor: '#162D49', color: '#fff', padding: '14px 16px', position: 'sticky', top: 0, zIndex: 20 }}>
        <div style={{ maxWidth: '980px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '11px' }}>
            <b style={{ fontSize: '21px' }}>AB – Paiements</b>
            <span style={{ fontSize: '10.5px', color: '#D4B76A', letterSpacing: '.12em', textTransform: 'uppercase' }}>Fournisseurs</span>
          </div>

          {/* Onglets et actions */}
          <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap' }}>
              {[
                { id: 'dashboard', label: 'Tableau de bord' },
                { id: 'a-payer', label: 'À payer' },
                { id: 'payees', label: 'Payées' },
                { id: 'fournisseurs', label: 'Fournisseurs' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => handleChangeTab(tab.id)}
                  style={{
                    border: activeTab === tab.id ? '1px solid #C9A227' : '1px solid rgba(255,255,255,.35)',
                    background: activeTab === tab.id ? '#D4B76A' : 'transparent',
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
            <button
              onClick={() => { setShowFormulaire(true); setEditingFacture(null); }}
              style={{
                background: '#fff',
                color: '#162D49',
                border: 'none',
                borderRadius: '7px',
                padding: '8px 14px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap'
              }}
            >
              <Plus size={18} /> Nouvelle facture
            </button>
          </div>
        </div>
      </div>

      {/* BODY */}
      <div style={{ padding: '14px 12px 26px', maxWidth: '980px', margin: '0 auto' }}>
        {showFormulaire && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}>
            <div style={{
              background: '#fff',
              borderRadius: '12px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
              maxWidth: '900px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              padding: '20px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <b style={{ fontSize: '16px', color: '#162D49' }}>Nouvelle facture</b>
                <button onClick={() => { setShowFormulaire(false); setEditingFacture(null); }} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#999' }}>✕</button>
              </div>
              <FormulaireFacture
                facture={editingFacture}
                fournisseurs={fournisseurs}
                onSauvegarder={handleSauvegarder}
                onAnnuler={() => { setShowFormulaire(false); setEditingFacture(null); }}
                onAjouterFournisseur={handleAjouterFournisseur}
              />
            </div>
          </div>
        )}

        {/* TABLEAU DE BORD */}
        {activeTab === 'dashboard' && (
          <div>
            <b style={{ fontSize: '14.5px', marginBottom: '12px', display: 'block' }}>Tableau de bord</b>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '9px', marginBottom: '20px' }}>
              <StatCard titre="À payer" montant={formatMontant(totalAPayer)} bg="rgba(224,128,128,.15)" color="#E08080" />
              <StatCard titre="En retard" montant={formatMontant(totalEnRetard)} bg="rgba(232,182,110,.15)" color="#E8B66E" />
            </div>

            {factureBientot.length > 0 && (
              <div style={{ background: 'rgba(212,183,106,.15)', border: '1px solid rgba(212,183,106,.3)', borderRadius: '10px', padding: '12px 15px', marginBottom: '20px' }}>
                <b style={{ fontSize: '13px', display: 'block', marginBottom: '8px' }}>📅 Échéances proches ({factureBientot.length})</b>
                {factureBientot.map(f => (
                  <div key={f.id} style={{ fontSize: '12px', paddingBottom: '6px' }}>
                    {f.fournisseur} - {formatMontant(f.montantTTC)} - {formatDate(f.dateEcheance)}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* À PAYER */}
        {activeTab === 'a-payer' && (
          <div>
            <b style={{ fontSize: '14.5px', marginBottom: '12px', display: 'block' }}>Factures à payer</b>
            <TableFactures
              factures={sortByEcheance(factures.filter(f => f.statut === 'à payer'))}
              onEdit={(f) => { setEditingFacture(f); setShowFormulaire(true); }}
              onDelete={handleSupprimer}
              onPayer={handlePayer}
              estEnRetard={estEnRetard}
              estEcheanceProche={estEcheanceProche}
              formatDate={formatDate}
              formatMontant={formatMontant}
            />
          </div>
        )}

        {/* PAYÉES */}
        {activeTab === 'payees' && (
          <div>
            <b style={{ fontSize: '14.5px', marginBottom: '12px', display: 'block' }}>Factures payées</b>
            <TableFactures
              factures={sortByEcheance(factures.filter(f => f.statut === 'payée'))}
              onEdit={(f) => { setEditingFacture(f); setShowFormulaire(true); }}
              onDelete={handleSupprimer}
              estEnRetard={estEnRetard}
              estEcheanceProche={estEcheanceProche}
              formatDate={formatDate}
              formatMontant={formatMontant}
            />
          </div>
        )}
        {/* FOURNISSEURS */}
        {activeTab === 'fournisseurs' && (
          <GestionFournisseurs
            fournisseurs={fournisseurs}
            onAjouter={handleAjouterFournisseur}
            onModifier={handleModifierFournisseur}
            onSupprimer={handleSupprimerFournisseur}
            editingId={editingFournisseur}
            setEditingId={setEditingFournisseur}
          />
        )}
      </div>

      {factureToPay && (
        <ModalPaiement
          facture={factureToPay}
          onConfirmer={handleConfirmerPaiement}
          onAnnuler={() => setFactureToPay(null)}
        />
      )}
    </div>
  );
}

function StatCard({ titre, montant, bg, color }) {
  return (
    <div style={{ background: '#fff', borderLeft: `4px solid ${color}`, borderRadius: '8px', padding: '12px 15px', boxShadow: '0 1px 4px rgba(22,45,73,.10)' }}>
      <small style={{ display: 'block', color: '#888', fontSize: '11px', textTransform: 'uppercase', marginBottom: '6px' }}>{titre}</small>
      <b style={{ fontSize: '18px', color: color }}>{montant}</b>
    </div>
  );
}

function TableFactures({ factures, onEdit, onDelete, onPayer, estEnRetard, estEcheanceProche, formatDate, formatMontant }) {
  if (factures.length === 0) {
    return <div style={{ textAlign: 'center', padding: '20px', color: '#888' }}>Aucune facture</div>;
  }

  // Grouper les factures par mois/année
  const groupByMonth = () => {
    const groups = {};
    factures.forEach(f => {
      const date = new Date(f.dateEcheance + 'T00:00:00Z');
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!groups[monthKey]) {
        groups[monthKey] = [];
      }
      groups[monthKey].push(f);
    });
    return groups;
  };

  const monthGroups = groupByMonth();
  const sortedMonths = Object.keys(monthGroups).sort();

  const getMonthLabel = (monthKey) => {
    const [year, month] = monthKey.split('-');
    const date = new Date(year, parseInt(month) - 1);
    return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  };

  return (
    <div style={{ overflowX: 'auto' }}>
      {sortedMonths.map(monthKey => (
        <div key={monthKey} style={{ marginBottom: '20px' }}>
          <div style={{ background: '#162D49', color: '#fff', padding: '10px 15px', borderRadius: '8px 8px 0 0', fontSize: '14px', fontWeight: 700, textTransform: 'capitalize' }}>
            📅 {getMonthLabel(monthKey)}
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f0f0f0', borderBottom: '1px solid #ddd' }}>
                <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>Fournisseur</th>
                <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>N° facture</th>
                <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>Montant TTC</th>
                <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>Échéance</th>
                <th style={{ padding: '10px', textAlign: 'center', fontSize: '12px', fontWeight: 600 }}>Statut</th>
                <th style={{ padding: '10px', textAlign: 'center', fontSize: '12px', fontWeight: 600 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {monthGroups[monthKey].map((f, i) => (
                <tr key={f.id} style={{ background: i % 2 ? '#fff' : '#FAF9F6', borderBottom: '1px solid rgba(22,45,73,.10)' }}>
                  <td style={{ padding: '10px', fontSize: '13px' }}>{f.fournisseur}</td>
                  <td style={{ padding: '10px', fontSize: '13px' }}>{f.numero}</td>
                  <td style={{ padding: '10px', fontSize: '13px', fontWeight: 600 }}>{formatMontant(f.montantTTC)}</td>
                  <td style={{ padding: '10px', fontSize: '13px' }}>{formatDate(f.dateEcheance)}</td>
                  <td style={{ padding: '10px', textAlign: 'center', fontSize: '11px' }}>
                    {estEnRetard(f.dateEcheance, f.statut) && <span style={{ background: '#E08080', color: '#fff', padding: '3px 8px', borderRadius: '4px' }}>⚠️ Retard</span>}
                    {estEcheanceProche(f.dateEcheance, f.statut) && <span style={{ background: '#E8B66E', color: '#fff', padding: '3px 8px', borderRadius: '4px' }}>⏰ Bientôt</span>}
                    {f.statut === 'à payer' && !estEnRetard(f.dateEcheance, f.statut) && !estEcheanceProche(f.dateEcheance, f.statut) && <span style={{ background: '#162D49', color: '#fff', padding: '3px 8px', borderRadius: '4px' }}>À payer</span>}
                    {f.statut === 'payée' && <span style={{ background: '#7BB38F', color: '#fff', padding: '3px 8px', borderRadius: '4px' }}>✓ Payée</span>}
                  </td>
                  <td style={{ padding: '10px', textAlign: 'center' }}>
                    {onPayer && f.statut === 'à payer' && (
                      <button onClick={() => onPayer(f)} style={{ background: '#7BB38F', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', marginRight: '4px', fontSize: '12px', fontWeight: 600 }}>✓ Payer</button>
                    )}
                    <button onClick={() => onEdit(f)} style={{ background: '#D4B76A', color: '#162D49', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', marginRight: '4px', fontSize: '12px' }}>✎</button>
                    <button onClick={() => onDelete(f.id)} style={{ background: '#E08080', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '12px' }}>🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

function FormulaireFacture({ facture, fournisseurs, onSauvegarder, onAnnuler, onAjouterFournisseur }) {
  const [formData, setFormData] = useState(facture || {
    fournisseur: '',
    typeFournisseur: '',
    numero: '',
    dateFacture: new Date().toISOString().split('T')[0],
    dateEcheance: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    montantTTC: '',
    chantier: '',
    statut: 'à payer',
    datePaiement: '',
  });
  const [newFournisseur, setNewFournisseur] = useState({ nom: '', type: '' });

  // Réinitialiser le formulaire quand facture change
  useEffect(() => {
    if (facture) {
      setFormData(facture);
    } else {
      setFormData({
        fournisseur: '',
        typeFournisseur: '',
        numero: '',
        dateFacture: new Date().toISOString().split('T')[0],
        dateEcheance: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        montantTTC: '',
        chantier: '',
        statut: 'à payer',
        datePaiement: '',
      });
    }
  }, [facture]);

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

  const handleAjouterNewFournisseur = () => {
    if (newFournisseur.nom.trim()) {
      onAjouterFournisseur(newFournisseur);
      setFormData({ ...formData, fournisseur: newFournisseur.nom, typeFournisseur: newFournisseur.type });
      setNewFournisseur({ nom: '', type: '' });
    }
  };

  return (
    <div style={{ background: 'rgba(212,183,106,.10)', border: '1px solid rgba(212,183,106,.4)', borderRadius: '10px', padding: '14px 15px', marginBottom: '16px' }}>
      <h4 style={{ margin: '0 0 11px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '.1em' }}>
        {facture ? 'Modifier la facture' : 'Nouvelle facture'}
      </h4>
      
      <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '9px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px', opacity: 0.7 }}>Fournisseur / Sous-traitant *</label>
          <select
            name="fournisseur"
            value={formData.fournisseur}
            onChange={(e) => {
              const fourn = fournisseurs.find(f => f.nom === e.target.value);
              setFormData({ ...formData, fournisseur: e.target.value, typeFournisseur: fourn?.type || '' });
            }}
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
              <option key={f.id} value={f.nom}>{f.nom} {f.type ? `(${f.type})` : ''}</option>
            ))}
            <option value="__new__">➕ Créer nouveau</option>
          </select>
        </div>

        {formData.fournisseur === '__new__' && (
          <>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px', opacity: 0.7 }}>Nom *</label>
              <input
                type="text"
                value={newFournisseur.nom}
                onChange={(e) => setNewFournisseur({ ...newFournisseur, nom: e.target.value })}
                placeholder="Nom du fournisseur"
                style={{ background: '#fff', border: '1px solid rgba(22,45,73,.25)', borderRadius: '7px', padding: '9px 11px', fontSize: '13.5px', width: '100%' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px', opacity: 0.7 }}>Type / Métier</label>
              <input
                type="text"
                value={newFournisseur.type}
                onChange={(e) => setNewFournisseur({ ...newFournisseur, type: e.target.value })}
                placeholder="Ex: Plombier, Électricien..."
                style={{ background: '#fff', border: '1px solid rgba(22,45,73,.25)', borderRadius: '7px', padding: '9px 11px', fontSize: '13.5px', width: '100%' }}
              />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <button
                type="button"
                onClick={handleAjouterNewFournisseur}
                style={{ background: '#7BB38F', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', marginRight: '8px' }}
              >
                Ajouter le fournisseur
              </button>
              <button
                type="button"
                onClick={() => { setFormData({ ...formData, fournisseur: '' }); setNewFournisseur({ nom: '', type: '' }); }}
                style={{ background: '#fff', border: '1px solid rgba(22,45,73,.25)', borderRadius: '7px', padding: '8px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
              >
                Annuler
              </button>
            </div>
          </>
        )}

        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px', opacity: 0.7 }}>N° facture</label>
          <input type="text" name="numero" value={formData.numero} onChange={handleChange} style={{ background: '#fff', border: '1px solid rgba(22,45,73,.25)', borderRadius: '7px', padding: '9px 11px', fontSize: '13.5px', width: '100%' }} />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px', opacity: 0.7 }}>Date facture *</label>
          <input type="date" name="dateFacture" value={formData.dateFacture} onChange={handleChange} required style={{ background: '#fff', border: '1px solid rgba(22,45,73,.25)', borderRadius: '7px', padding: '9px 11px', fontSize: '13.5px', width: '100%' }} />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px', opacity: 0.7 }}>Échéance *</label>
          <input type="date" name="dateEcheance" value={formData.dateEcheance} onChange={handleChange} required style={{ background: '#fff', border: '1px solid rgba(22,45,73,.25)', borderRadius: '7px', padding: '9px 11px', fontSize: '13.5px', width: '100%' }} />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px', opacity: 0.7 }}>Montant TTC (€) *</label>
          <input type="number" name="montantTTC" value={formData.montantTTC} onChange={handleChange} required step="0.01" style={{ background: '#fff', border: '1px solid rgba(22,45,73,.25)', borderRadius: '7px', padding: '9px 11px', fontSize: '13.5px', width: '100%' }} />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px', opacity: 0.7 }}>Chantier</label>
          <input type="text" name="chantier" value={formData.chantier} onChange={handleChange} style={{ background: '#fff', border: '1px solid rgba(22,45,73,.25)', borderRadius: '7px', padding: '9px 11px', fontSize: '13.5px', width: '100%' }} />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px', opacity: 0.7 }}>Statut *</label>
          <select name="statut" value={formData.statut} onChange={handleChange} required style={{ background: '#fff', border: '1px solid rgba(22,45,73,.25)', borderRadius: '7px', padding: '9px 11px', fontSize: '13.5px', width: '100%' }}>
            <option value="à payer">À payer</option>
            <option value="payée">Payée</option>
          </select>
        </div>

        {formData.statut === 'payée' && (
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px', opacity: 0.7 }}>Date paiement *</label>
            <input type="date" name="datePaiement" value={formData.datePaiement} onChange={handleChange} required style={{ background: '#fff', border: '1px solid rgba(22,45,73,.25)', borderRadius: '7px', padding: '9px 11px', fontSize: '13.5px', width: '100%' }} />
          </div>
        )}

        <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '9px', justifyContent: 'flex-end' }}>
          <button type="submit" style={{ background: '#7BB38F', color: '#fff', border: 'none', borderRadius: '8px', padding: '11px 22px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>
            Enregistrer
          </button>
          <button type="button" onClick={onAnnuler} style={{ background: '#fff', border: '1px solid rgba(22,45,73,.25)', borderRadius: '7px', padding: '10px 16px', fontSize: '13.5px', fontWeight: 600, cursor: 'pointer' }}>
            Annuler
          </button>
        </div>
      </form>
    </div>
  );
}

// Modal pour payer rapidement
function ModalPaiement({ facture, onConfirmer, onAnnuler }) {
  const [datePaiement, setDatePaiement] = useState(new Date().toISOString().split('T')[0]);

  const handleConfirm = () => {
    onConfirmer({
      ...facture,
      statut: 'payée',
      datePaiement: datePaiement
    });
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.3)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: '#fff',
        borderRadius: '10px',
        padding: '20px',
        maxWidth: '400px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
      }}>
        <h3 style={{ margin: '0 0 15px', fontSize: '16px', color: '#162D49' }}>Marquer comme payée</h3>
        <div style={{ marginBottom: '15px' }}>
          <p style={{ margin: '0 0 8px', fontSize: '14px', color: '#666' }}>
            <b>{facture.fournisseur}</b> - {facture.numero}
          </p>
          <p style={{ margin: '0', fontSize: '14px', color: '#888' }}>Montant : <b>{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(facture.montantTTC)}</b></p>
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '5px', opacity: 0.7 }}>Date de paiement *</label>
          <input
            type="date"
            value={datePaiement}
            onChange={(e) => setDatePaiement(e.target.value)}
            style={{
              background: '#fff',
              border: '1px solid rgba(22,45,73,.25)',
              borderRadius: '7px',
              padding: '9px 11px',
              fontSize: '13.5px',
              width: '100%',
              boxSizing: 'border-box'
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: '9px' }}>
          <button
            onClick={handleConfirm}
            style={{
              flex: 1,
              background: '#7BB38F',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '11px 16px',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            ✓ Payer
          </button>
          <button
            onClick={onAnnuler}
            style={{
              flex: 1,
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
      </div>
    </div>
  );
}

function GestionFournisseurs({ fournisseurs, onAjouter, onModifier, onSupprimer, editingId, setEditingId }) {
  const [formData, setFormData] = useState({ nom: '', type: '' });
  const [showForm, setShowForm] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingId) {
      onModifier({ id: editingId, nom: formData.nom, type: formData.type });
      setEditingId(null);
    } else {
      onAjouter(formData);
    }
    setFormData({ nom: '', type: '' });
    setShowForm(false);
  };

  const handleEdit = (fourn) => {
    setFormData({ nom: fourn.nom, type: fourn.type });
    setEditingId(fourn.id);
    setShowForm(true);
  };

  const handleCancel = () => {
    setFormData({ nom: '', type: '' });
    setEditingId(null);
    setShowForm(false);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <b style={{ fontSize: '14.5px' }}>Fournisseurs / Sous-traitants</b>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{ background: '#162D49', color: '#fff', border: 'none', borderRadius: '7px', padding: '10px 16px', fontSize: '13.5px', fontWeight: 600, cursor: 'pointer' }}
        >
          ➕ Ajouter
        </button>
      </div>

      {showForm && (
        <div style={{ background: 'rgba(212,183,106,.10)', border: '1px solid rgba(212,183,106,.4)', borderRadius: '10px', padding: '14px 15px', marginBottom: '16px' }}>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '9px', alignItems: 'flex-end' }}>
            <input
              type="text"
              placeholder="Nom du fournisseur"
              value={formData.nom}
              onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
              required
              style={{ background: '#fff', border: '1px solid rgba(22,45,73,.25)', borderRadius: '7px', padding: '9px 11px', fontSize: '13.5px' }}
            />
            <input
              type="text"
              placeholder="Type / Métier (ex: Plombier)"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              style={{ background: '#fff', border: '1px solid rgba(22,45,73,.25)', borderRadius: '7px', padding: '9px 11px', fontSize: '13.5px' }}
            />
            <button type="submit" style={{ background: '#7BB38F', color: '#fff', border: 'none', borderRadius: '8px', padding: '9px 16px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>
              {editingId ? 'Modifier' : 'Ajouter'}
            </button>
            <button type="button" onClick={handleCancel} style={{ background: '#fff', border: '1px solid rgba(22,45,73,.25)', borderRadius: '7px', padding: '9px 16px', fontSize: '13.5px', fontWeight: 600, cursor: 'pointer' }}>
              Annuler
            </button>
          </form>
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#162D49', color: '#fff' }}>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600 }}>Fournisseur</th>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600 }}>Type / Métier</th>
              <th style={{ padding: '12px', textAlign: 'center', fontSize: '13px', fontWeight: 600 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {fournisseurs.map((f, i) => (
              <tr key={f.id} style={{ background: i % 2 ? '#fff' : '#FAF9F6', borderBottom: '1px solid rgba(22,45,73,.10)' }}>
                <td style={{ padding: '12px', fontSize: '13px', fontWeight: 600, color: '#162D49' }}>{f.nom}</td>
                <td style={{ padding: '12px', fontSize: '13px', color: '#666' }}>{f.type || '-'}</td>
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  <button
                    onClick={() => handleEdit(f)}
                    style={{ background: '#D4B76A', color: '#162D49', border: 'none', borderRadius: '7px', padding: '6px 12px', marginRight: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    ✎ Modifier
                  </button>
                  <button
                    onClick={() => onSupprimer(f.id)}
                    style={{ background: '#E08080', color: '#fff', border: 'none', borderRadius: '7px', padding: '6px 12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    🗑️ Supprimer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {fournisseurs.length === 0 && (
        <div style={{ textAlign: 'center', padding: '20px', color: '#888', fontSize: '14px' }}>
          Aucun fournisseur pour le moment
        </div>
      )}
    </div>
  );
}
