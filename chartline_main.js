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
      #chart { width: 100%; height: 100%; min-height: 400px; }
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
      this._myDataBinding = {};
    }

    async connectedCallback() {
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

    // Setter para recibir los datos vinculados desde SAC
    set myDataBinding(dataBinding) {
      this._myDataBinding = dataBinding;
      this.render();
    }

    render() {
      if (!this._chart) return;

      // Estilos B/N asignados secuencialmente a cada serie/año
      const styleConfigs = [
        { lineType: 'solid', symbol: 'circle', symbolSize: 8, color: '#000000' },
        { lineType: 'dashed', symbol: 'rect', symbolSize: 8, color: '#222222' },
        { lineType: 'dotted', symbol: 'triangle', symbolSize: 10, color: '#444444' },
        { lineType: 'dashDot', symbol: 'diamond', symbolSize: 10, color: '#000000' }
      ];

      let categories = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
      let seriesMap = {};

      // Si hay data enviada por SAC (dataBinding)
      if (this._myDataBinding && this._myDataBinding.data && this._myDataBinding.data.length > 0) {
        const rawData = this._myDataBinding.data;
        let catsSet = new Set();

        rawData.forEach(row => {
          // Extraer dimensión de mes (ej. "01") y dimensión de año (ej. "2024")
          const mes = row.dimensions[0]?.label || row.dimensions[0]?.id;
          const anio = row.dimensions[1]?.label || row.dimensions[1]?.id || 'Serie';
          const val = row.measures[0]?.raw;

          catsSet.add(mes);

          if (!seriesMap[anio]) {
            seriesMap[anio] = {};
          }
          seriesMap[anio][mes] = val;
        });

        categories = Array.from(catsSet);
      } else {
        // Datos de respaldo / Previsualización (según tu modelo actual)
        seriesMap = {
          '2024': { '01': 8700000, '02': 9888876, '03': 11750914, '04': 16114317, '05': 12472668, '06': 15427862, '07': 18411413, '08': 12157993, '09': 9755709, '10': 8455860, '11': 9181245, '12': 9169808 },
          '2025': { '01': 9888876, '02': 11083120, '03': 11750914, '04': 12519129, '05': 15427862, '06': 11553276, '07': 10545410, '08': 12157993, '09': 9879296, '10': 9181245, '11': 10426376, '12': 12800000 },
          '2026': { '01': 13300000, '02': 12212213, '03': 10290403, '04': 9016027, '05': 4670825, '06': 8139006 }
        };
      }

      // Construcción dinámica de las series para ECharts
      const seriesNames = Object.keys(seriesMap);
      const echartsSeries = seriesNames.map((year, idx) => {
        const style = styleConfigs[idx % styleConfigs.length];
        const dataValues = categories.map(cat => seriesMap[year][cat] !== undefined ? seriesMap[year][cat] : null);

        // Encontrar el primer índice que contenga datos válidos para ubicar la etiqueta
        const firstValidIdx = dataValues.findIndex(v => v !== null && v !== undefined);
        const firstVal = firstValidIdx !== -1 ? dataValues[firstValidIdx] : null;

        return {
          name: year,
          type: 'line',
          connectNulls: true,
          lineStyle: { type: style.lineType, width: 2.5, color: style.color },
          itemStyle: { color: style.color },
          symbol: style.symbol,
          symbolSize: style.symbolSize,
          data: dataValues,
          markPoint: firstValidIdx !== -1 ? {
            symbol: 'none',
            data: [{
              coord: [firstValidIdx, firstVal],
              label: {
                show: true,
                formatter: year,
                position: 'left',
                fontWeight: 'bold',
                color: '#000000',
                fontSize: 12,
                distance: 10
              }
            }]
          } : undefined
        };
      });

      const option = {
        title: { text: 'Región 0 - Comparativo Anual', left: 'center', textStyle: { color: '#000000', fontSize: 16 } },
        tooltip: { trigger: 'axis' },
        legend: { bottom: 5, icon: 'roundRect' },
        grid: { left: '8%', right: '5%', bottom: '15%', containLabel: true },
        xAxis: {
          type: 'category',
          data: categories,
          name: 'Mes',
          axisLine: { lineStyle: { color: '#000000' } }
        },
        yAxis: {
          type: 'value',
          name: 'IMPTOTAL',
          axisLine: { show: true, lineStyle: { color: '#000000' } },
          splitLine: { lineStyle: { type: 'dashed', color: '#e0e0e0' } }
        },
        series: echartsSeries
      };

      this._chart.setOption(option, true);
    }
  }

  customElements.define('bw-line-chart', BWLineChart);
})();
