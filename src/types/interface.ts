export interface DepositForm {
  rpcUrl: string
  privateKey: string
  amount: number
  gasLimit: number
  gasPrice: number
  fastGasPrice:number

}



export interface Strategy {
  id: string
  name: string
  symbol: string
  period: string
  strategyType: string
  strategyConfig: {
    maPeriod?: number
    emaPeriod?: number
    [key: string]: any
  }
  description?: string
  // amount?: number
  status: 'stopped' | 'running'
  direction?: 'long' | 'short' | 'none'
  // profit: number
  createdAt: string
}


// 策略配置字段描述接口
export interface StrategyFieldConfig {
  label: string;        // 字段显示名称
  type: 'number' | 'string' | 'boolean' | 'select'; // 字段类型
  defaultValue?: any;   // 默认值
  min?: number;         // 最小值（仅数字类型）
  max?: number;         // 最大值（仅数字类型）
  options?: { label: string; value: any }[]; // 选项（仅select类型）
  required?: boolean;   // 是否必填
}

// 策略信息接口
export interface StrategyInfo {
  type: string;
  desc: string;
  config: Record<string, StrategyFieldConfig>;
}

export interface StrategyConfigs {
  symbols: string[];
  periods: string[];
  strategyInfos: StrategyInfo[];
}
