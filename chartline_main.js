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

    // Método setter obligatorio para recibir el flujo de data binding de SAC
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

    extractNumericValue(obj) {
      if (obj === null || obj === undefined) return null;
      if (typeof obj === 'number') return obj;
      if (typeof obj === 'string' && !isNaN(Number(obj))) return Number(obj);

      if (typeof obj === 'object') {
        if (obj.raw !== undefined && obj.raw !== null) return Number(obj.raw);
        if (obj.value !== undefined && obj.value !== null) return Number(obj.value);
        if (obj.formatted !== undefined && obj.formatted !== null) {
          const cleaned = String(obj.formatted).replace(/[^0-9.-]+/g, "");
          if (!isNaN(Number(cleaned)) && cleaned !== "") return Number(cleaned);
        }

        for (let key in obj) {
          const val = this.extractNumericValue(obj[key]);
          if (val !== null && !isNaN(val)) return val;
        }
      }
      return null;
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

        let categories = [];
        let seriesMap = {};
        let measureLabel = 'Valor';

        // Procesar SOLO si SAC envió un arreglo de datos con registros
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
            let catValue = 'Sin Categoría';
            let seriesValue = 'Serie 1';

            // Extracción de Dimensiones (Soporta arreglos u objetos Live Model)
            if (row.dimensions) {
              if (Array.isArray(row.dimensions)) {
                if (row.dimensions[0]) catValue = row.dimensions[0].label || row.dimensions[0].id || catValue;
                if (row.dimensions[1]) seriesValue = row.dimensions[1].label || row.dimensions[1].id || seriesValue;
              } else if (typeof row.dimensions === 'object') {
                const keys = Object.keys(row.dimensions);
                if (keys.length > 0) {
                  const d0 = row.dimensions[keys[0]];
                  catValue = d0?.label || d0?.id || d0 || catValue;
                }
                if (keys.length > 1) {
                  const d1 = row.dimensions[keys[1]];
                  seriesValue = d1?.label || d1?.id || d1 || seriesValue;
                }
              }
            }

            // Extracción de Medida
            let val = this.extractNumericValue(row.measures);
            if (val === null) val = this.extractNumericValue(row.mainStructureMember);
            if (val === null) val = this.extractNumericValue(row);

            catsSet.add(catValue);
            if (!seriesMap[seriesValue]) { seriesMap[seriesValue] = {}; }
            seriesMap[seriesValue][catValue] = val;
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
            name: 'Categoría',
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
