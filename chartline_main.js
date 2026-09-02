var loadScript = (src) => {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

(function () {
  const template = document.createElement('template');
  template.innerHTML = `
    <style>
      :host { display: block; width: 100%; height: 100%; }
      #chart { width: 100%; height: 100%; min-height: 350px; }
    </style>
    <div id="chart"></div>
  `;

  class BWLineChart extends HTMLElement {
    constructor() {
      super();
      this._shadowRoot = this.attachShadow({ mode: 'open' });
      this._shadowRoot.appendChild(template.content.cloneNode(true));
      this._chartContainer = this._shadowRoot.getElementById('chart');
      this._chart = null;
    }

    async connectedCallback() {
      // Cargar la librería ECharts desde CDN
      await loadScript('https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js');
      this._chart = echarts.init(this._chartContainer);
      this.render();
    }

    onCustomWidgetResize() {
      if (this._chart) { this._chart.resize(); }
    }

    onCustomWidgetAfterUpdate() {
      this.render();
    }

    render() {
      if (!this._chart) return;

      // Definición de configuraciones específicas por año para B/N
      const yearStyles = {
        '2024': { lineType: 'solid', symbol: 'circle', symbolSize: 9, color: '#000000' },
        '2025': { lineType: 'dashed', symbol: 'rect', symbolSize: 9, color: '#333333' },
        '2026': { lineType: 'dotted', symbol: 'triangle', symbolSize: 11, color: '#555555' }
      };

      // Si aún no hay data cargada desde SAC, muestra una vista preview
      const option = {
        title: { text: 'Región 0 - Vista Impresión B/N', left: 'center' },
        tooltip: { trigger: 'axis' },
        legend: { bottom: 0 },
        xAxis: {
          type: 'category',
          data: ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'],
          name: 'Mes'
        },
        yAxis: { type: 'value', name: 'IMPTOTAL' },
        series: [
          {
            name: '2024',
            type: 'line',
            lineStyle: { type: yearStyles['2024'].lineType, width: 2.5, color: yearStyles['2024'].color },
            itemStyle: { color: yearStyles['2024'].color },
            symbol: yearStyles['2024'].symbol,
            symbolSize: yearStyles['2024'].symbolSize,
            data: [8700000, 9888876, 11750914, 16114317, 12472668, 15427862, 18411413, 12157993, 9755709, 8455860, 9181245, 9169808],
            markPoint: {
              symbol: 'none',
              data: [{ coord: [0, 8700000], label: { show: true, formatter: '2024', position: 'left', fontWeight: 'bold' } }]
            }
          },
          {
            name: '2025',
            type: 'line',
            lineStyle: { type: yearStyles['2025'].lineType, width: 2.5, color: yearStyles['2025'].color },
            itemStyle: { color: yearStyles['2025'].color },
            symbol: yearStyles['2025'].symbol,
            symbolSize: yearStyles['2025'].symbolSize,
            data: [9888876, 11083120, 11750914, 12519129, 15427862, 11553276, 10545410, 12157993, 9879296, 9181245, 10426376, 12800000],
            markPoint: {
              symbol: 'none',
              data: [{ coord: [0, 9888876], label: { show: true, formatter: '2025', position: 'top', fontWeight: 'bold' } }]
            }
          },
          {
            name: '2026',
            type: 'line',
            lineStyle: { type: yearStyles['2026'].lineType, width: 2.5, color: yearStyles['2026'].color },
            itemStyle: { color: yearStyles['2026'].color },
            symbol: yearStyles['2026'].symbol,
            symbolSize: yearStyles['2026'].symbolSize,
            data: [13300000, 12212213, 10290403, 9016027, 4670825, 8139006, null, null, null, null, null, null],
            markPoint: {
              symbol: 'none',
              data: [{ coord: [0, 13300000], label: { show: true, formatter: '2026', position: 'left', fontWeight: 'bold' } }]
            }
          }
        ]
      };

      this._chart.setOption(option);
    }
  }

  customElements.define('bw-line-chart', BWLineChart);
})();