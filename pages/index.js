import React, { useState, useEffect, useCallback } from 'react'
import Web3 from 'web3'
import contract from '@truffle/contract'
import detectEthereumProvider from '@metamask/detect-provider'

function Home() {

  const [Web3Api, setWeb3Api] = useState({ provider: null, metaMaskProvider: true, web3: null, contract: null })
  const [account, setAccount] = useState(null)
  const [balance, setBalance] = useState({ balance1: "Loading....", balance2: "Loading...." })
  const [reloadBal, setReloadBal] = useState(false)

  const reloadBalNow = useCallback(() => {
    console.log("reloadBal Called")
    setReloadBal(!reloadBal), [reloadBal]
  })

  const setAccountListener = useCallback(provider => {
    provider.on('accountsChanged', async accounts => {
      setAccount(accounts[0])
      console.log("accountsChanged Called")
      reloadBalNow()
    })
    provider._jsonRpcConnection.events.on('notification', payload => {
      const { method } = payload
      if (method === "metamask_unloackStateChanged") {
        console.log("metamask_unloackStateChanged Called")
        setAccount(null)
      }
    })
  }, [reloadBal])

  const load = async (provider) => {
    const contract = await loadContracts("demo2", provider)
    setWeb3Api({ web3: new Web3(provider), metaMaskProvider: true, provider, contract })
  }

  useEffect(() => {
    const loadProvider = async () => {
      let provider = null
      try {
        if (typeof window.ethereum !== 'undefined') {
          provider = await detectEthereumProvider()
        
          console.log('MetaMask is installed!')
          setAccountListener(provider)
          ethereum.request({ method: 'eth_requestAccounts' }).then((accounts) => {
            setAccount(accounts[0])
            load(provider)
          }).catch((error) => {
            console.log("Metamask Installed but Not Connected -- error")
            try {
              provider = new Web3.providers.HttpProvider("HTTP://127.0.0.1:7545")
              console.log("inside of Local web3")
              load(provider)
            } catch { }
          });
        }
        else if (!process.env.production) {
          console.log("inside of Local web3")
          try {
            provider = new Web3.providers.HttpProvider("HTTP://127.0.0.1:7545")
            const web3_2 = new Web3(provider)
            web3_2.eth.net.isListening().then(() => {
              console.log('Connected with HttpProvider')
              load(provider)
            })
              .catch(e => {
                console.log('Something went wrong: from HttpProvider ' + e)
                setWeb3Api({ provider: false })
              })
          }
          catch (e) { console.warn('web3_2 error' + e) }
        }
      }
      catch (e) {
        console.log('form first useEffect' + e)
      }
    }
    loadProvider()
  }, []);

  useEffect(() => {
    const loadBalance = async () => {
      const { contract, web3 } = Web3Api
      const balance1 = await web3.eth.getBalance(contract.address)
      const balance2 = await web3.eth.getBalance(account)
      setBalance({ balance1: web3.utils.fromWei(balance1, "ether"), balance2: web3.utils.fromWei(balance2, "ether") })
      console.log("loadBalance - Balance Loaded")
    }
    Web3Api.contract && account && loadBalance()
  }, [Web3Api, reloadBal, account])

  useEffect(() => {
    const getAccounts = async () => {
      if (!account) {
        try {
          const accounts = await Web3Api.web3.eth.getAccounts()
          setAccount(accounts[0])
        } catch (error) { console.log(error) }
      } else { }
    }
    Web3Api.web3 && getAccounts()
  }, [Web3Api.web3, account]);

  const addFunds = useCallback(async () => {
    const { contract, web3 } = Web3Api
    await contract.sendTransaction({
      from: account,
      value: web3.utils.toWei("1", "ether")
    })
    reloadBalNow()
  }, [Web3Api, account, reloadBal])

  const withdraw = useCallback(async () => {
    const { contract, web3 } = Web3Api
    const amount = web3.utils.toWei("1", "ether")
    console.log(amount)
    await contract.withdraw(amount, account, { from: account })
    reloadBalNow()
  }, [Web3Api, account, reloadBal])

  const loadContracts = async (name, provider) => {
    try {
      const res = await fetch(`/contracts/${name}.json`)
      const Artifact = await res.json()
      const _contract = contract(Artifact)
      _contract.setProvider(provider)
      let deployedContract = null
      try {
        deployedContract = await _contract.deployed()
      } catch {
        console.error("You are connected to the wrong network")
      }
      return deployedContract
    }
    catch (e) { console.warn(e) }
  }

  return (
    <div className='h-screen grid mx-2 place-content-center'>

      {Web3Api.metaMaskProvider ? <div><div className='text-blue-700 mx-2'>Account:</div>
          {account ? <div className='mx-2'> {account} </div>            
              : <button onClick={() => ethereum.request({ method: 'eth_requestAccounts' })}
                className='bg-blue-500 px-4 py-2 rounded text-white mx-2 mt-2 hover:bg-blue-600'>  Connect To MetaMask</button>}</div>
        : <div className='bg-yellow-300 text-black rounded mx-2 py-2 px-4 text-center font-normal text-sm'> Wallet is not detected! <a target='_blank' className='underline underline-offset-1' href='http://docs.metamask.io'>install Metamask</a></div>}




      <div className='text-3xl my-5 mx-2 text-center'>Current Smart Contract Bal:  <strong>{balance.balance1}</strong> Eth</div><div className='text-3xl mt-1 mb-5 text-center mx-2'>Msg.Sender Bal:  <strong>{balance.balance2}</strong> Eth</div><div className='space-x-4 flex justify-center'>
        <button className="bg-transparent hover:bg-blue-500 text-blue-700 font-semibold hover:text-white py-2 px-4 border border-blue-500 hover:border-transparent rounded disabled:text-gray-400"
          disabled={!account} onClick={addFunds}
        >Donate 1 Eth</button>
        <button className="bg-transparent hover:bg-blue-500 text-blue-700 font-semibold hover:text-white py-2 px-4 border border-blue-500 hover:border-transparent rounded disabled:text-gray-400"
          disabled={!account} onClick={withdraw}
        >Withdraw</button>
      </div>
    </div>
  )
}

export default Home