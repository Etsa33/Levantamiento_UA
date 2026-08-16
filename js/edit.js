/* ============================================================
   EDIT.JS
   Módulo de edición de datos vectoriales (Requisito 8).
   Permite, desde el popup de un punto:
     - arrastrar el marcador para corregir su ubicación
     - cambiar el Estado UA y la Referencia
   y guardar esos cambios con un UPDATE real en PostgreSQL,
   vía php/update_data.php.

   Solo funciona con DATA_SOURCE = 'php' (ver js/config.js),
   porque el Google Sheet no se puede escribir desde aquí.
   ============================================================ */

let editingId = null;    // id del registro que se está editando ahora mismo
let pendingLatLng = null; // nueva ubicación (si el usuario arrastró el marcador)

function buildEditForm(r){
  return `
    <div class="edit-form" data-id="${escapeHtml(r.id)}">
      <div class="p-row" style="margin-bottom:6px;"><b>Editando:</b> ${escapeHtml(r.nombreUA)}</div>
      <label class="edit-label">Estado UA
        <select class="edit-estado">
          <option value="Activa" ${r.estado === 'Activa' ? 'selected' : ''}>Activa</option>
          <option value="Suspendida" ${r.estado === 'Suspendida' ? 'selected' : ''}>Suspendida</option>
        </select>
      </label>
      <label class="edit-label">Referencia
        <textarea class="edit-referencia" rows="2">${escapeHtml(r.referencia || '')}</textarea>
      </label>
      <div class="edit-hint">Puedes arrastrar el punto en el mapa para corregir su ubicación.</div>
      <div class="edit-actions">
        <button class="edit-save">Guardar cambios</button>
        <button class="edit-cancel">Cancelar</button>
      </div>
      <div class="edit-status"></div>
    </div>`;
}

// Se llama desde el botón "✏️ Editar" del popup normal (ver ui.js -> buildPopup)
function enterEditMode(id){
  if(!isAdminMode){
    alert('La edición está desactivada. Activa el "🔒 Modo administrador" primero.');
    return;
  }
  if(DATA_SOURCE !== 'php'){
    alert('La edición solo está disponible cuando el geoportal lee desde PostgreSQL.\nCambia DATA_SOURCE a "php" en js/config.js (necesita XAMPP + Postgres corriendo).');
    return;
  }
  const marker = markersById[id];
  const rec = allRecords.find(r => r.id === id);
  if(!marker || !rec) return;

  editingId = id;
  pendingLatLng = null;

  marker.setPopupContent(buildEditForm(rec));
  marker.dragging.enable();

  const popupEl = marker.getPopup().getElement();
  wireEditFormEvents(popupEl, marker, rec);

  marker.off('dragend').on('dragend', (e) => {
    pendingLatLng = e.target.getLatLng();
  });
}

function wireEditFormEvents(popupEl, marker, rec){
  if(!popupEl) return;
  const saveBtn = popupEl.querySelector('.edit-save');
  const cancelBtn = popupEl.querySelector('.edit-cancel');
  const statusEl = popupEl.querySelector('.edit-status');

  cancelBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    exitEditMode(marker, rec, false);
  });

  saveBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    const estado = popupEl.querySelector('.edit-estado').value;
    const referencia = popupEl.querySelector('.edit-referencia').value;

    const payload = { id: rec.id, estado_ua: estado, referencia };
    if(pendingLatLng){
      payload.lat = pendingLatLng.lat;
      payload.lon = pendingLatLng.lng;
    }

    statusEl.textContent = 'Guardando…';
    saveBtn.disabled = true;

    try{
      const res = await fetch(PHP_UPDATE_DATA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if(!data.success) throw new Error(data.error || 'Error desconocido');

      // reflejar el cambio localmente sin esperar al próximo auto-refresh
      rec.estado = estado;
      rec.referencia = referencia;
      if(pendingLatLng){
        rec.loc = { lat: pendingLatLng.lat, lng: pendingLatLng.lng };
      }
      exitEditMode(marker, rec, true);
    }catch(err){
      console.error(err);
      statusEl.textContent = 'Error al guardar: ' + err.message;
      saveBtn.disabled = false;
    }
  });
}

function exitEditMode(marker, rec, saved){
  editingId = null;
  pendingLatLng = null;
  marker.dragging.disable();
  marker.off('dragend');
  if(saved) render(); else marker.setPopupContent(buildPopup(rec));
}
