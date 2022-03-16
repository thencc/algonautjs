const { default: Algonaut } = require('../dist/cjs/index');
const dotenv = require('dotenv');
dotenv.config();

const APPID = 66942261;

const algonaut = new Algonaut({
	BASE_SERVER: 'https://testnet-algorand.api.purestake.io/ps2',
	LEDGER: 'TestNet',
	PORT: '',
	API_TOKEN: { 'X-API-Key': process.env.PURESTAKE_API_TOKEN }
});

const algonautWithIndexer = new Algonaut({
    BASE_SERVER: 'https://testnet-algorand.api.purestake.io/ps2',
    LEDGER: 'TestNet',
    INDEX_SERVER: 'https://testnet-algorand.api.purestake.io/idx2',
    PORT: '',
    API_TOKEN: { 'X-API-Key': process.env.PURESTAKE_API_TOKEN }
});

(async () => {
    console.log('Testing getAppInfo');
    let time = new Date().getTime();
    let res = await algonaut.getAppInfo(APPID);
    console.log(res);
    console.log('Fetched in ' + (new Date().getTime() - time).toString() + 'ms');

    console.log('Testing getAppGlobalState');
    time = new Date().getTime();
    res = await algonaut.getAppGlobalState(APPID);
    console.log(res);
    console.log('Fetched in ' + (new Date().getTime() - time).toString() + 'ms');

})();