
const { default: AlgonautJS } = require('../dist/cjs');

const appIndex = 50213785;

const algonaut = new AlgonautJS({
	BASE_SERVER: 'https://testnet-algorand.api.purestake.io/ps2',
	LEDGER: 'TestNet',
	PORT: '',
	API_TOKEN: { 'X-API-Key': 'AsSjpC4Q8k5LXOsdJPsvN7Ee8auHi6DD2oubt1Ln' }
});

algonaut.recoverAccount('wine slice height claw science approve know egg task chase story boost lonely confirm purpose rack kite soldier proud opinion wish pencil hire abstract blade');


console.log('starting tests');
//console.log(algonaut);

async function runTxTest() {

	// opt into general purpose account app
	// const optIn = await algonaut.optInApp(appIndex, ['set_all',
	// 	'Another',
	// 	'Another swell guy',
	// 	'https://ncc.la/another-dawg.png',
	// 	'https://ncc.la',
	// 	'https://ncc.la/something-else.md',
	// 	'@memeeme']);

	// console.log(optIn);

	const update = await algonaut.callApp(
	  appIndex,
	  ['set_all',
	  'Loopy',
	  'A really swell guy',
	  'https://ncc.la/loopy-dawg.png',
	  'https://ncc.la',
	  'https://ncc.la/something-loopy.md',
	  '@loopyloop997']
	);


	console.log(update);

}

runTxTest();



