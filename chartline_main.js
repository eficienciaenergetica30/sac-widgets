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
      this._chartTitle = "Reporte de Costos";
    }

    async connectedCallback() {
      try {
        await loadScript('https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js');
        if (!this._chart) {
          this._chart = echarts.init(this._chartContainer);
        }
        this.render();
      } catch (e) {
        console.error("Error al cargar ECharts:", e);
      }
    }

    onCustomWidgetResize() {
      if (this._chart) { this._chart.resize(); }
    }

    onCustomWidgetAfterUpdate() {
      this.render();
    }

    set myDataBinding(dataBinding) {
      console.log("== DATOS RECIBIDOS DESDE SAC ==", dataBinding);
      this._myDataBinding = dataBinding;
      this.render();
    }

    get myDataBinding() {
      return this._myDataBinding;
    }

    getChartTitle() { return this._chartTitle; }
    setChartTitle(newTitle) {
      this._chartTitle = newTitle;
      if (this._chart) { this._chart.setOption({ title: { text: newTitle } }); }
    }
    refreshChart() {
      if (this._chart) { this._chart.resize(); this.render(); }
    }

    render() {
      if (!this._chart) return;

      try {
        const styleConfigs = [
          { lineType: 'solid', symbol: 'circle', symbolSize: 9, color: '#2B6CB0' },    // Azul (2024)
          { lineType: 'dashed', symbol: 'rect', symbolSize: 9, color: '#2F855A' },     // Verde (2025)
          { lineType: 'dotted', symbol: 'triangle', symbolSize: 11, color: '#DD6B20' }, // Naranja (2026)
          { lineType: 'dashDot', symbol: 'diamond', symbolSize: 11, color: '#805AD5' }  // Morado
        ];

        let categories = [];
        let seriesMap = {};
        let measureLabel = 'Costo (MXN)';

        if (this._myDataBinding && this._myDataBinding.data && Array.isArray(this._myDataBinding.data) && this._myDataBinding.data.length > 0) {
          const rawData = this._myDataBinding.data;
          let catsSet = new Set();

          // Título del Eje Y tomado del label en metadata
          if (this._myDataBinding.metadata && this._myDataBinding.metadata.mainStructureMembers && this._myDataBinding.metadata.mainStructureMembers.measures_0) {
            measureLabel = this._myDataBinding.metadata.mainStructureMembers.measures_0.label || measureLabel;
          }

          rawData.forEach(row => {
            // dimensions_0 = Año, dimensions_1 = Mes (según tu Builder)
            const d0 = row.dimensions_0;
            const d1 = row.dimensions_1;
            const m0 = row.measures_0;

            const anio = d0?.label || d0?.id || 'Serie';
            const mes = d1?.label || d1?.id || 'N/A';
            const val = m0?.raw !== undefined ? Number(m0.raw) : (m0?.value !== undefined ? Number(m0.value) : null);

            catsSet.add(mes);
            if (!seriesMap[anio]) { seriesMap[anio] = {}; }
            seriesMap[anio][mes] = val;
          });

          categories = Array.from(catsSet).sort();
        }

        const seriesNames = Object.keys(seriesMap);
        const echartsSeries = seriesNames.map((sName, idx) => {
          const style = styleConfigs[idx % styleConfigs.length];
          const dataValues = categories.map(cat => seriesMap[sName][cat] !== undefined ? seriesMap[sName][cat] : null);

          const firstValidIdx = dataValues.findIndex(v => v !== null && v !== undefined);
          const firstVal = firstValidIdx !== -1 ? dataValues[firstValidIdx] : null;

          return {
            name: sName,
            type: 'line',
            connectNulls: true,
            lineStyle: { type: style.lineType, width: 2.5, color: style.color },
            itemStyle: { color: style.color },
            symbol: style.symbol,
            symbolSize: style.symbolSize,
            label: {
              show: true,
              position: 'top',
              fontSize: 9,
              fontWeight: 'bold',
              color: '#2D3748',
              formatter: (params) => {
                if (params.value === null || params.value === undefined) return '';
                return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(params.value);
              }
            },
            data: dataValues,
            markPoint: firstValidIdx !== -1 ? {
              symbol: 'none',
              data: [{
                coord: [firstValidIdx, firstVal],
                label: {
                  show: true,
                  formatter: sName,
                  position: 'left',
                  fontWeight: 'bold',
                  color: style.color,
                  fontSize: 12,
                  distance: 10
                }
              }]
            } : undefined
          };
        });

        const option = {
          title: { text: this._chartTitle, left: 'center', textStyle: { color: '#1A202C', fontSize: 16 } },
          tooltip: {
            trigger: 'axis',
            valueFormatter: (value) => value !== null && value !== undefined ? new Intl.NumberFormat('en-US').format(value) : '-'
          },
          legend: { bottom: 5 },
          grid: { left: '8%', right: '5%', bottom: '15%', top: '15%', containLabel: true },
          xAxis: {
            type: 'category',
            data: categories,
            name: 'Mes',
            axisLine: { lineStyle: { color: '#4A5568' } }
          },
          yAxis: {
            type: 'value',
            name: measureLabel,
            axisLine: { show: true, lineStyle: { color: '#4A5568' } },
            splitLine: { lineStyle: { type: 'dashed', color: '#E2E8F0' } },
            axisLabel: {
              formatter: (value) => new Intl.NumberFormat('en-US', { notation: 'compact' }).format(value)
            }
          },
          series: echartsSeries
        };

        this._chart.setOption(option, true);
      } catch (err) {
        console.error("BWLineChart Render Internal Exception:", err);
      }
    }
  }

  customElements.define('bw-line-chart', BWLineChart);
})();
