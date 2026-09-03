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

  const STYLE_CONFIGS = [
    { lineType: 'solid', symbol: 'circle', symbolSize: 9, color: '#2B6CB0' },
    { lineType: 'dashed', symbol: 'rect', symbolSize: 9, color: '#2F855A' },
    { lineType: 'dotted', symbol: 'triangle', symbolSize: 11, color: '#DD6B20' },
    { lineType: 'dashDot', symbol: 'diamond', symbolSize: 11, color: '#805AD5' },
    { lineType: 'solid', symbol: 'circle', symbolSize: 8, color: '#B83280' },
    { lineType: 'dashed', symbol: 'rect', symbolSize: 8, color: '#0D9488' },
    { lineType: 'dotted', symbol: 'triangle', symbolSize: 10, color: '#B7791F' },
    { lineType: 'dashDot', symbol: 'diamond', symbolSize: 10, color: '#4C51BF' }
  ];

  class BWLineChart extends HTMLElement {
    constructor() {
      super();
      this._shadowRoot = this.attachShadow({ mode: 'open' });
      this._shadowRoot.appendChild(prepared.content.cloneNode(true));
      this._root = this._shadowRoot.getElementById('root');
      this._chart = null;
      this._myDataBinding = {};
      this._chartTitle = "Reporte de Costos por Región";
      // ID técnico (metadata.dimensions[key].id) de la dimensión a usar como eje X.
      // Vacío = usa la primera dimensión agregada en el Builder (dimFeeds[0]).
      this._xAxisDimensionId = "";
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

    // Propiedad expuesta en el manifiesto (properties.xAxisDimensionId).
    // Se puede fijar desde el panel de Builder sin tocar el código del widget.
    get xAxisDimensionId() { return this._xAxisDimensionId; }
    set xAxisDimensionId(value) {
      this._xAxisDimensionId = value || "";
      this.render();
    }

    refreshChart() {
      if (this._chart) { this._chart.resize(); this.render(); }
    }

    // Decide qué dimension_N va al eje X. Orden de prioridad:
    // 1) el id técnico fijado explícitamente en xAxisDimensionId (propiedad configurable)
    // 2) la primera dimensión agregada en el Builder (dimFeeds[0]) como fallback
    _resolveXAxisKey(dimFeeds, dimensionsMeta) {
      if (this._xAxisDimensionId) {
        const match = dimFeeds.find((key) => dimensionsMeta[key]?.id === this._xAxisDimensionId);
        if (match) return match;
      }
      return dimFeeds[0];
    }

    async render() {
      const dataBinding = this._myDataBinding;
      if (!dataBinding || dataBinding.state !== 'success' || !dataBinding.data) { return; }

      await getScriptPromisify("https://cdnjs.cloudflare.com/ajax/libs/echarts/5.4.3/echarts.min.js");

      if (!this._chart) {
        this._chart = echarts.init(this._root);
      }

      const { data, metadata } = dataBinding;

      // 1. Llaves disponibles: N dimensiones, N measures (sin asumir cantidad fija)
      const dimFeeds = metadata.feeds.dimensions.values || [];
      const measFeeds = metadata.feeds.measures.values || [];

      if (dimFeeds.length < 1 || measFeeds.length < 1) {
        return; // Espera a que el usuario asigne al menos 1 dimensión y 1 measure
      }

      // 2. Eje X: configurable por propiedad, con fallback a la primera dimensión
      const xAxisKey = this._resolveXAxisKey(dimFeeds, metadata.dimensions);
      // El resto de las dimensiones (0, 1, N...) se combinan para formar el nombre de cada serie
      const groupDimKeys = dimFeeds.filter((key) => key !== xAxisKey);

      const xAxisName = metadata.dimensions[xAxisKey]?.description || 'Categoría';

      // 3. Measures: la primera va al eje Y primario, el resto comparte un eje Y secundario
      const primaryMeasureKey = measFeeds[0];
      const secondaryMeasureKeys = measFeeds.slice(1);
      const hasSecondaryAxis = secondaryMeasureKeys.length > 0;

      const primaryMeasureName = metadata.mainStructureMembers[primaryMeasureKey]?.label || 'Valor';
      const secondaryMeasureName = secondaryMeasureKeys
        .map((k) => metadata.mainStructureMembers[k]?.label || k)
        .join(' / ');

      const categoriesSet = new Set();
      // seriesMap: { seriesName: { catName: value } }
      const seriesMap = {};
      // Recuerda a qué eje (0=primario, 1=secundario) pertenece cada serie
      const seriesAxisMap = {};

      // 4. Recorre cada fila y, dentro de cada fila, cada measure -> una serie
      data.forEach((row) => {
        const xObj = row[xAxisKey];
        const catName = xObj?.label || xObj?.id || 'N/A';
        categoriesSet.add(catName);

        // Combina todas las dimensiones extra en una etiqueta de grupo, ej: "2024 | Norte"
        const groupLabel = groupDimKeys
          .map((key) => row[key]?.label || row[key]?.id)
          .filter(Boolean)
          .join(' | ');

        measFeeds.forEach((measureKey, measureIdx) => {
          const mObj = row[measureKey];
          const val = mObj?.raw !== undefined ? Number(mObj.raw) : null;
          const measureLabel = metadata.mainStructureMembers[measureKey]?.label || measureKey;

          // Nombre de serie: si hay varias measures, se antepone su nombre para diferenciarlas
          let seriesName;
          if (measFeeds.length > 1) {
            seriesName = groupLabel ? `${measureLabel} — ${groupLabel}` : measureLabel;
          } else {
            seriesName = groupLabel || measureLabel;
          }

          if (!seriesMap[seriesName]) {
            seriesMap[seriesName] = {};
            seriesAxisMap[seriesName] = measureIdx === 0 ? 0 : 1;
          }
          seriesMap[seriesName][catName] = val;
        });
      });

      const categories = Array.from(categoriesSet).sort();
      const seriesNames = Object.keys(seriesMap).sort();

      // 5. Construcción de series optimizada para Impresión y despeje de líneas
      const positions = ['top', 'bottom', 'top', 'bottom'];

      const echartsSeries = seriesNames.map((sName, idx) => {
        const style = STYLE_CONFIGS[idx % STYLE_CONFIGS.length];
        const dataValues = categories.map((cat) => (seriesMap[sName][cat] !== undefined ? seriesMap[sName][cat] : null));

        const firstValidIdx = dataValues.findIndex((v) => v !== null && v !== undefined);
        const firstVal = firstValidIdx !== -1 ? dataValues[firstValidIdx] : null;

        const currentPosition = positions[idx % positions.length];

        return {
          name: sName,
          type: 'line',
          yAxisIndex: seriesAxisMap[sName],
          connectNulls: true,
          lineStyle: { type: style.lineType, width: 2.5, color: style.color },
          itemStyle: { color: style.color },
          symbol: style.symbol,
          symbolSize: style.symbolSize,
          label: {
            show: true,
            position: currentPosition,
            fontSize: 8.5,
            fontWeight: 'bold',
            color: style.color,
            // Separación mayor respecto al nodo según el nivel de la serie
            distance: currentPosition === 'top' ? (idx === 2 ? 16 : 10) : 10,
            // Fondo blanco limpio para evitar que la línea atraviese el texto
            backgroundColor: '#FFFFFF',
            padding: [2, 3],
            borderRadius: 2,
            formatter: (params) => {
              if (params.value === null || params.value === undefined) return '';
              const num = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(params.value);
              return `$${num}`;
            }
          },
          labelLayout: {
            hideOverlap: false,
            moveOverlap: 'shiftY'
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
                distance: 12
              }
            }]
          } : undefined
        };
      });

      // 6. Eje(s) Y: primario siempre presente; secundario solo si hay >1 measure
      const yAxis = [
        {
          type: 'value',
          name: primaryMeasureName,
          axisLine: { show: true, lineStyle: { color: '#4A5568' } },
          splitLine: { lineStyle: { type: 'dashed', color: '#E2E8F0' } },
          axisLabel: {
            formatter: (value) => new Intl.NumberFormat('en-US', { notation: 'compact' }).format(value)
          }
        }
      ];

      if (hasSecondaryAxis) {
        yAxis.push({
          type: 'value',
          name: secondaryMeasureName,
          position: 'right',
          axisLine: { show: true, lineStyle: { color: '#4A5568' } },
          splitLine: { show: false },
          axisLabel: {
            formatter: (value) => new Intl.NumberFormat('en-US', { notation: 'compact' }).format(value)
          }
        });
      }

      // 7. Opciones finales del gráfico
      const option = {
        title: { text: this._chartTitle, left: 'center', textStyle: { color: '#1A202C', fontSize: 16 } },
        tooltip: {
          trigger: 'axis',
          valueFormatter: (value) => (value !== null && value !== undefined ? new Intl.NumberFormat('en-US').format(value) : '-')
        },
        legend: { bottom: 5, type: 'scroll' },
        grid: {
          left: '8%',
          right: hasSecondaryAxis ? '10%' : '5%',
          bottom: '15%',
          top: '15%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          data: categories,
          name: xAxisName,
          axisLine: { lineStyle: { color: '#4A5568' } }
        },
        yAxis,
        series: echartsSeries
      };

      this._chart.setOption(option, true);
    }
  }

  customElements.define('bw-line-chart', BWLineChart);
})();
