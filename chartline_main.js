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

  const parseMetadata = (metadata) => {
    if (!metadata) return { dimensions: [], measures: [] };
    const { dimensions: dimensionsMap, mainStructureMembers: measuresMap } = metadata;
    const dimensions = [];
    for (const key in dimensionsMap) {
      const dimension = dimensionsMap[key];
      dimensions.push({ key, ...dimension });
    }
    const measures = [];
    for (const key in measuresMap) {
      const measure = measuresMap[key];
      measures.push({ key, ...measure });
    }
    return { dimensions, measures };
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
      if (!dataBinding || dataBinding.state !== 'success') { return; }

      await getScriptPromisify("https://cdnjs.cloudflare.com/ajax/libs/echarts/5.4.3/echarts.min.js");

      if (!this._chart) {
        this._chart = echarts.init(this._root);
      }

      const { data, metadata } = dataBinding;
      const { dimensions, measures } = parseMetadata(metadata);

      if (!data || data.length === 0 || dimensions.length === 0 || measures.length === 0) {
        return;
      }

      // Estilos configurados para cada Año/Serie (B/N + Color con nodos distintos)
      const styleConfigs = [
        { lineType: 'solid', symbol: 'circle', symbolSize: 9, color: '#2B6CB0' },    // Azul (2024)
        { lineType: 'dashed', symbol: 'rect', symbolSize: 9, color: '#2F855A' },     // Verde (2025)
        { lineType: 'dotted', symbol: 'triangle', symbolSize: 11, color: '#DD6B20' }, // Naranja (2026)
        { lineType: 'dashDot', symbol: 'diamond', symbolSize: 11, color: '#805AD5' }  // Morado
      ];

      // Determinar cuál dimensión es el Año y cuál es el Mes
      // Si pusiste Año arriba y Mes abajo en el Builder: dimensions[0] = Año, dimensions[1] = Mes
      const seriesDim = dimensions[0]; 
      const categoryDim = dimensions.length > 1 ? dimensions[1] : dimensions[0];
      const primaryMeasure = measures[0];

      const categoriesSet = new Set();
      const seriesMap = {};

      // Parseo dinámico estilo SAP oficial
      data.forEach(row => {
        const seriesName = row[seriesDim.key]?.label || row[seriesDim.key]?.id || 'Serie 1';
        const catName = row[categoryDim.key]?.label || row[categoryDim.key]?.id || 'N/A';
        const val = row[primaryMeasure.key]?.raw !== undefined ? row[primaryMeasure.key].raw : null;

        categoriesSet.add(catName);

        if (!seriesMap[seriesName]) {
          seriesMap[seriesName] = {};
        }
        seriesMap[seriesName][catName] = val;
      });

      const categories = Array.from(categoriesSet).sort();
      const seriesNames = Object.keys(seriesMap);

      // Construir las series de ECharts con pivote
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

      const measureLabel = primaryMeasure.label || primaryMeasure.description || 'Valor';

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
          name: categoryDim.description || 'Categoría',
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
    }
  }

  customElements.define('bw-line-chart', BWLineChart);
})();
