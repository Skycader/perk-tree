import { CONFIG } from './load-config.js';

// ── PNG EXPORT ──
export async function exportPNG() {
  const st = document.getElementById('exp-st');
  st.textContent = 'Загрузка…';
  const s = document.createElement('script');
  s.src = 'libs/html2canvas.min.js';
  document.head.appendChild(s);
  await new Promise((res, rej) => {
    s.onload = res;
    s.onerror = rej;
  });
  st.textContent = 'Рендеринг…';
  const root = document.getElementById('export-root');
  const cv = await html2canvas(root, {
    backgroundColor: '#0c0d14',
    scale: 2,
    useCORS: true,
    logging: false,
    windowWidth: root.scrollWidth,
    width: root.scrollWidth,
  });
  const a = document.createElement('a');
  // same field-name chain as tree.js's standName — `tabName` matched no
  // field in any shipped config, silently producing "undefined_perks.png".
  a.download = `${CONFIG.shadowName || CONFIG.name || 'perks'}_perks.png`;
  a.href = cv.toDataURL('image/png');
  a.click();
  st.textContent = '✓';
  setTimeout(() => {
    st.textContent = '';
  }, 3000);
}
