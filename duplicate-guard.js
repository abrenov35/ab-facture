(() => {
  'use strict';

  const API_SCRIPT_ID = 'AKfycbySr3kGVj6Uqjjj44_cV9teMMeZym8ayVWo2RX4RV76KO0Q_AWW8O4PJnKlwXJ1OFmkTw';
  const originalFetch = window.fetch.bind(window);
  const savesInProgress = new Set();

  const normalizeText = (value) =>
    String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

  const amountInCents = (value) => {
    const number = Number(String(value ?? '').replace(',', '.'));
    return Number.isFinite(number) ? Math.round(number * 100) : null;
  };

  const localResponse = (data) =>
    new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  const closeModal = (overlay, previousOverflow) => {
    document.body.style.overflow = previousOverflow;
    overlay.remove();
  };

  const showInfoModal = ({ title, message, buttonLabel = 'OK' }) =>
    new Promise((resolve) => {
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: fixed;
        inset: 0;
        z-index: 99999;
        background: rgba(15, 23, 42, 0.48);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        box-sizing: border-box;
      `;

      const modal = document.createElement('div');
      modal.style.cssText = `
        width: min(440px, 100%);
        background: #ffffff;
        border-radius: 18px;
        box-shadow: 0 24px 70px rgba(0, 0, 0, 0.24);
        overflow: hidden;
        color: #162D49;
        font-family: Arial, Helvetica, sans-serif;
      `;

      modal.innerHTML = `
        <div style="padding:24px 24px 12px;text-align:center;">
          <div style="width:48px;height:48px;margin:0 auto 12px;border-radius:50%;background:#eef4f8;display:flex;align-items:center;justify-content:center;font-size:22px;">⏳</div>
          <div style="font-size:20px;font-weight:800;margin-bottom:8px;">${title}</div>
          <div style="font-size:14px;line-height:1.55;color:#64748b;">${message}</div>
        </div>
        <div style="padding:12px 24px 24px;display:flex;justify-content:center;">
          <button data-action="ok" style="min-width:130px;border:0;border-radius:10px;background:#162D49;color:#fff;padding:11px 18px;font-size:14px;font-weight:700;cursor:pointer;">${buttonLabel}</button>
        </div>
      `;

      overlay.appendChild(modal);
      document.body.appendChild(overlay);

      const finish = () => {
        document.removeEventListener('keydown', onKeydown);
        closeModal(overlay, previousOverflow);
        resolve();
      };
      const onKeydown = (event) => {
        if (event.key === 'Escape' || event.key === 'Enter') finish();
      };

      modal.querySelector('[data-action="ok"]').addEventListener('click', finish);
      document.addEventListener('keydown', onKeydown);
    });

  const showDuplicateModal = ({ fournisseur, numero, montant }) =>
    new Promise((resolve) => {
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: fixed;
        inset: 0;
        z-index: 99999;
        background: rgba(15, 23, 42, 0.52);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        box-sizing: border-box;
        backdrop-filter: blur(2px);
      `;

      const modal = document.createElement('div');
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-labelledby', 'ab-duplicate-title');
      modal.style.cssText = `
        width: min(520px, 100%);
        max-height: calc(100vh - 40px);
        overflow: auto;
        background: #ffffff;
        border-radius: 18px;
        box-shadow: 0 24px 70px rgba(0, 0, 0, 0.26);
        color: #162D49;
        font-family: Arial, Helvetica, sans-serif;
        animation: abDuplicateModalIn .16s ease-out;
      `;

      if (!document.getElementById('ab-duplicate-modal-style')) {
        const style = document.createElement('style');
        style.id = 'ab-duplicate-modal-style';
        style.textContent = `
          @keyframes abDuplicateModalIn {
            from { opacity: 0; transform: translateY(10px) scale(.985); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
          @media (max-width: 560px) {
            .ab-duplicate-actions { flex-direction: column-reverse !important; }
            .ab-duplicate-actions button { width: 100% !important; }
          }
        `;
        document.head.appendChild(style);
      }

      const safeSupplier = String(fournisseur || '-').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
      }[char]));
      const safeNumber = String(numero || '-').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
      }[char]));
      const safeAmount = String(montant || '-').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
      }[char]));

      modal.innerHTML = `
        <div style="padding:24px 26px 14px;display:flex;gap:14px;align-items:flex-start;border-bottom:1px solid #eef1f4;">
          <div style="width:46px;height:46px;flex:0 0 46px;border-radius:50%;background:#fff4e5;display:flex;align-items:center;justify-content:center;font-size:22px;">⚠️</div>
          <div style="min-width:0;">
            <div id="ab-duplicate-title" style="font-size:21px;font-weight:800;line-height:1.2;margin:1px 0 5px;">Facture déjà existante</div>
            <div style="font-size:13.5px;color:#718096;line-height:1.45;">Une facture identique est déjà enregistrée.</div>
          </div>
        </div>

        <div style="padding:20px 26px 8px;">
          <div style="font-size:14.5px;line-height:1.55;color:#334155;margin-bottom:16px;">
            Même fournisseur, même numéro de facture et même montant. Merci de vérifier la facture existante avant de continuer.
          </div>

          <div style="background:#f7f8fa;border:1px solid #e7ebef;border-radius:12px;padding:15px 16px;">
            <div style="display:grid;grid-template-columns:125px 1fr;gap:8px 12px;font-size:14px;line-height:1.45;">
              <div style="color:#718096;font-weight:700;">Fournisseur</div><div style="font-weight:800;overflow-wrap:anywhere;">${safeSupplier}</div>
              <div style="color:#718096;font-weight:700;">N° facture</div><div style="font-weight:800;overflow-wrap:anywhere;">${safeNumber}</div>
              <div style="color:#718096;font-weight:700;">Montant TTC</div><div style="font-weight:800;">${safeAmount}</div>
            </div>
          </div>
        </div>

        <div class="ab-duplicate-actions" style="padding:18px 26px 24px;display:flex;justify-content:flex-end;gap:10px;">
          <button data-action="cancel" style="border:1px solid #d9e0e7;border-radius:10px;background:#ffffff;color:#162D49;padding:11px 17px;font-size:14px;font-weight:700;cursor:pointer;min-width:110px;">Annuler</button>
          <button data-action="continue" style="border:0;border-radius:10px;background:#162D49;color:#ffffff;padding:11px 18px;font-size:14px;font-weight:800;cursor:pointer;min-width:190px;">Continuer quand même</button>
        </div>
      `;

      overlay.appendChild(modal);
      document.body.appendChild(overlay);

      const finish = (result) => {
        document.removeEventListener('keydown', onKeydown);
        closeModal(overlay, previousOverflow);
        resolve(result);
      };
      const onKeydown = (event) => {
        if (event.key === 'Escape') finish(false);
      };

      modal.querySelector('[data-action="cancel"]').addEventListener('click', () => finish(false));
      modal.querySelector('[data-action="continue"]').addEventListener('click', () => finish(true));
      overlay.addEventListener('click', (event) => {
        if (event.target === overlay) finish(false);
      });
      document.addEventListener('keydown', onKeydown);

      requestAnimationFrame(() => {
        modal.querySelector('[data-action="cancel"]').focus();
      });
    });

  window.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input?.url || '';
    const method = String(init?.method || 'GET').toUpperCase();

    if (!url.includes(API_SCRIPT_ID) || method !== 'POST' || typeof init?.body !== 'string') {
      return originalFetch(input, init);
    }

    let payload;
    try {
      payload = JSON.parse(init.body);
    } catch {
      return originalFetch(input, init);
    }

    if (payload?.action !== 'addFacture' || !payload?.facture) {
      return originalFetch(input, init);
    }

    const invoice = payload.facture;
    const supplier = normalizeText(invoice.fournisseur);
    const number = normalizeText(invoice.numero);
    const amount = amountInCents(invoice.montantTTC);
    const key = `${supplier}|${number}|${amount}`;

    if (savesInProgress.has(key)) {
      await showInfoModal({
        title: 'Enregistrement en cours',
        message: 'Cette facture est déjà en cours d’enregistrement. Merci de patienter sans recliquer sur Enregistrer.'
      });
      return localResponse({ success: false, duplicateRequest: true });
    }

    savesInProgress.add(key);

    try {
      if (number && amount !== null) {
        const checkResponse = await originalFetch(url, {
          method: 'POST',
          body: JSON.stringify({ action: 'getFactures' })
        });
        const checkData = await checkResponse.json();
        const invoices = Array.isArray(checkData?.data) ? checkData.data : [];

        const duplicate = invoices.find((existing) =>
          normalizeText(existing?.fournisseur) === supplier &&
          normalizeText(existing?.numero) === number &&
          amountInCents(existing?.montantTTC) === amount
        );

        if (duplicate) {
          const displayedAmount = new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'EUR'
          }).format(amount / 100);

          const continueSaving = await showDuplicateModal({
            fournisseur: invoice.fournisseur || '-',
            numero: invoice.numero || '-',
            montant: displayedAmount
          });

          if (!continueSaving) {
            return localResponse({ success: false, cancelled: true, duplicate: true });
          }
        }
      }

      return await originalFetch(input, init);
    } finally {
      savesInProgress.delete(key);
    }
  };
})();
