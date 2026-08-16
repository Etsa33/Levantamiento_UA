/* ============================================================
   UTILS.JS
   Funciones pequeñas y genéricas, sin estado propio, usadas por
   varios módulos (data.js, ui.js, provinces-layer.js, etc.).
   ============================================================ */

// 'Bolívar' / 'BOLIVAR' / 'bolívar ' -> 'BOLIVAR' (sin tildes, mayúsculas, sin espacios extra)
// Se usa para comparar nombres de provincia/cantón/parroquia sin que
// diferencias de tildes o mayúsculas rompan el filtro.
function normalizeName(s){
  return (s || '').toString()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toUpperCase().trim().replace(/\s+/g, ' ');
}

function escapeHtml(str){
  return String(str).replace(/[&<>"']/g, m => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[m]));
}

function colorForEstado(estado){
  const e = (estado || '').trim().toLowerCase();
  if(e === 'activa') return { hex:'#4f9d76', badge:'badge-activa' };
  if(e === 'suspendida') return { hex:'#d5604f', badge:'badge-suspendida' };
  return { hex:'#7c93a1', badge:'badge-otro' };
}

// Convierte el texto "lat, lng" de la columna UBICACIÓN en {lat, lng},
// descartando valores vacíos, inválidos o el placeholder "0, 0".
function parseLatLng(val){
  if(!val) return null;
  const parts = val.split(',').map(s => parseFloat(s.trim()));
  if(parts.length !== 2 || parts.some(isNaN)) return null;
  const [lat, lng] = parts;
  if(lat === 0 && lng === 0) return null;
  if(lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

function makeDivIcon(hex, isActive){
  const size = isActive ? 18 : 13;
  return L.divIcon({
    className: '',
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:50%;
      background:${hex};
      border:2px solid rgba(10,30,40,0.9);
      box-shadow:0 0 0 4px ${hex}33, 0 1px 4px rgba(0,0,0,0.5);
    "></div>`,
    iconSize:[size,size],
    iconAnchor:[size/2,size/2]
  });
}

// Rellena un <select> con valores únicos, conservando la selección actual si sigue existiendo.
function populateSelect(id, values){
  const sel = document.getElementById(id);
  const current = sel.value;
  const base = sel.options[0];
  sel.innerHTML = '';
  sel.appendChild(base);
  [...values].filter(Boolean).sort().forEach(v => {
    const opt = document.createElement('option');
    opt.value = v; opt.textContent = v;
    sel.appendChild(opt);
  });
  if([...sel.options].some(o => o.value === current)) sel.value = current;
}

// 'UNIDAD DESCONCENTRADA ZONAL 3' -> 'ZONA 3'
function shortenZona(zona){
  if(!zona) return 'Sin zona';
  const match = zona.match(/ZONAL\s*(\d+)/i);
  if(match) return 'ZONA ' + match[1];
  return zona.trim() || 'Sin zona';
}
