import { StrategyAPI } from '@/api/strategy'

// TradingView Datafeed 实现
export class CustomDatafeed {
  private configuration: any

  constructor() {
    this.configuration = {
      supports_search: false,
      supports_group_request: false,
      supported_resolutions: ['1', '5', '15', '30', '60', '240', '1D', '1W', '1M'],
      supports_marks: false,
      supports_timescale_marks: false,
      exchanges: [{
        value: 'BINANCE',
        name: 'Binance',
        desc: 'Binance Exchange'
      }],
      symbols_types: [{
        name: 'crypto',
        value: 'crypto'
      }]
    }
  }

  onReady(callback: (config: any) => void): void {
    setTimeout(() => callback(this.configuration), 0)
  }

  searchSymbols(userInput: string, exchange: string, symbolType: string, onResultReadyCallback: (result: any[]) => void): void {
    onResultReadyCallback([])
  }

  resolveSymbol(symbolName: string, onSymbolResolvedCallback: (symbol: any) => void, onResolveErrorCallback: (error: string) => void): void {
    // 处理收益曲线虚拟品种
    if (symbolName === 'MY_EQUITY') {
      const symbolStub = {
        name: 'MY_EQUITY',
        full_name: 'MY_EQUITY',
        description: '我的收益曲线',
        type: 'index',
        session: '24x7',
        timezone: 'Etc/UTC',
        exchange: '',
        minmov: 1,
        pricescale: 100,
        has_intraday: true,
        supported_resolutions: ['1', '5', '15', '30', '60', '240', '1D', '1W', '1M'],
        data_status: 'streaming',
        volume_precision: 0
      }
      setTimeout(() => onSymbolResolvedCallback(symbolStub), 0)
      return
    }

    // 解析普通符号名称
    const symbolStub = {
      name: symbolName,
      description: symbolName,
      type: 'crypto',
      session: '24x7',
      timezone: 'Asia/Shanghai',
      ticker: symbolName,
      exchange: 'BINANCE',
      minmov: 1,
      pricescale: 100,
      has_intraday: true,
      supported_resolutions: ['1', '5', '15', '30', '60', '240', '1D', '1W', '1M'],
      volume_precision: 2,
      data_status: 'streaming',
      format: 'price'
    }

    setTimeout(() => onSymbolResolvedCallback(symbolStub), 0)
  }

  getMarks(symbolInfo: any, from: number, to: number, onDataCallback: (marks: any[]) => void, resolution: string) {

    console.log('getMarks not implemented');


  }



  // 记录已加载的最早K线时间
  oldestBarTime: number | null = null

  async getBars(
    symbolInfo: any,
    resolution: string,
    periodParams: any,
    onResult: (bars: any[], meta: any) => void,
    onError: (error: string) => void
  ): Promise<void> {
    // 验证输入参数
    if (!periodParams.from || !periodParams.to || isNaN(periodParams.from) || isNaN(periodParams.to)) {
      console.error('Invalid timestamp parameters:', periodParams)
      setTimeout(() => onError('Invalid time parameters'), 0)
      return
    }

    // 处理收益曲线虚拟品种
    if (symbolInfo.name === 'MY_EQUITY') {
      try {
        // 从全局获取收益曲线数据
        const equityData = (window as any).myGlobalEquityData
        if (!equityData || equityData.length === 0) {
          console.log('未找到MY_EQUITY数据，返回空数据')
          setTimeout(() => onResult([], { noData: true }), 0)
          return
        }

        // 过滤时间范围内的数据
        // const startTime = periodParams.from * 1000
        const endTime = periodParams.to * 1000

        // console.log("提取数据MY_EQUITY 时间范围:", new Date(startTime).toLocaleString(), "至", new Date(endTime).toLocaleString( ));


        let filteredBars = equityData.filter((bar: any) => {
          // return bar.time >= startTime && bar.time <= endTime
          return bar.time <= endTime
        })
        // filteredBars = Array.from(filteredBars).sort((a: any, b: any) => a.time - b.time)

        const historyMetadata = {
          noData: true
        }
        setTimeout(() => onResult(filteredBars, historyMetadata), 0)
        return

      } catch (error) {
        console.error('处理MY_EQUITY数据失败:', error)
        setTimeout(() => onError((error as Error).message || 'MY_EQUITY数据处理失败'), 0)
        return
      }
    }

    try {
      // 调用真实API获取K线数据
      const mappedPeriod = this.mapResolutionToPeriod(resolution)

      // console.log(` 时间范围: ${new Date(periodParams.from * 1000).toLocaleString()} - ${new Date(periodParams.to * 1000).toLocaleString()} 数量:${periodParams.countBack}`);

      const response = await StrategyAPI.getKline({
        symbol: symbolInfo.name,
        period: mappedPeriod,
        endTime: this.oldestBarTime || periodParams.to * 1000,
        limit: 1000
      })

      if (response.code === 0 && response.data && response.data.length > 0) {
        const bar = response.data;
        this.oldestBarTime = bar[0].time
        // 过滤时间范围内的数据并转换格式
        const historyMetadata = {
          noData: bar.length === 0
        }
        setTimeout(() => onResult(bar, historyMetadata), 0)
        return
      }

    } catch (error) {
      console.error("k线加载失败", error);
      onError(error instanceof Error ? error.message : 'K线加载失败')
    }
  }

  subscribeBars(symbolInfo: any, resolution: string, onTick: (bar: any) => void, listenerGuid: string, onResetCacheNeededCallback?: () => void): void {
    StrategyAPI.subKline(symbolInfo.name, this.mapResolutionToPeriod(resolution), onTick).catch(err => {
      console.error('订阅K线失败:', err)
    });

  }

  unsubscribeBars(listenerGuid: string): void {
    // 取消实时数据订阅
    let [symbol, resolution] = listenerGuid.split("_#_")

    StrategyAPI.unsubKline(symbol as string, this.mapResolutionToPeriod(resolution as string)).catch(err => {
      console.error('取消订阅K线失败:', err)
    });
  }

  // 将TradingView的resolution映射到API的period格式
  private mapResolutionToPeriod(resolution: string): string {
    const resolutionMap: Record<string, string> = {
      '1': '1m',
      '5': '5m',
      '15': '15m',
      '30': '30m',
      '60': '1h',
      '240': '4h',
      '1D': '1d',
      '1W': '1w',
      '1M': '1M'
    }
    return resolutionMap[resolution] || resolution // 使用原值作为默认值
  }


}

// 创建图表配置的辅助函数
export const createChartConfig = (symbol: string, period: string, container: HTMLElement) => {
  const interval = mapPeriodToTradingViewInterval(period)



  return {
    symbol: symbol,
    datafeed: new CustomDatafeed(),
    interval: interval,
    container: container,
    library_path: '/charting_library/',
    locale: 'zh',
    disabled_features: [
      'volume_force_overlay',
      'create_volume_indicator_by_default',
      'header_widget',
    ],
    enabled_features: [
      "chart_template_storage",
      "hide_object_tree_and_price_scale_exchange_label",

    ],
    time_frames: [
    ],
    fullscreen: false,
    autosize: true,
    supports_marks: true,
    theme: "light",
    timezone: 'Asia/Shanghai',
    debug: false,
    width: container.clientWidth,
    toolbar_bg: '#ffffff',
    loading_screen: { backgroundColor: '#ffffff' },
    overrides: {
      'paneProperties.background': '#ffffff',
      'paneProperties.vertGridProperties.color': '#f0f0f0',
      'paneProperties.horzGridProperties.color': '#f0f0f0',
      'symbolWatermarkProperties.transparency': 90,
      'scalesProperties.textColor': '#191919',
    }
  }
}

// 周期格式转换
export const mapPeriodToTradingViewInterval = (period: string): string => {
  const periodMap: Record<string, string> = {
    '1m': '1',
    '5m': '5',
    '15m': '15',
    '30m': '30',
    '1h': '60',
    '4h': '240',
    '1d': '1D',
    '1w': '1W',
    '1M': '1M'
  }
  return periodMap[period] || period // 使用原值作为默认值
}


export const saveChartData = (chartId: string, data: any) => {
  localStorage.setItem(`tradewidget3-${chartId}`, JSON.stringify(data));
}

export const clearChartData = (chartId: string) => {
  localStorage.removeItem(`tradewidget3-${chartId}`);
}

export const getChartData = (chartId: string): any | null => {
  const data = localStorage.getItem(`tradewidget3-${chartId}`);
  return data ? JSON.parse(data) : null;
}
