(function () {
  const getScriptPromisify = (src) => {
    return new Promise((resolve) => {
      if (window.echarts) { resolve(); return; }
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      document.head.appendChild(script);
    });
  };

  const prepared = document.createElement('template');
  prepared.innerHTML = `
    <style>
      :host { display: block; width: 100%; height: 100%; }
      #root { width: 100%; height: 100%; min-height: 400px; }
    </style>
    <div id="root"></div>
  `;

  class BWLineChart extends HTMLElement {
    constructor() {
      super();
      this._shadowRoot = this.attachShadow({ mode: 'open' });
      this._shadowRoot.appendChild(prepared.content.cloneNode(true));
      this._root = this._shadowRoot.getElementById('root');
      this._chart = null;
      this._myDataBinding = {};
      this._chartTitle = "Reporte de Costos";
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

    async render() {
      const dataBinding = this._myDataBinding;
      if (!dataBinding || dataBinding.state !== 'success' || !dataBinding.data) { return; }

      await getScriptPromisify("https://cdnjs.cloudflare.com/ajax/libs/echarts/5.4.3/echarts.min.js");

      if (!this._chart) {
        this._chart = echarts.init(this._root);
      }

      const { data, metadata } = dataBinding;

      // 1. Obtener las llaves exactas basadas en las cajas separadas del Builder
      const xAxisKey = metadata.feeds.xAxisFeed?.values?.[0];
      const seriesKey = metadata.feeds.seriesFeed?.values?.[0];
      const measureKey = metadata.feeds.measures?.values?.[0];

      // Si el usuario aún no arrastra los 3 elementos en el panel, salimos
      if (!xAxisKey || !seriesKey || !measureKey) {
        return; 
      }

      // 2. Obtener etiquetas dinámicas universales
      const xAxisName = metadata.dimensions[xAxisKey]?.description || 'Eje X';
      const measureName = metadata.mainStructureMembers[measureKey]?.label || 'Valor';

      // 3. Estilos de líneas
      const styleConfigs = [
        { lineType: 'solid', symbol: 'circle', symbolSize: 9, color: '#2B6CB0' },
        { lineType: 'dashed', symbol: 'rect', symbolSize: 9, color: '#2F855A' },
        { lineType: 'dotted', symbol: 'triangle', symbolSize: 11, color: '#DD6B20' },
        { lineType: 'dashDot', symbol: 'diamond', symbolSize: 11, color: '#805AD5' }
      ];

      const categoriesSet = new Set();
      const seriesMap = {};

      // 4. Mapeo universal leyendo los keys definidos por el usuario en el Builder
      data.forEach(row => {
        const xObj = row[xAxisKey];
        const sObj = row[seriesKey];
        const mObj = row[measureKey];

        const catName = xObj?.label || xObj?.id || 'N/A';
        const seriesName = sObj?.label || sObj?.id || 'Serie';
        const val = mObj?.raw !== undefined ? Number(mObj.raw) : null;

        categoriesSet.add(catName);

        if (!seriesMap[seriesName]) {
          seriesMap[seriesName] = {};
        }
        seriesMap[seriesName][catName] = val;
      });

      const categories = Array.from(categoriesSet).sort();
      const seriesNames = Object.keys(seriesMap).sort();

      // 5. Construcción de series para ECharts
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

      // 6. Opciones finales del gráfico
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
          name: xAxisName,
          axisLine: { lineStyle: { color: '#4A5568' } }
        },
        yAxis: {
          type: 'value',
          name: measureName,
          axisLine: { show: true, lineStyle: { color: '#4A5568' } },
          splitLine: { lineStyle: { type: 'dashed', color: '#E2E8F0' } },
          axisLabel: {
            formatter: (value) => new Intl.NumberFormat('en-US', { notation: 'compact' }).format(value)
          }
        },
        series: echartsSeries
      };

      this._chart.setOption(option, true);
    }
  }

  customElements.define('bw-line-chart', BWLineChart);
})();
