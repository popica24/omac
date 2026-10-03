// Partea de DOM: fișa utilajului, selectorul de ansamblu și lista de poziții.
import { MODEL, ASSEMBLIES, POSITIONS, assemblyLabel, positionsOf } from './parts.js';

export function renderModelCard(doc) {
  doc.querySelector('[data-model-name]').textContent = MODEL.name;
  doc.querySelector('[data-specs]').replaceChildren(
    ...MODEL.specs.flatMap(([label, value]) => [el('dt', label), el('dd', value)]),
  );
  doc.querySelector('[data-count]').textContent = `${ASSEMBLIES.length} ansambluri · ${POSITIONS.length} poziții`;
}

export function createPartsPanel(doc, { onAssembly, onSelect, onHover, onExplode }) {
  const select = doc.getElementById('assembly');
  const button = doc.getElementById('explode');
  const list = doc.getElementById('parts');

  select.replaceChildren(...ASSEMBLIES.map((a) => {
    const option = el('option', assemblyLabel(a));
    option.value = String(a.id);
    return option;
  }));

  const rowId = (e) => e.target.closest?.('.rand')?.dataset.id ?? null;
  select.addEventListener('change', () => onAssembly(Number(select.value)));
  button.addEventListener('click', () => onExplode());
  list.addEventListener('click', (e) => { const id = rowId(e); if (id) onSelect(id); });
  list.addEventListener('mouseover', (e) => onHover(rowId(e)));
  list.addEventListener('mouseleave', () => onHover(null));
  list.addEventListener('focusin', (e) => onHover(rowId(e)));
  list.addEventListener('focusout', () => onHover(null));

  const rows = () => list.querySelectorAll('.rand');

  return {
    showAssembly(id) {
      select.value = String(id);
      list.replaceChildren(...positionsOf(id).map(row));
    },
    setSelected(id) {
      for (const r of rows()) r.setAttribute('aria-pressed', String(r.dataset.id === id));
      if (id) list.querySelector(`.rand[data-id="${id}"]`)?.scrollIntoView({ block: 'nearest' });
    },
    setHighlighted(id) {
      for (const r of rows()) r.classList.toggle('is-highlighted', r.dataset.id === id);
    },
    setExploded(on) {
      button.textContent = on ? 'Asamblează' : 'Vezi piesele';
      button.setAttribute('aria-pressed', String(on));
    },
  };
}

function row(p) {
  const button = el('button', null, 'rand');
  button.type = 'button';
  button.dataset.id = p.id;
  button.setAttribute('aria-pressed', 'false');

  const info = el('span', null, 'info');
  info.append(el('span', p.name, 'nume'), el('span', 'cod: [.....] · denumire tradusă, de verificat', 'meta'));
  if (p.wear) {
    const wear = el('span', null, 'uzura');
    const symbol = el('span', '▲ ');
    symbol.setAttribute('aria-hidden', 'true');
    wear.append(symbol, 'uzură (propunere)');
    info.append(wear);
  }
  button.append(el('span', p.id, 'poz'), info, el('span', `buc. ${p.qty}`, 'buc'));

  const li = el('li');
  li.append(button);
  return li;
}

function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text != null) node.textContent = text;
  if (className) node.className = className;
  return node;
}
