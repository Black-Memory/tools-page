import { ethers } from "ethers";

// const axios = require("axios");
import axios from "axios";


export async function sendSignedTransaction(signedTx: string) {
    const rpcUrl = "https://eth.rpc.blxrbdn.com";

    const payload = {
        jsonrpc: "2.0",
        id: 1,
        method: "eth_sendRawTransaction",
        params: [signedTx],
    };

    try {
        const response = await axios.post(rpcUrl, payload, {
            headers: {
                "Content-Type": "application/json",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0",
            },
            timeout: 15000, // 可选：请求超时
        });

        if (response.data.error) {
            throw new Error(`RPC 错误: ${response.data.error.message}`);
        }

        return response.data.result; // 返回交易哈希
    } catch (error: any) {
        console.error("发送交易失败:", error?.message || error);
        throw error;
    }

}


export async function sendBundle(blockNumber: number, transactions: string[]) {
    const rpcUrl = "https://api.blxrbdn.com";
    // console.log(ethers.BigNumber.from(blockNumber).toHexString());

    const payload = {
        "id": "1",
        "method": "blxr_submit_bundle",
        "params": {
            "transaction": transactions,
            "block_number": ethers.utils.hexValue(ethers.BigNumber.from(blockNumber + 1)),
            "blocks_count": 10,
            "mev_builders": {
                "all": ""
            }
        }
    };


    try {
        const response = await axios.post(rpcUrl, payload, {
            headers: {
                "Content-Type": "application/json",
                "Authorization": "MzY1YzcyNTAtMTcwMC00NzY4LWExNDItODIzMzc2NWExYWM4OjlmNTJjNjMzZDZhZDkwMmYxY2JkN2NmZjIzYTliMDg2",
            },
            timeout: 15000, // 可选：请求超时
        });
        if (response.data.error) {
            throw new Error(`bulder 错误: ${response.data.error.message}`);
        }

        return response.data.result; // 返回交易哈希
    } catch (error: any) {
        console.error("发送交易失败:", error?.message || error);
        console.log(error.response.data);
        throw error;
    }

}
