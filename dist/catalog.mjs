export const stages = [
  {value: 2, title: '2D Ising', short: '2D Ising', zhTitle: '二维 Ising 模型', zhShort: '二维 Ising'},
  {value: 4, title: '3D Ising', short: '3D Ising', zhTitle: '三维 Ising 模型', zhShort: '三维 Ising'},
  {value: 8, title: '3D Z₂ Gauge', short: 'Z₂ Gauge', zhTitle: '三维 Z₂ 规范理论', zhShort: 'Z₂ 规范'},
  {value: 16, title: '2D O(2)', short: '2D O(2)', zhTitle: '二维 O(2) 模型', zhShort: '二维 O(2)'},
  {value: 32, title: '2D Abelian Higgs', short: 'Abelian Higgs', zhTitle: '二维阿贝尔 Higgs 模型', zhShort: '阿贝尔 Higgs'},
  {value: 64, title: '2D Fermions', short: 'Fermions', zhTitle: '二维费米子', zhShort: '费米子'},
  {value: 128, title: 'Schwinger Model', short: 'Schwinger', zhTitle: 'Schwinger 模型', zhShort: 'Schwinger'},
  {value: 256, title: 'U(1) Gauge (D = 3, 4)', short: 'U(1) Gauge', zhTitle: 'U(1) 规范理论（D = 3, 4）', zhShort: 'U(1) 规范'},
  {value: 512, title: 'Non-Abelian Gauge (D = 3, 4)', short: 'Non-Abelian', zhTitle: '非阿贝尔规范理论（D = 3, 4）', zhShort: '非阿贝尔规范'},
  {value: 1024, title: '4D Lattice Fermions', short: 'Lattice Fermions', zhTitle: '四维格点费米子', zhShort: '格点费米子'},
  {value: 2048, title: 'QCD', short: 'QCD', zhTitle: '量子色动力学（QCD）', zhShort: 'QCD'}
];

export const types = ['concept', 'formula', 'research', 'question', 'reference'];

const sequence = {
  label: 'Y. Meurice, R. Sakai, and J. Unmuth-Yockey, “Tensor lattice field theory for renormalization and quantum computing,” Rev. Mod. Phys. 94, 025005 (2022)',
  url: 'https://doi.org/10.1103/RevModPhys.94.025005',
  section: {en: 'Sec. II.A', 'zh-CN': '第 II.A 节'}
};
export const references = [sequence];

// Add reviewed, published cards here.
export const cards = [];

export function publishedCards(value) {
  return cards.filter(card => card.stage === value && card.status === 'published')
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}
