// TradingView Datafeed 适配器
window.Datafeeds = window.Datafeeds || {};

window.Datafeeds.UDFCompatibleDatafeed = function(datafeedURL, updateFrequency) {
  this._datafeedURL = datafeedURL;
  this._configuration = {
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
  };
};

window.Datafeeds.UDFCompatibleDatafeed.prototype.onReady = function(callback) {
  console.log('=====onReady running');
  setTimeout(() => callback(this._configuration), 0);
};

window.Datafeeds.UDFCompatibleDatafeed.prototype.searchSymbols = function(userInput, exchange, symbolType, onResultReadyCallback) {
  console.log('====searchSymbols running');
  onResultReadyCallback([]);
};

window.Datafeeds.UDFCompatibleDatafeed.prototype.resolveSymbol = function(symbolName, onSymbolResolvedCallback, onResolveErrorCallback) {
  console.log('=====resolveSymbol running', symbolName);

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
      has_no_volume: true,
     supported_resolutions: ['1', '5', '15', '30', '60', '240', '1D', '1W', '1M'],
      data_status: 'streaming',
      volume_precision: 0
    };
    setTimeout(() => onSymbolResolvedCallback(symbolStub), 0);
    return;
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
    pricescale: 100, // 修改为合理的价格精度
    volume_precision: 2,
    data_status: 'streaming',
    format: 'price'
  };

  setTimeout(() => onSymbolResolvedCallback(symbolStub), 0);
};

window.Datafeeds.UDFCompatibleDatafeed.prototype.getBars = function(symbolInfo, resolution, periodParams, onResult, onError) {
  console.log('=====getBars running', {
    symbol: symbolInfo.name,
    resolution: resolution,
    periodParams: periodParams,
    from: new Date(periodParams.from * 1000).toISOString(),
    to: new Date(periodParams.to * 1000).toISOString()
  });

  // 验证输入参数
  if (!periodParams.from || !periodParams.to || isNaN(periodParams.from) || isNaN(periodParams.to)) {
    console.error('Invalid timestamp parameters:', periodParams);
    setTimeout(() => onError && onError('Invalid time parameters'), 0);
    return;
  }

  // 处理收益曲线虚拟品种
  if (symbolInfo.name === 'MY_EQUITY') {
    try {
      console.log('处理MY_EQUITY数据请求');

      // 从全局获取收益曲线数据
      const equityData = window.myGlobalEquityData;
      if (!equityData || equityData.length === 0) {
        console.log('未找到MY_EQUITY数据，返回空数据');
        setTimeout(() => onResult([], { noData: true }), 0);
        return;
      }

      console.log('找到MY_EQUITY数据，共', equityData.length, '个数据点');

      // 过滤时间范围内的数据
      const startTime = periodParams.from * 1000;
      const endTime = periodParams.to * 1000;

      const filteredBars = equityData.filter(bar =>
        bar.time >= startTime && bar.time < endTime
      );

      console.log(`MY_EQUITY数据过滤后:`, {
        原始数据: equityData.length,
        过滤后: filteredBars.length,
        时间范围: [new Date(startTime), new Date(endTime)]
      });

      const historyMetadata = {
        noData: filteredBars.length === 0
      };

      setTimeout(() => onResult(filteredBars, historyMetadata), 0);
      return;

    } catch (error) {
      console.error('处理MY_EQUITY数据失败:', error);
      setTimeout(() => onError && onError(error.message || 'MY_EQUITY数据处理失败'), 0);
      return;
    }
  }

  try {
    // 优先使用真实K线数据
    const realKlineData = window.myGlobalKlineData;
    if (realKlineData && realKlineData.length > 0) {
      console.log('使用真实K线数据，共', realKlineData.length, '条数据');

      // 过滤时间范围内的数据
      const startTime = periodParams.from * 1000;
      const endTime = periodParams.to * 1000;

      const filteredBars = realKlineData.filter(bar => {
        const barTime = typeof bar.time === 'number' ? bar.time : new Date(bar.time).getTime();
        return barTime >= startTime && barTime < endTime;
      }).map(bar => ({
        time: typeof bar.time === 'number' ? bar.time : new Date(bar.time).getTime(),
        open: parseFloat(bar.open),
        high: parseFloat(bar.high),
        low: parseFloat(bar.low),
        close: parseFloat(bar.close),
        volume: parseFloat(bar.volume || 0)
      }));

      console.log(`真实K线数据过滤后:`, {
        原始数据: realKlineData.length,
        过滤后: filteredBars.length,
        时间范围: [new Date(startTime), new Date(endTime)]
      });

      const historyMetadata = {
        noData: filteredBars.length === 0
      };

      setTimeout(() => onResult(filteredBars, historyMetadata), 0);
      return;
    }

    // 生成模拟数据（原有逻辑）
    console.log('未找到真实K线数据，生成模拟数据');
    const bars = [];
    const interval = this.getIntervalInMs(resolution);

    // 确保时间范围合理
    const startTime = periodParams.from * 1000; // 转换为毫秒
    const endTime = periodParams.to * 1000;     // 转换为毫秒

    if (startTime >= endTime) {
      console.log('Invalid time range - start >= end');
      setTimeout(() => onResult([], { noData: true }), 0);
      return;
    }

    let currentTime = startTime;
    let price = 65000; // BTC 基础价格

    // 限制数据点数量，避免生成过多数据
    const maxBars = Math.min(1000, Math.ceil((endTime - startTime) / interval));
    let barCount = 0;

    console.log('Generating bars:', {
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      interval,
      maxBars,
      firstDataRequest: periodParams.firstDataRequest,
      countBack: periodParams.countBack
    });

    while (currentTime < endTime && barCount < maxBars) {
      const open = price;
      const change = (Math.random() - 0.5) * price * 0.02; // 2% 波动
      const close = open + change;
      const high = Math.max(open, close) * (1 + Math.random() * 0.01);
      const low = Math.min(open, close) * (1 - Math.random() * 0.01);
      const volume = Math.random() * 100 + 10;

      // 根据官方API，Bar.time应该是毫秒时间戳
      const barTime = this.alignTimeToResolutionMs(currentTime, resolution);

      bars.push({
        time: barTime, // 毫秒时间戳
        low: parseFloat(low.toFixed(2)),
        high: parseFloat(high.toFixed(2)),
        open: parseFloat(open.toFixed(2)),
        close: parseFloat(close.toFixed(2)),
        volume: parseFloat(volume.toFixed(2))
      });

      currentTime += interval;
      price = close;
      barCount++;
    }

    console.log(`Generated ${bars.length} bars`, {
      first: bars[0],
      last: bars[bars.length - 1],
      sample: bars.slice(0, 2)
    });

    // 根据官方API使用HistoryCallback格式
    const historyMetadata = {
      noData: bars.length === 0
    };

    setTimeout(() => onResult(bars, historyMetadata), 0);

  } catch (error) {
    console.error('Error in getBars:', error);
    setTimeout(() => onError && onError(error.message || '数据生成失败'), 0);
  }
};window.Datafeeds.UDFCompatibleDatafeed.prototype.subscribeBars = function(symbolInfo, resolution, onTick, listenerGuid, onResetCacheNeededCallback) {
  console.log('=====subscribeBars running:', {
    symbol: symbolInfo.name,
    resolution,
    listenerGuid
  });
  // 实时数据订阅 - 这里暂时不实现
  // onTick 回调函数应该在有新数据时被调用，参数是 Bar 对象
};

window.Datafeeds.UDFCompatibleDatafeed.prototype.unsubscribeBars = function(listenerGuid) {
  console.log('=====unsubscribeBars running:', listenerGuid);
  // 取消实时数据订阅
};

window.Datafeeds.UDFCompatibleDatafeed.prototype.getIntervalInMs = function(resolution) {
  const intervalMap = {
    '1': 60 * 1000,
    '5': 5 * 60 * 1000,
    '15': 15 * 60 * 1000,
    '30': 30 * 60 * 1000,
    '60': 60 * 60 * 1000,
    '240': 4 * 60 * 60 * 1000,
    '1D': 24 * 60 * 60 * 1000,
    '1W': 7 * 24 * 60 * 60 * 1000,
    '1M': 30 * 24 * 60 * 60 * 1000
  };
  return intervalMap[resolution] || 60 * 60 * 1000;
};

// 时间对齐函数 - 返回毫秒时间戳
window.Datafeeds.UDFCompatibleDatafeed.prototype.alignTimeToResolutionMs = function(timestampMs, resolution) {
  const date = new Date(timestampMs);

  switch (resolution) {
    case '1':
      // 对齐到分钟
      return Math.floor(timestampMs / (60 * 1000)) * (60 * 1000);
    case '5':
      // 对齐到5分钟
      return Math.floor(timestampMs / (5 * 60 * 1000)) * (5 * 60 * 1000);
    case '15':
      // 对齐到15分钟
      return Math.floor(timestampMs / (15 * 60 * 1000)) * (15 * 60 * 1000);
    case '30':
      // 对齐到30分钟
      return Math.floor(timestampMs / (30 * 60 * 1000)) * (30 * 60 * 1000);
    case '60':
      // 对齐到小时
      return Math.floor(timestampMs / (60 * 60 * 1000)) * (60 * 60 * 1000);
    case '240':
      // 对齐到4小时
      return Math.floor(timestampMs / (4 * 60 * 60 * 1000)) * (4 * 60 * 60 * 1000);
    case '1D':
      // 对齐到日
      date.setUTCHours(0, 0, 0, 0);
      return date.getTime();
    case '1W':
      // 对齐到周一
      const dayOfWeek = date.getUTCDay();
      const daysToMonday = (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
      date.setUTCDate(date.getUTCDate() - daysToMonday);
      date.setUTCHours(0, 0, 0, 0);
      return date.getTime();
    case '1M':
      // 对齐到月初
      date.setUTCDate(1);
      date.setUTCHours(0, 0, 0, 0);
      return date.getTime();
    default:
      return timestampMs;
  }
};

// 保留原函数以备兼容性使用
window.Datafeeds.UDFCompatibleDatafeed.prototype.alignTimeToResolution = function(timestamp, resolution) {
  // 转换为毫秒时间戳然后调用新函数
  return this.alignTimeToResolutionMs(timestamp * 1000, resolution);
};
