/* eslint-disable @typescript-eslint/no-floating-promises */

import Web3, { HttpProvider } from 'web3';
import { Web3Account } from 'web3-eth-accounts';
import minimist from 'minimist';
import { Environment } from './types';

let currentTxCount = 0;

const getRandomInt = (interval: { min: number; max: number }): number => {
  return Math.floor(Math.random() * (interval.max - interval.min) + interval.min);
};

const getRandomDouble = (interval: { min: number; max: number }): number => {
  return interval.min + (interval.max - interval.min) * Math.random();
};

const createWeb3Instance = (nodeUrl: string): Web3 => {
  const web3 = new Web3(nodeUrl);
  return new Web3(nodeUrl);
};

const createAccount = (web3: Web3, privateKey: string): Web3Account => {
  return web3.eth.accounts.privateKeyToAccount(privateKey);
};

const getBalance = async (web3: Web3, publicKey: string) => {
  const balance = await web3.eth.getBalance(publicKey);

  return web3.utils.fromWei(balance, 'ether');
};

const getEnvVariables = (): Environment => {
  const args = minimist(process.argv.slice(2), { string: ['private'] }) as unknown as Pick<
    Environment,
    'private' | 'txCount'
  >;

  return {
    nodeUrl: 'https://rpc-testnet.unit0.dev',
    amount: 100000000000000,
    ...args,
  };
};

const sendTransaction = async (web3: Web3, env: Environment, account: Web3Account) => {
  const block = await web3.eth.getBlock();

  const randomAmount = getRandomInt({ min: env.amount * 0.75, max: env.amount * 1.25 });
  const randomGas = getRandomInt({ min: 30_000, max: 90_000 });
  const maxFeePerGas = getRandomDouble({ min: 0.7, max: 1 }).toFixed(9);
  const maxPriorityFeePerGas = getRandomDouble({ min: 0.01, max: 0.15 }).toFixed(2);

  const signedTransaction = await account.signTransaction({
    to: account.address,
    from: account.address,
    value: randomAmount,
    gas: randomGas,
    maxFeePerGas: web3.utils.toWei(maxFeePerGas, 'Gwei'), // '0x59682F00', // 1.5 Gwei
    maxPriorityFeePerGas: web3.utils.toWei(maxPriorityFeePerGas, 'Gwei'), // '0x1DCD6500', // '0x1DCD6500', // .5 Gwei
    type: '0x2',
  });

  console.log('\t Signed   - [x]');

  const event = await web3.eth.sendSignedTransaction(signedTransaction.rawTransaction);

  console.log(`\t Sended   - [${randomAmount}wei]`);
  console.log(`\t Used gas - [${event.gasUsed}wei + ${event.cumulativeGasUsed}wei]`);
};

const main = async () => {
  const env = getEnvVariables();

  const web3 = createWeb3Instance(env.nodeUrl);

  const account = createAccount(web3, env.private);

  console.time('work');
  for (; currentTxCount < env.txCount; currentTxCount += 1) {
    try {
      const balance = await getBalance(web3, account.address);
      console.log(`TX: ${currentTxCount}/${env.txCount}. Balance: ${balance} .`);
    } catch (e) {
      console.log('Get balance error');
      currentTxCount -= 1;

      // eslint-disable-next-line no-continue
      continue;
    }

    try {
      await sendTransaction(web3, env, account);
      console.timeLog('work');
    } catch (e) {
      console.log('Error');
      currentTxCount -= 1;

      console.log(e);
      // Отдыхаем 5с в случае ошибки
      await new Promise((resolve) => {
        setTimeout(resolve, 5000);
      });
    }
  }

  console.timeEnd('work');
};

const mainWrapper = async () => {
  while (true) {
    try {
      await main();
      break;
    } catch (e) {
      console.log('Error');
    }
  }
};

mainWrapper();
