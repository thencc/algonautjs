// script to create a blank account to test with
const { default: Algonaut } = require('../dist/cjs/index');
const dotenv = require('dotenv');
const open = require('open');
dotenv.config();
const algonaut = new Algonaut({
    BASE_SERVER: 'https://testnet-algorand.api.purestake.io/ps2',
    LEDGER: 'TestNet',
    PORT: '',
    API_TOKEN: { 'X-API-Key': process.env.PURESTAKE_API_TOKEN } 
});

console.log('Creating an account on TestNet.')
let wallet = algonaut.createWallet();
console.log('ADDRESS:');
console.log(wallet.address);
console.log('MNEMONIC:')
console.log(wallet.mnemonic);

open('https://bank.testnet.algorand.network/');