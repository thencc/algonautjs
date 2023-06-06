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
		nodeConfig: {
			BASE_SERVER: process.env.NCC_BASE_SERVER,
			INDEX_SERVER: process.env.NCC_INDEX_SERVER,
			LEDGER: process.env.NCC_LEDGER,
			PORT: process.env.NCC_PORT,
			API_TOKEN: { [process.env.NCC_API_TOKEN_HEADER]: process.env.NCC_API_TOKEN }
		}
	});
	// console.log('algonaut', algonaut);

	// gaction-test-1 acct - BJVIWIXUZYEEL2WGAPKVUGZIVWJ5DTFOROJZY5CBGL25WJIR74MFJP2QJU
	const memo = 'abuse uphold tourist sadness deer seat apple spider taxi senior priority upset skirt slush under skirt globe retire damp sing beauty share crime abandon long';
	algonaut.authWithMnemonic(memo);

	// test api call
	algonaut.getAppInfo(49584323).then(bricksInfo => {
		console.log('bricksInfo');
		console.log(bricksInfo);
	});

	console.log('finished');
})();