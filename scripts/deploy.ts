import { Contract, utils } from 'ethers'
import { ethers, run } from 'hardhat'
import { version } from '../package.json'
import prompt from 'prompt'

const ethereumAddressRegex = /^0x[a-fA-F0-9]{40}$/

async function main() {
  const { name: chainName } = await ethers.provider.getNetwork()
  const [deployer] = await ethers.getSigners()
  const { attestorAddress, farcantasyContractAddress } = await prompt.get({
    properties: {
      attestorAddress: {
        required: true,
        description: 'Enter the address of the attestor',
        pattern: ethereumAddressRegex,
        message: 'Address must be a valid Ethereum address',
        default: '0x02E6777CFd5fA466defbC95a1641058DF99b4993',
      },
      farcantasyContractAddress: {
        required: true,
        description: 'Enter the address of the Farcantasy contract',
        pattern: ethereumAddressRegex,
        message: 'Address must be a valid Ethereum address',
        default: '0x961285B173001ADD1df2963323D1a73E10373416',
      },
    },
  })
  // Print chain info
  console.log(
    `Deploying contracts to ${chainName} with the account:`,
    deployer.address
  )
  console.log(
    'Account balance:',
    utils.formatEther(await deployer.getBalance())
  )
  // Deploy verifiers
  console.log('Deploying Verifiers...')
  const verifiers = ['CardRevealVerifier', 'CardSelectionVerifier']
  const verifierAddresses = [] as string[]
  for (const verifier of verifiers) {
    console.log(`Deploying ${verifier}...`)
    const Verifier = await ethers.getContractFactory(verifier)
    const verifierContract = await Verifier.deploy(version)
    await verifierContract.deployed()
    printTxInfo(verifierContract)
    await verifyContract(verifierContract, [version])
    verifierAddresses.push(verifierContract.address)
  }
  // Deploy Arena
  console.log('Deploying Arena...')
  const Arena = await ethers.getContractFactory('Arena')
  const arenaContract = await Arena.deploy(
    farcantasyContractAddress,
    verifierAddresses[0],
    verifierAddresses[1],
    attestorAddress
  )
  await arenaContract.deployed()
  printTxInfo(arenaContract)
  await verifyContract(arenaContract, [
    farcantasyContractAddress,
    verifierAddresses[0],
    verifierAddresses[1],
    attestorAddress,
  ])
  console.log('Done!')
}

function waitFor1Minute() {
  return new Promise((resolve) => setTimeout(resolve, 60 * 1000))
}

async function verifyContract(
  contract: Contract,
  constructorArguments: unknown[]
) {
  console.log('Wait for 1 minute to make sure blockchain is updated')
  await waitFor1Minute()
  console.log(`Verifying contract at ${contract.address} on Etherscan`)
  try {
    await run('verify:verify', {
      address: contract.address,
      constructorArguments,
    })
  } catch (err) {
    console.log(
      'Error verifiying contract on Etherscan:',
      err instanceof Error ? err.message : err
    )
  }
}

function printTxInfo(contract: Contract) {
  console.log('Contract deployed to:', contract.address)
  console.log(
    'Deploy tx gas price:',
    utils.formatEther(contract.deployTransaction.gasPrice || 0)
  )
  console.log(
    'Deploy tx gas limit:',
    utils.formatEther(contract.deployTransaction.gasLimit)
  )
}

void main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
