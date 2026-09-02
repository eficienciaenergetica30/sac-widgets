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
      this._myDataBinding = dataBinding;
      this.render();
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
          { lineType: 'solid', symbol: 'circle', symbolSize: 9, color: '#2B6CB0' },
          { lineType: 'dashed', symbol: 'rect', symbolSize: 9, color: '#2F855A' },
          { lineType: 'dotted', symbol: 'triangle', symbolSize: 11, color: '#DD6B20' },
          { lineType: 'dashDot', symbol: 'diamond', symbolSize: 11, color: '#805AD5' }
        ];

        let categories = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
        let seriesMap = {};
        let measureLabel = 'Valor';

        if (this._myDataBinding && this._myDataBinding.data && Array.isArray(this._myDataBinding.data) && this._myDataBinding.data.length > 0) {
          const rawData = this._myDataBinding.data;
          let catsSet = new Set();

          if (this._myDataBinding.metadata && this._myDataBinding.metadata.feeds) {
            const mFeed = this._myDataBinding.metadata.feeds.measures;
            if (mFeed && mFeed.values && mFeed.values.length > 0) {
              measureLabel = mFeed.values[0].description || mFeed.values[0].id || measureLabel;
            }
          }

          rawData.forEach(row => {
            const dims = row.dimensions || [];
            const mes = (dims[0] && (dims[0].label || dims[0].id)) ? (dims[0].label || dims[0].id) : 'N/A';
            const anio = (dims[1] && (dims[1].label || dims[1].id)) ? (dims[1].label || dims[1].id) : 'Serie 1';

            let val = null;
            if (row.measures) {
              if (Array.isArray(row.measures) && row.measures.length > 0) {
                const m = row.measures[0];
                val = m?.raw !== undefined ? m.raw : (m?.value !== undefined ? m.value : m);
              } else if (typeof row.measures === 'object') {
                const firstKey = Object.keys(row.measures)[0];
                const m = row.measures[firstKey];
                val = m?.raw !== undefined ? m.raw : (m?.value !== undefined ? m.value : m);
              }
            }

            catsSet.add(mes);
            if (!seriesMap[anio]) { seriesMap[anio] = {}; }
            seriesMap[anio][mes] = (val !== null && val !== undefined && !isNaN(Number(val))) ? Number(val) : null;
          });

          if (catsSet.size > 0) { categories = Array.from(catsSet); }
        } else {
          seriesMap = {
            '2024': { '01': 8700000, '02': 9888876, '03': 11750914, '04': 16114317, '05': 12472668, '06': 15427862, '07': 18411413, '08': 12157993, '09': 9755709, '10': 8455860, '11': 9181245, '12': 9169808 },
            '2025': { '01': 9888876, '02': 11083120, '03': 11750914, '04': 12519129, '05': 15427862, '06': 11553276, '07': 10545410, '08': 12157993, '09': 9879296, '10': 9181245, '11': 10426376, '12': 12800000 },
            '2026': { '01': 13300000, '02': 12212213, '03': 10290403, '04': 9016027, '05': 4670825, '06': 8139006 }
          };
        }

        const seriesNames = Object.keys(seriesMap);
        const echartsSeries = seriesNames.map((year, idx) => {
          const style = styleConfigs[idx % styleConfigs.length];
          const dataValues = categories.map(cat => seriesMap[year][cat] !== undefined ? seriesMap[year][cat] : null);

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
                  formatter: year,
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
          legend: {
            bottom: 5
          },
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
