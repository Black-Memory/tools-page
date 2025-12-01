import type { DepositForm } from '@/types/interface'
import { BigNumber, ethers } from 'ethers'

const abi = [
  'function deposit(uint256 assets, address receiver) external payable',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
]

const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
const contractAddress = '0xd9b2CB2FBAD204Fc548787EF56B918c845FCce40'


export function deposit(formData: DepositForm, logFunc: (log: string) => void, errLog: (error: string) => void): Function {
  // console.log('启动存款流程，参数:', formData)
  const provider = new ethers.providers.WebSocketProvider(formData.rpcUrl)
  const wallet = new ethers.Wallet(formData.privateKey, provider)
  logFunc(`使用地址: ${wallet.address}`)

  const usdcContract = new ethers.Contract(USDC_ADDRESS, abi, wallet)
  const depositContract = new ethers.Contract(contractAddress, abi, wallet)
  const amountInUSDC = ethers.utils.parseUnits(formData.amount.toString(), 6) // USDC 通常有 6 位小数
  let isStop = false
  let timer: string | number | NodeJS.Timeout | null | undefined = null
  const task = async () => {
    // 1. 检查授权金额
    logFunc('检查授权金额...')

    const allowance = await usdcContract.allowance(wallet.address, contractAddress)
    if (allowance.gte(amountInUSDC)) {
      logFunc('授权检查通过')
    } else {
      logFunc('授权金额不足，正在批准...')
      // 2. 批准 autoUsdai 合约可以花费你的 USDC
      let nonce = await wallet.getTransactionCount('latest')
      const approveTx = await usdcContract.approve(contractAddress, amountInUSDC, {
        gasLimit: formData.gasLimit,
        nonce,
        // gasPrice: ethers.utils.parseUnits(formData.gasPrice.toString(), 'gwei'),
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

    //构建交易，后续只要递增nonce即可

    const depositFunc = async () => {
      // const data = depositContract.interface.encodeFunctionData('deposit', [amountInUSDC, wallet.address])
      // sendToProtectPRC(wallet, contractAddress, data, formData).then((depositTx: any) => {
      //   logFunc(`存款交易已发送，交易哈希: ${depositTx.transactionHash}`)
      // })

      logFunc(`预检查...`)
      //@ts-ignore
      const gasLimit = await depositContract.estimateGas.deposit(amountInUSDC, wallet.address, {
        nonce: nonce, // 使用并递增 nonce
        gasLimit: formData.gasLimit,
        gasPrice: ethers.utils.parseUnits(formData.gasPrice.toString(), 'gwei'),
        value: 0, // 如果需要发送 ETH，可以在这里设置
      }).then(() => {

        //发送交易
        depositContract.deposit(amountInUSDC, wallet.address, {
          nonce: nonce, // 使用并递增 nonce
          gasLimit: formData.gasLimit,
          gasPrice: ethers.utils.parseUnits(formData.gasPrice.toString(), 'gwei'),
          value: 0, // 如果需要发送 ETH，可以在这里设置
        }).then((depositTx: any) => {
          logFunc(`存款交易已发送，交易哈希: ${depositTx.hash}`)
          depositTx.wait().then((receipt: any) => {
            logFunc(`存款交易已确认`)
          })
        })

      }).catch(err => {
        logFunc(`预检查失败,1s后重试`)
        timer = setTimeout(() => {
          depositFunc()
        }, 1000);
      })




    }
    await depositFunc()
    // timer = setInterval(async () => {
    //   if (isStop) {
    //     return
    //   }
    //   await depositFunc()
    // }, 1000)
  }
  task().catch(error => {
    errLog(error?.message || '发生错误')
  })

  return () => {
    isStop = true
    timer && clearInterval(timer)
    logFunc('已停止发送，存款终止。')
  }
}



