// Mapa interativo de Pernambuco com as unidades (Leaflet + OpenStreetMap)
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import { corTema } from '../../hooks/useTema';

const CENTRO = [-8.35, -37.8];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/**
 * pontos = [{ id, lat, lng, nome, letra, cor (var CSS ou hex), popup (HTML já escapado), href }]
 * agrupar = junta marcadores próximos (bom para a Região Metropolitana)
 */
export default function Mapa({ pontos, altura = 520, agrupar = true, zoomUnico = 13 }) {
  const ref = useRef(null);
  const mapa = useRef(null);
  const camada = useRef(null);

  useEffect(() => {
    if (!ref.current || mapa.current) return undefined;
    const m = L.map(ref.current, { center: CENTRO, zoom: 7, scrollWheelZoom: false });
    // Fundo do mapa: OpenStreetMap no site publicado (http/https). Aberto direto do computador (file://)
    // o OSM bloqueia, então usa o mapa de ruas da Esri. Se um falhar várias vezes, troca para o outro.
    const FUNDOS = {
      osm: ['https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>' }],
      esri: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, attribution: 'Mapa &copy; <a href="https://www.esri.com" target="_blank" rel="noopener noreferrer">Esri</a>, OpenStreetMap e colaboradores' }],
    };
    let atual = window.location.protocol.startsWith('http') ? 'osm' : 'esri';
    let erros = 0;
    let fundo = L.tileLayer(...FUNDOS[atual]).addTo(m);
    const trocar = () => {
      if (++erros < 4 || atual === 'troca-feita') return;
      m.removeLayer(fundo);
      atual = atual === 'osm' ? 'esri' : 'osm';
      fundo = L.tileLayer(...FUNDOS[atual]).addTo(m);
      atual = 'troca-feita';
    };
    fundo.on('tileerror', trocar);
    // roda do mouse só dá zoom depois de clicar no mapa (não atrapalha a rolagem da página)
    m.on('click', () => m.scrollWheelZoom.enable());
    m.on('mouseout', () => m.scrollWheelZoom.disable());
    mapa.current = m;
    const obs = new ResizeObserver(() => { if (mapa.current === m) m.invalidateSize(); });
    obs.observe(ref.current);
    return () => { obs.disconnect(); mapa.current = null; camada.current = null; m.off(); m.remove(); };
  }, []);

  useEffect(() => {
    const m = mapa.current;
    if (!m) return;
    if (camada.current) m.removeLayer(camada.current);
    const grupo = agrupar
      ? L.markerClusterGroup({
        showCoverageOnHover: false, maxClusterRadius: 35, spiderfyOnMaxZoom: true,
        iconCreateFunction: (c) => L.divIcon({ html: `<div class="mapa-grupo">${c.getChildCount()}</div>`, className: '', iconSize: [34, 34] }),
      })
      : L.layerGroup();
    const limites = L.latLngBounds([]);
    pontos.forEach((p) => {
      const cor = p.cor.startsWith('--') ? corTema(p.cor) : p.cor;
      const icone = L.divIcon({
        className: '', iconSize: [28, 28], iconAnchor: [14, 14], popupAnchor: [0, -14],
        html: `<div class="mapa-ponto" style="background:${cor}" title="${esc(p.nome)}">${esc(p.letra || '')}</div>`,
      });
      const mk = L.marker([p.lat, p.lng], { icon: icone, title: p.nome });
      if (p.popup) mk.bindPopup(p.popup, { className: 'mapa-popup', minWidth: 220 });
      grupo.addLayer(mk);
      limites.extend([p.lat, p.lng]);
    });
    m.addLayer(grupo);
    camada.current = grupo;
    const t = setTimeout(() => {
      if (mapa.current !== m) return; // o mapa saiu da tela
      m.invalidateSize();
      if (pontos.length === 1) m.setView([pontos[0].lat, pontos[0].lng], zoomUnico);
      else if (limites.isValid()) m.fitBounds(limites, { padding: [30, 30], maxZoom: 11 });
    }, 50);
    return () => clearTimeout(t);
  }, [pontos, agrupar, zoomUnico]);

  return <div ref={ref} className="mapa" style={{ height: altura }} role="region" aria-label="Mapa das unidades" />;
}

export { esc };
