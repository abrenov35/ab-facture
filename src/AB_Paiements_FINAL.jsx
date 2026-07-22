import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';

const API_URL = 'https://script.google.com/macros/s/AKfycbySr3kGVj6Uqjjj44_cV9teMMeZym8ayVWo2RX4RV76KO0Q_AWW8O4PJnKlwXJ1OFmkTw/exec';

function ABPaiements() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [fournisseurFiltre, setFournisseurFiltre] = useState('');
  const [anneeFiltre, setAnneeFiltre] = useState('');
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
    try {
      setLoading(true);
      
      // Charger les factures depuis Google Sheets
      const facResponse = await fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'getFactures' })
      });
      const facData = await facResponse.json();
      if (facData.success) {
        setFactures(facData.data);
      }
      
      // Charger les fournisseurs depuis Google Sheets
      const fournResponse = await fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'getFournisseurs' })
      });
      const fournData = await fournResponse.json();
      if (fournData.success) {
        setFournisseurs(fournData.data);
      }
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
      alert('Erreur de connexion à Google Sheets');
    } finally {
      setLoading(false);
    }
  };

  const handleAjouterFournisseur = async (newFourn) => {
    if (!fournisseurs.find(f => f.nom.toLowerCase() === newFourn.nom.toLowerCase())) {
      try {
        const response = await fetch(API_URL, {
          method: 'POST',
          body: JSON.stringify({ 
            action: 'addFournisseur',
            fournisseur: newFourn
          })
        });
        const data = await response.json();
        if (data.success) {
          setFournisseurs([...fournisseurs, data.data]);
        }
      } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur lors de l\'ajout du fournisseur');
      }
    }
  };

  const handleModifierFournisseur = async (updatedFourn) => {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify({ 
          action: 'updateFournisseur',
          id: updatedFourn.id,
          fournisseur: updatedFourn
        })
      });
      const data = await response.json();
      if (data.success) {
        const updated = fournisseurs.map(f => f.id === updatedFourn.id ? data.data : f);
        setFournisseurs(updated);
        setEditingFournisseur(null);
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la modification');
    }
  };

  const handleSupprimerFournisseur = async (id) => {
    if (window.confirm('Supprimer ce fournisseur ?')) {
      try {
        const response = await fetch(API_URL, {
          method: 'POST',
          body: JSON.stringify({ 
            action: 'deleteFournisseur',
            id: id
          })
        });
        const data = await response.json();
        if (data.success) {
          const updated = fournisseurs.filter(f => f.id !== id);
          setFournisseurs(updated);
        }
      } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur lors de la suppression');
      }
    }
  };

  const handleChangeTab = (tabId) => {
    setActiveTab(tabId);
    setShowFormulaire(false);
    setEditingFacture(null);
  };

  const facturesFiltrées = fournisseurFiltre 
    ? factures.filter(f => f.fournisseur === fournisseurFiltre)
    : factures;

  const facturesFiltreesPeriode = anneeFiltre
    ? facturesFiltrées.filter(f => new Date(f.dateEcheance).getFullYear().toString() === anneeFiltre)
    : facturesFiltrées;

  const handlePayer = (facture) => {
    setFactureToPay(facture);
  };

  const handleConfirmerPaiement = async (facturePayee) => {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify({ 
          action: 'updateFacture',
          id: facturePayee.id,
          facture: facturePayee
        })
      });
      const data = await response.json();
      if (data.success) {
        let updatedFactures = factures.map(f => f.id === facturePayee.id ? data.data : f);
        setFactures(updatedFactures);
        setFactureToPay(null);
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors du paiement');
    }
  };

  const handleSauvegarder = async (nouvelleFacture) => {
    try {
      let response;
      if (editingFacture) {
        // Mise à jour
        response = await fetch(API_URL, {
          method: 'POST',
          body: JSON.stringify({ 
            action: 'updateFacture',
            id: editingFacture.id,
            facture: { ...nouvelleFacture, id: editingFacture.id }
          })
        });
      } else {
        // Création
        response = await fetch(API_URL, {
          method: 'POST',
          body: JSON.stringify({ 
            action: 'addFacture',
            facture: nouvelleFacture
          })
        });
      }
      
      const data = await response.json();
      if (data.success) {
        if (editingFacture) {
          const updatedFactures = factures.map(f => f.id === editingFacture.id ? data.data : f);
          setFactures(updatedFactures);
        } else {
          setFactures([...factures, data.data]);
        }
        setEditingFacture(null);
        setShowFormulaire(false);
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de l\'enregistrement');
    }
  };

  const handleSupprimer = async (id) => {
    if (window.confirm('Êtes-vous sûr ?')) {
      try {
        const response = await fetch(API_URL, {
          method: 'POST',
          body: JSON.stringify({ 
            action: 'deleteFacture',
            id: id
          })
        });
        const data = await response.json();
        if (data.success) {
          const updatedFactures = factures.filter(f => f.id !== id);
          setFactures(updatedFactures);
        }
      } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur lors de la suppression');
      }
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

  const groupFacturesByMonth = (factures) => {
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

  const getMonthLabel = (monthKey) => {
    const [year, month] = monthKey.split('-');
    const date = new Date(year, parseInt(month) - 1);
    return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
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

  const totalAPayer = facturesFiltrées.filter(f => f.statut === 'à payer' && !estEnRetard(f.dateEcheance, f.statut)).reduce((sum, f) => sum + (parseFloat(f.montantTTC) || 0), 0);
  const totalEnRetard = facturesFiltrées.filter(f => estEnRetard(f.dateEcheance, f.statut)).reduce((sum, f) => sum + (parseFloat(f.montantTTC) || 0), 0);
  const totalPayees = facturesFiltrées.filter(f => f.statut === 'payée').reduce((sum, f) => sum + (parseFloat(f.montantTTC) || 0), 0);
  const totalGlobal = totalAPayer + totalEnRetard + totalPayees;
  const factureBientot = sortByEcheance(facturesFiltrées.filter(f => estEcheanceProche(f.dateEcheance, f.statut)));

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
            
            {/* Dropdown filtre fournisseur */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <select
                value={fournisseurFiltre}
                onChange={(e) => setFournisseurFiltre(e.target.value)}
                style={{
                  background: '#fff',
                  color: '#162D49',
                  border: '1px solid rgba(255,255,255,.35)',
                  borderRadius: '7px',
                  padding: '7px 12px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option value="">🔍 Tous les fournisseurs</option>
                {[...new Set(factures.map(f => f.fournisseur))].sort().map(fournisseur => (
                  <option key={fournisseur} value={fournisseur}>
                    {fournisseur}
                  </option>
                ))}
              </select>
            </div>

            {/* Dropdown filtre année */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <select
                value={anneeFiltre}
                onChange={(e) => setAnneeFiltre(e.target.value)}
                style={{
                  background: '#fff',
                  color: '#162D49',
                  border: '1px solid rgba(255,255,255,.35)',
                  borderRadius: '7px',
                  padding: '7px 12px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option value="">📅 Toutes les années</option>
                {[...new Set(factures.map(f => new Date(f.dateEcheance).getFullYear()))].sort((a, b) => b - a).map(annee => (
                  <option key={annee} value={annee.toString()}>
                    {annee}
                  </option>
                ))}
              </select>
            </div>

            {/* Bouton Nouvelle facture */}
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
                <b style={{ fontSize: '16px', color: '#162D49' }}>{editingFacture ? '✎ Modifier la facture' : '➕ Nouvelle facture'}</b>
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
            <b style={{ fontSize: '18px', marginBottom: '20px', display: 'block', color: '#162D49', fontWeight: 700 }}>📊 Tableau de bord</b>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px', marginBottom: '30px' }}>
              <StatCard titre="À payer" montant={formatMontant(totalAPayer)} bg="rgba(224,128,128,.15)" color="#E08080" />
              <StatCard titre="En retard" montant={formatMontant(totalEnRetard)} bg="rgba(232,182,110,.15)" color="#E8B66E" />
              {fournisseurFiltre && <StatCard titre="Total global" montant={formatMontant(totalGlobal)} bg="rgba(22,45,73,.10)" color="#162D49" />}
            </div>

            {/* RÉSUMÉ DE L'ANNÉE */}
            {anneeFiltre && (
              <div style={{ marginBottom: '30px', background: '#fff', borderRadius: '12px', border: '2px solid #162D49', overflow: 'hidden', boxShadow: '0 2px 8px rgba(22,45,73,.10)' }}>
                <div style={{ background: '#162D49', padding: '16px 20px', borderBottom: '3px solid #D4B76A' }}>
                  <b style={{ fontSize: '15px', display: 'block', color: '#fff', marginBottom: '4px' }}>📅 Résumé de l'année {anneeFiltre}</b>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,.80)' }}>{fournisseurFiltre ? `Fournisseur: ${fournisseurFiltre}` : 'Tous les fournisseurs'}</span>
                </div>
                
                {/* Cartes résumé année */}
                <div style={{ padding: '20px', background: '#f5f5f5' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '15px' }}>
                    <div style={{ background: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid #e8e8e8' }}>
                      <small style={{ display: 'block', color: '#999', fontSize: '11px', fontWeight: 700, marginBottom: '4px' }}>À PAYER</small>
                      <b style={{ fontSize: '16px', color: '#E08080' }}>{formatMontant(facturesFiltreesPeriode.filter(f => f.statut === 'à payer' && !estEnRetard(f.dateEcheance, f.statut)).reduce((sum, f) => sum + (parseFloat(f.montantTTC) || 0), 0))}</b>
                    </div>
                    <div style={{ background: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid #e8e8e8' }}>
                      <small style={{ display: 'block', color: '#999', fontSize: '11px', fontWeight: 700, marginBottom: '4px' }}>EN RETARD</small>
                      <b style={{ fontSize: '16px', color: '#E8B66E' }}>{formatMontant(facturesFiltreesPeriode.filter(f => estEnRetard(f.dateEcheance, f.statut)).reduce((sum, f) => sum + (parseFloat(f.montantTTC) || 0), 0))}</b>
                    </div>
                    <div style={{ background: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid #e8e8e8' }}>
                      <small style={{ display: 'block', color: '#999', fontSize: '11px', fontWeight: 700, marginBottom: '4px' }}>PAYÉES</small>
                      <b style={{ fontSize: '16px', color: '#7BB38F' }}>{formatMontant(facturesFiltreesPeriode.filter(f => f.statut === 'payée').reduce((sum, f) => sum + (parseFloat(f.montantTTC) || 0), 0))}</b>
                    </div>
                    <div style={{ background: '#D4B76A', padding: '12px', borderRadius: '8px', border: '2px solid #D4B76A' }}>
                      <small style={{ display: 'block', color: 'rgba(22,45,73,.7)', fontSize: '11px', fontWeight: 700, marginBottom: '4px' }}>TOTAL</small>
                      <b style={{ fontSize: '16px', color: '#162D49' }}>{formatMontant(facturesFiltreesPeriode.reduce((sum, f) => sum + (parseFloat(f.montantTTC) || 0), 0))}</b>
                    </div>
                  </div>
                </div>

                {/* Tableau détaillé de l'année */}
                {facturesFiltreesPeriode.length > 0 && (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ background: '#f5f5f5', borderBottom: '2px solid #D4B76A', borderTop: '1px solid #e8e8e8' }}>
                          <th style={{ padding: '12px 15px', textAlign: 'left', fontWeight: 700, color: '#162D49' }}>Fournisseur</th>
                          <th style={{ padding: '12px 15px', textAlign: 'left', fontWeight: 700, color: '#162D49' }}>Échéance</th>
                          <th style={{ padding: '12px 15px', textAlign: 'right', fontWeight: 700, color: '#162D49' }}>Montant</th>
                          <th style={{ padding: '12px 15px', textAlign: 'center', fontWeight: 700, color: '#162D49' }}>Statut</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortByEcheance(facturesFiltreesPeriode).map((f, i) => (
                          <tr key={f.id} style={{ background: i % 2 ? '#fff' : '#fafafa', borderBottom: '1px solid #e8e8e8' }}>
                            <td style={{ padding: '10px 15px', fontSize: '12px', color: '#162D49' }}>{f.fournisseur}</td>
                            <td style={{ padding: '10px 15px', fontSize: '12px', color: '#666' }}>{formatDate(f.dateEcheance)}</td>
                            <td style={{ padding: '10px 15px', textAlign: 'right', fontWeight: 600, color: '#162D49' }}>{formatMontant(f.montantTTC)}</td>
                            <td style={{ padding: '10px 15px', textAlign: 'center', fontSize: '11px' }}>
                              {estEnRetard(f.dateEcheance, f.statut) && <span style={{ background: '#E08080', color: '#fff', padding: '2px 6px', borderRadius: '3px', fontSize: '10px' }}>Retard</span>}
                              {f.statut === 'à payer' && !estEnRetard(f.dateEcheance, f.statut) && <span style={{ background: '#162D49', color: '#fff', padding: '2px 6px', borderRadius: '3px', fontSize: '10px' }}>À payer</span>}
                              {f.statut === 'payée' && <span style={{ background: '#7BB38F', color: '#fff', padding: '2px 6px', borderRadius: '3px', fontSize: '10px' }}>Payée</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {facturesFiltreesPeriode.length === 0 && (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#999', fontSize: '13px' }}>
                    Aucune facture pour cette année
                  </div>
                )}
              </div>
            )}

            {/* À PAYER PAR MOIS */}
            {(() => {
              const apayerByMonth = groupFacturesByMonth(facturesFiltrées.filter(f => f.statut === 'à payer' && !estEnRetard(f.dateEcheance, f.statut)));
              const sortedMonths = Object.keys(apayerByMonth).sort();
              return sortedMonths.length > 0 && (
                <div style={{ marginBottom: '30px', background: '#fff', borderRadius: '12px', border: '2px solid #162D49', overflow: 'hidden', boxShadow: '0 2px 8px rgba(22,45,73,.10)' }}>
                  <div style={{ background: '#162D49', padding: '16px 20px', borderBottom: '3px solid #D4B76A' }}>
                    <b style={{ fontSize: '15px', display: 'block', color: '#fff', marginBottom: '4px' }}>📌 À payer par mois</b>
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,.80)' }}>Factures en attente (non en retard)</span>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ background: '#f5f5f5', borderBottom: '2px solid #D4B76A' }}>
                          <th style={{ padding: '14px 18px', textAlign: 'left', fontWeight: 700, color: '#162D49' }}>Mois</th>
                          <th style={{ padding: '14px 18px', textAlign: 'right', fontWeight: 700, color: '#162D49' }}>Montant</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedMonths.map((month, i) => {
                          const total = apayerByMonth[month].reduce((sum, f) => sum + (parseFloat(f.montantTTC) || 0), 0);
                          return (
                            <tr key={month} style={{ background: i % 2 ? '#fff' : 'rgba(212,183,106,.08)', borderBottom: '1px solid #e8e8e8' }}>
                              <td style={{ padding: '12px 18px', fontSize: '13px', color: '#162D49', fontWeight: 500 }}>{getMonthLabel(month)}</td>
                              <td style={{ padding: '12px 18px', textAlign: 'right', fontWeight: 700, color: '#D4B76A', fontSize: '14px' }}>{formatMontant(total)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ background: 'rgba(212,183,106,.10)', padding: '16px 18px', borderTop: '2px solid #D4B76A', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: '14px', color: '#162D49' }}>TOTAL À PAYER</span>
                    <span style={{ fontWeight: 700, fontSize: '18px', color: '#D4B76A' }}>{formatMontant(totalAPayer)}</span>
                  </div>
                </div>
              );
            })()}

            {/* EN RETARD PAR MOIS */}
            {(() => {
              const enRetardByMonth = groupFacturesByMonth(facturesFiltrées.filter(f => estEnRetard(f.dateEcheance, f.statut)));
              const sortedMonths = Object.keys(enRetardByMonth).sort();
              return sortedMonths.length > 0 && (
                <div style={{ marginBottom: '30px', background: '#fff', borderRadius: '12px', border: '2px solid #162D49', overflow: 'hidden', boxShadow: '0 2px 8px rgba(22,45,73,.10)' }}>
                  <div style={{ background: '#162D49', padding: '16px 20px', borderBottom: '3px solid #E08080' }}>
                    <b style={{ fontSize: '15px', display: 'block', color: '#fff', marginBottom: '4px' }}>⚠️ En retard par mois</b>
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,.80)' }}>Factures dépassant leur date d'échéance</span>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ background: '#f5f5f5', borderBottom: '2px solid #E08080' }}>
                          <th style={{ padding: '14px 18px', textAlign: 'left', fontWeight: 700, color: '#162D49' }}>Mois</th>
                          <th style={{ padding: '14px 18px', textAlign: 'right', fontWeight: 700, color: '#162D49' }}>Montant</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedMonths.map((month, i) => {
                          const total = enRetardByMonth[month].reduce((sum, f) => sum + (parseFloat(f.montantTTC) || 0), 0);
                          return (
                            <tr key={month} style={{ background: i % 2 ? '#fff' : 'rgba(224,128,128,.06)', borderBottom: '1px solid #e8e8e8' }}>
                              <td style={{ padding: '12px 18px', fontSize: '13px', color: '#162D49', fontWeight: 500 }}>{getMonthLabel(month)}</td>
                              <td style={{ padding: '12px 18px', textAlign: 'right', fontWeight: 700, color: '#E08080', fontSize: '14px' }}>{formatMontant(total)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ background: 'rgba(224,128,128,.08)', padding: '16px 18px', borderTop: '2px solid #E08080', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: '14px', color: '#162D49' }}>TOTAL EN RETARD</span>
                    <span style={{ fontWeight: 700, fontSize: '18px', color: '#E08080' }}>{formatMontant(totalEnRetard)}</span>
                  </div>
                </div>
              );
            })()}

            {/* PAYÉES PAR MOIS - Seulement quand on filtre par fournisseur */}
            {fournisseurFiltre && (() => {
              const payeesByMonth = groupFacturesByMonth(facturesFiltrées.filter(f => f.statut === 'payée'));
              const sortedMonths = Object.keys(payeesByMonth).sort();
              return sortedMonths.length > 0 && (
                <div style={{ marginBottom: '30px', background: '#fff', borderRadius: '12px', border: '2px solid #162D49', overflow: 'hidden', boxShadow: '0 2px 8px rgba(22,45,73,.10)' }}>
                  <div style={{ background: '#162D49', padding: '16px 20px', borderBottom: '3px solid #7BB38F' }}>
                    <b style={{ fontSize: '15px', display: 'block', color: '#fff', marginBottom: '4px' }}>✓ Payées par mois</b>
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,.80)' }}>Historique des factures payées</span>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ background: '#f5f5f5', borderBottom: '2px solid #7BB38F' }}>
                          <th style={{ padding: '14px 18px', textAlign: 'left', fontWeight: 700, color: '#162D49' }}>Mois</th>
                          <th style={{ padding: '14px 18px', textAlign: 'right', fontWeight: 700, color: '#162D49' }}>Montant</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedMonths.map((month, i) => {
                          const total = payeesByMonth[month].reduce((sum, f) => sum + (parseFloat(f.montantTTC) || 0), 0);
                          return (
                            <tr key={month} style={{ background: i % 2 ? '#fff' : 'rgba(123,179,143,.06)', borderBottom: '1px solid #e8e8e8' }}>
                              <td style={{ padding: '12px 18px', fontSize: '13px', color: '#162D49', fontWeight: 500 }}>{getMonthLabel(month)}</td>
                              <td style={{ padding: '12px 18px', textAlign: 'right', fontWeight: 700, color: '#7BB38F', fontSize: '14px' }}>{formatMontant(total)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ background: 'rgba(123,179,143,.08)', padding: '16px 18px', borderTop: '2px solid #7BB38F', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: '14px', color: '#162D49' }}>TOTAL PAYÉ</span>
                    <span style={{ fontWeight: 700, fontSize: '18px', color: '#7BB38F' }}>{formatMontant(totalPayees)}</span>
                  </div>
                </div>
              );
            })()}

            {factureBientot.length > 0 && (
              <div style={{ background: '#fff', borderRadius: '12px', border: '2px solid #162D49', overflow: 'hidden', boxShadow: '0 2px 8px rgba(22,45,73,.10)', marginBottom: '20px' }}>
                <div style={{ background: '#162D49', padding: '16px 20px', borderBottom: '3px solid #D4B76A' }}>
                  <b style={{ fontSize: '15px', display: 'block', color: '#fff', marginBottom: '4px' }}>📅 Échéances proches</b>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,.80)' }}>{factureBientot.length} facture{factureBientot.length > 1 ? 's' : ''} dans les 7 prochains jours</span>
                </div>
                <div style={{ padding: '12px 0' }}>
                  {factureBientot.map((f, i) => (
                    <div key={f.id} style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      padding: '12px 20px', 
                      borderBottom: i < factureBientot.length - 1 ? '1px solid #e8e8e8' : 'none',
                      background: i % 2 ? '#fff' : 'rgba(212,183,106,.08)',
                      fontSize: '13px'
                    }}>
                      <span style={{ color: '#162D49', fontWeight: 500 }}>{f.fournisseur}</span>
                      <span style={{ color: '#666', textAlign: 'right' }}>
                        <b style={{ color: '#D4B76A', display: 'block' }}>{formatMontant(f.montantTTC)}</b>
                        <small>{formatDate(f.dateEcheance)}</small>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* À PAYER */}
        {activeTab === 'a-payer' && (
          <div>
            <b style={{ fontSize: '14.5px', marginBottom: '12px', display: 'block' }}>Factures à payer</b>
            <TableFactures
              factures={sortByEcheance(facturesFiltrées.filter(f => f.statut === 'à payer'))}
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
              factures={sortByEcheance(facturesFiltrées.filter(f => f.statut === 'payée'))}
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
    <div style={{ 
      background: '#fff', 
      borderLeft: `5px solid ${color}`, 
      borderRadius: '10px', 
      padding: '16px 18px', 
      boxShadow: '0 2px 8px rgba(22,45,73,.08)',
      transition: 'transform 0.2s, box-shadow 0.2s',
      cursor: 'default'
    }}>
      <small style={{ display: 'block', color: '#999', fontSize: '11px', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 700, letterSpacing: '0.5px' }}>{titre}</small>
      <b style={{ fontSize: '24px', color: color, display: 'block', fontWeight: 700 }}>{montant}</b>
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
                <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>Chantier</th>
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
                  <td style={{ padding: '10px', fontSize: '13px', color: '#666' }}>{f.chantier || '-'}</td>
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

        {/* Champ Statut - seulement pour les factures existantes */}
        {facture ? (
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px', opacity: 0.7 }}>Statut *</label>
            <select name="statut" value={formData.statut} onChange={handleChange} required style={{ background: '#fff', border: '1px solid rgba(22,45,73,.25)', borderRadius: '7px', padding: '9px 11px', fontSize: '13.5px', width: '100%' }}>
              <option value="à payer">À payer</option>
              <option value="payée">Payée</option>
            </select>
          </div>
        ) : (
          <input type="hidden" name="statut" value="à payer" />
        )}

        {/* Date paiement - seulement pour les factures payées */}
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

export default ABPaiements;
