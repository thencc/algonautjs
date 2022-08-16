// works
import { Algonaut } from '@thencc/algonautjs';

// works
// import AlgonautJS from '@thencc/algonautjs';
// console.log('AlgonautJS', AlgonautJS);
// const Algonaut = AlgonautJS.default;

// this SHOULD work but doesnt...
// import { default as Algonaut } from '@thencc/algonautjs';

// test instance
console.log('Algonaut', Algonaut);

// works
import { buffer } from '@thencc/algonautjs';
console.log('buffer', buffer);

(async () => {
	console.log('started');

	const algonaut = new Algonaut({
		BASE_SERVER: process.env.BASE_SERVER,
		INDEX_SERVER: process.env.INDEX_SERVER,
		LEDGER: process.env.LEDGER,
		PORT: process.env.PORT,
		API_TOKEN: { [process.env.API_TOKEN_HEADER]: process.env.API_TOKEN }
	});
	// console.log('algonaut', algonaut);

	// gaction-test-1 acct - BJVIWIXUZYEEL2WGAPKVUGZIVWJ5DTFOROJZY5CBGL25WJIR74MFJP2QJU
	const memo = 'abuse uphold tourist sadness deer seat apple spider taxi senior priority upset skirt slush under skirt globe retire damp sing beauty share crime abandon long';
	algonaut.recoverAccount(memo);

	// test api call
	algonaut.getAppInfo(49584323).then(bricksInfo => {
		console.log('bricksInfo');
		console.log(bricksInfo);
	});

	console.log('finished');
})();