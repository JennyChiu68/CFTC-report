import '../app/globals.css';
import { designerShell } from '../app/designer-shell';
import { mountCftc } from '../app/designer-runtime.js';
import { createPagesDataClient } from './data-client.mjs';

const root = document.getElementById('app');
const base = import.meta.env.BASE_URL;
root.innerHTML = designerShell
  .replaceAll('/designer/', base + 'designer/')
  .replace(/(<span id="dateLabel">)[^<]*(<\/span>)/, '$1正在读取…$2');

const chartScript = document.createElement('script');
chartScript.src = base + 'designer/echarts.min.js';
const ready = new Promise(resolve => {
  chartScript.onload = resolve;
  chartScript.onerror = resolve;
});
document.head.appendChild(chartScript);
await ready;
mountCftc(root, { fetchData: createPagesDataClient(base) });
