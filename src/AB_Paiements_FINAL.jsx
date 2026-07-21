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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const data = await gs.getFactures();
    if (data && Array.isArray(data)) {
      setFactures(data);
      // Extraire les fournisseurs uniques des factures
      const fourns = data
        .filter(f => f.fournisseur)
        .map(f => ({ id: Math.random().toString(36).substr(2, 9), nom: f.fournisseur, type: f.typeFournisseur || '' }));
      const uniqueFourns = [];
      const seen = new Set();
      fourns.forEach(f => {
        if (!seen.has(f.nom)) {
          seen.add(f.nom);
          uniqueFourns.push(f);
        }
      });
      setFournisseurs(uniqueFourns);
    }
    setLoading(false);
  };

  const handleAjouterFournisseur = async (newFourn) => {
    if (!fournisseurs.find(f => f.nom.toLowerCase() === newFourn.nom.toLowerCase())) {
      const newFournisseur = { id: Math.random().toString(36).substr(2, 9), ...newFourn };
      setFournisseurs([...fournisseurs, newFournisseur]);
    }
  };

  const handleModifierFournisseur = (updatedFourn) => {
    setFournisseurs(fournisseurs.map(f => f.id === updatedFourn.id ? updatedFourn : f));
    setEditingFournisseur(null);
  };

  const handleSupprimerFournisseur = (id) => {
    if (window.confirm('Supprimer ce fournisseur ?')) {
      setFournisseurs(fournisseurs.filter(f => f.id !== id));
    }
  };

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

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00Z');
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
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

  const totalAPayer = factures.filter(f => f.statut === 'à payer').reduce((sum, f) => sum + (f.montantTTC || 0), 0);
  const totalEnRetard = factures.filter(f => estEnRetard(f.dateEcheance, f.statut)).reduce((sum, f) => sum + (f.montantTTC || 0), 0);
  const factureBientot = factures.filter(f => estEcheanceProche(f.dateEcheance, f.statut));

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
            <span style={{ fontSize: '10.5px', color: '#C9A227', letterSpacing: '.12em', textTransform: 'uppercase' }}>Fournisseurs</span>
          </div>

          {/* Onglets */}
          <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap' }}>
            {[
              { id: 'dashboard', label: 'Tableau de bord' },
              { id: 'a-payer', label: 'À payer' },
              { id: 'payees', label: 'Payées' },
              { id: 'fournisseurs', label: 'Fournisseurs' }
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
            <b style={{ fontSize: '14.5px', marginBottom: '12px', display: 'block' }}>Tableau de bord</b>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '9px', marginBottom: '20px' }}>
              <StatCard titre="À payer" montant={formatMontant(totalAPayer)} bg="rgba(179,53,44,.10)" color="#B3352C" />
              <StatCard titre="En retard" montant={formatMontant(totalEnRetard)} bg="rgba(185,106,0,.10)" color="#B96A00" />
              <StatCard titre="Total" montant={formatMontant(factures.reduce((sum, f) => sum + (f.montantTTC || 0), 0))} bg="rgba(46,125,70,.10)" color="#2E7D46" />
            </div>

            {factureBientot.length > 0 && (
              <div style={{ background: 'rgba(201,162,39,.15)', border: '1px solid rgba(201,162,39,.3)', borderRadius: '10px', padding: '12px 15px', marginBottom: '20px' }}>
                <b style={{ fontSize: '13px', display: 'block', marginBottom: '8px' }}>📅 Échéances proches ({factureBientot.length})</b>
                {factureBientot.map(f => (
                  <div key={f.id} style={{ fontSize: '12px', paddingBottom: '6px' }}>
                    {f.fournisseur} - {formatMontant(f.montantTTC)} - {formatDate(f.dateEcheance)}
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => { setShowFormulaire(true); setEditingFacture(null); }}
              style={{ background: '#162D49', color: '#fff', border: 'none', borderRadius: '7px', padding: '10px 16px', fontSize: '13.5px', fontWeight: 600, cursor: 'pointer', marginBottom: '12px' }}
            >
              <Plus size={18} style={{ marginRight: '6px', display: 'inline' }} /> Nouvelle facture
            </button>
          </div>
        )}

        {/* À PAYER */}
        {activeTab === 'a-payer' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <b style={{ fontSize: '14.5px' }}>Factures à payer</b>
              <button
                onClick={() => { setShowFormulaire(true); setEditingFacture(null); }}
                style={{ background: '#162D49', color: '#fff', border: 'none', borderRadius: '7px', padding: '8px 12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                <Plus size={16} style={{ marginRight: '4px', display: 'inline' }} /> Ajouter
              </button>
            </div>
            <TableFactures
              factures={factures.filter(f => f.statut === 'à payer')}
              onEdit={(f) => { setEditingFacture(f); setShowFormulaire(true); }}
              onDelete={handleSupprimer}
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
              factures={factures.filter(f => f.statut === 'payée')}
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

function TableFactures({ factures, onEdit, onDelete, estEnRetard, estEcheanceProche, formatDate, formatMontant }) {
  if (factures.length === 0) {
    return <div style={{ textAlign: 'center', padding: '20px', color: '#888' }}>Aucune facture</div>;
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#162D49', color: '#fff' }}>
            <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>Fournisseur</th>
            <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>N° facture</th>
            <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>Montant TTC</th>
            <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>Échéance</th>
            <th style={{ padding: '10px', textAlign: 'center', fontSize: '12px', fontWeight: 600 }}>Statut</th>
            <th style={{ padding: '10px', textAlign: 'center', fontSize: '12px', fontWeight: 600 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {factures.map((f, i) => (
            <tr key={f.id} style={{ background: i % 2 ? '#fff' : '#FAF9F6', borderBottom: '1px solid rgba(22,45,73,.10)' }}>
              <td style={{ padding: '10px', fontSize: '13px' }}>{f.fournisseur}</td>
              <td style={{ padding: '10px', fontSize: '13px' }}>{f.numero}</td>
              <td style={{ padding: '10px', fontSize: '13px', fontWeight: 600 }}>{formatMontant(f.montantTTC)}</td>
              <td style={{ padding: '10px', fontSize: '13px' }}>{formatDate(f.dateEcheance)}</td>
              <td style={{ padding: '10px', textAlign: 'center', fontSize: '11px' }}>
                {estEnRetard(f.dateEcheance, f.statut) && <span style={{ background: '#B3352C', color: '#fff', padding: '3px 8px', borderRadius: '4px' }}>⚠️ Retard</span>}
                {estEcheanceProche(f.dateEcheance, f.statut) && <span style={{ background: '#B96A00', color: '#fff', padding: '3px 8px', borderRadius: '4px' }}>⏰ Bientôt</span>}
                {f.statut === 'payée' && <span style={{ background: '#2E7D46', color: '#fff', padding: '3px 8px', borderRadius: '4px' }}>✓ Payée</span>}
              </td>
              <td style={{ padding: '10px', textAlign: 'center' }}>
                <button onClick={() => onEdit(f)} style={{ background: '#C9A227', color: '#162D49', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', marginRight: '4px', fontSize: '12px' }}>✎</button>
                <button onClick={() => onDelete(f.id)} style={{ background: '#B3352C', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '12px' }}>🗑️</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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
    <div style={{ background: 'rgba(201,162,39,.10)', border: '1px solid rgba(201,162,39,.4)', borderRadius: '10px', padding: '14px 15px', marginBottom: '16px' }}>
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
                style={{ background: '#2E7D46', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', marginRight: '8px' }}
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
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px', opacity: 0.7 }}>N° facture *</label>
          <input type="text" name="numero" value={formData.numero} onChange={handleChange} required style={{ background: '#fff', border: '1px solid rgba(22,45,73,.25)', borderRadius: '7px', padding: '9px 11px', fontSize: '13.5px', width: '100%' }} />
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

        <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '9px' }}>
          <button type="submit" style={{ background: '#2E7D46', color: '#fff', border: 'none', borderRadius: '8px', padding: '11px 22px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>
            {facture ? 'Modifier' : 'Enregistrer'}
          </button>
          <button type="button" onClick={onAnnuler} style={{ background: '#fff', border: '1px solid rgba(22,45,73,.25)', borderRadius: '7px', padding: '10px 16px', fontSize: '13.5px', fontWeight: 600, cursor: 'pointer' }}>
            Annuler
          </button>
        </div>
      </form>
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
        <div style={{ background: 'rgba(201,162,39,.10)', border: '1px solid rgba(201,162,39,.4)', borderRadius: '10px', padding: '14px 15px', marginBottom: '16px' }}>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '9px' }}>
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
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '9px' }}>
              <button type="submit" style={{ background: '#2E7D46', color: '#fff', border: 'none', borderRadius: '8px', padding: '11px 22px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>
                {editingId ? 'Modifier' : 'Ajouter'}
              </button>
              <button type="button" onClick={handleCancel} style={{ background: '#fff', border: '1px solid rgba(22,45,73,.25)', borderRadius: '7px', padding: '10px 16px', fontSize: '13.5px', fontWeight: 600, cursor: 'pointer' }}>
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
        {fournisseurs.map(f => (
          <div key={f.id} style={{ background: '#fff', borderRadius: '10px', padding: '13px 15px', boxShadow: '0 1px 4px rgba(22,45,73,.10)' }}>
            <b style={{ fontSize: '15px', display: 'block', marginBottom: '6px', color: '#162D49' }}>{f.nom}</b>
            {f.type && <div style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>{f.type}</div>}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => handleEdit(f)}
                style={{ flex: 1, background: '#C9A227', color: '#162D49', border: 'none', borderRadius: '7px', padding: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                ✎ Modifier
              </button>
              <button
                onClick={() => onSupprimer(f.id)}
                style={{ flex: 1, background: '#B3352C', color: '#fff', border: 'none', borderRadius: '7px', padding: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                🗑️ Supprimer
              </button>
            </div>
          </div>
        ))}
      </div>

      {fournisseurs.length === 0 && (
        <div style={{ textAlign: 'center', padding: '20px', color: '#888', fontSize: '14px' }}>
          Aucun fournisseur pour le moment
        </div>
      )}
    </div>
  );
}
