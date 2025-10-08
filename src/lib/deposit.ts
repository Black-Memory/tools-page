import type { DepositForm } from '@/types/interface'

import { ethers } from 'ethers'

const abi = [
  'function deposit(uint256 assets_) external payable',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
]

const USDC_ADDRESS = '0xaf88d065e77c8cc2239327c5edb3a432268e5831'
const autoUsdaiAddress = '0x62ddf301b21970e7cc12c34caac9ce9bc975c0a9'

export function deposit (formData: DepositForm, logFunc: (log: string) => void, errLog: (error: string) => void): Function {
  const provider = new ethers.providers.WebSocketProvider(formData.rpcUrl)

  const wallet = new ethers.Wallet(formData.privateKey, provider)

  const usdcContract = new ethers.Contract(USDC_ADDRESS, abi, wallet)
  const autoUsdaiContract = new ethers.Contract(autoUsdaiAddress, abi, wallet)
  const amountInUSDC = ethers.utils.parseUnits(formData.amount.toString(), 6) // USDC 通常有 6 位小数
  let isStop = false
  const task = async () => {
    // 1. 检查授权金额
    logFunc('检查授权金额...')

    const allowance = await usdcContract.allowance(wallet.address, autoUsdaiAddress)
    if (allowance.gte(amountInUSDC)) {
      logFunc('授权检查通过')
    } else {
      logFunc('授权金额不足，正在批准...')
      // 2. 批准 autoUsdai 合约可以花费你的 USDC
      const approveTx = await usdcContract.approve(autoUsdaiAddress, ethers.constants.MaxUint256, {
        gasLimit: formData.gasLimit,
        gasPrice: ethers.utils.parseUnits(formData.gasPrice.toString(), 'gwei'),
      })
      logFunc(`批准交易已发送，交易哈希: ${approveTx.hash}`)
      await approveTx.wait() // 等待交易被矿工打包
      logFunc('批准交易已确认')
    }
    if (isStop) {
      return
    }
    // 提取nonce数据
    let nonce = await provider.getTransactionCount(wallet.address, 'latest')
    logFunc(`当前nonce: ${nonce}`)
    if (isStop) {
      return
    }
    // 监听区块，每个区块发送一次存款
    provider.on('block', async blockNumber => {
      logFunc(`新块 ${blockNumber}，尝试存款...`)

      const depositTx = await autoUsdaiContract.deposit(amountInUSDC, {
        nonce: nonce++, // 使用并递增 nonce
        gasLimit: formData.gasLimit,
        gasPrice: ethers.utils.parseUnits(formData.gasPrice.toString(), 'gwei'),
        value: 0, // 如果需要发送 ETH，可以在这里设置
      })
      logFunc(`存款交易已发送，交易哈希: ${depositTx.hash}`)
    })
  }
  task().catch(error => {
    errLog(error?.message || '发生错误')
  })

  return () => {
    isStop = true
    provider.removeAllListeners('block')
    logFunc('已停止监听区块，存款终止。')
  }
}
