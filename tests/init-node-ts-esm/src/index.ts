// import Algonaut from '@thencc/algonautjs'; // works
import { Algonaut } from '@thencc/algonautjs'; // works

async function run() {
	console.log('run started');

	console.log(Algonaut);

	const algonaut = new Algonaut({
		// nodeConfig: {
		// 	BASE_SERVER: process.env.NCC_BASE_SERVER!,
		// 	INDEX_SERVER: process.env.NCC_INDEX_SERVER!,
		// 	LEDGER: process.env.NCC_LEDGER!,
		// 	PORT: process.env.NCC_PORT!,
		// 	API_TOKEN: { [process.env.NCC_API_TOKEN_HEADER!]: process.env.NCC_API_TOKEN! }
		// }
	});

	// gaction-test-1 acct - BJVIWIXUZYEEL2WGAPKVUGZIVWJ5DTFOROJZY5CBGL25WJIR74MFJP2QJU
	const memo = 'abuse uphold tourist sadness deer seat apple spider taxi senior priority upset skirt slush under skirt globe retire damp sing beauty share crime abandon long';
	let accts = await algonaut.mnemonicConnect(memo);
	console.log('accts', accts);

	// test api call
	const appInfo = await algonaut.getAppInfo(49584323);
	console.log(appInfo);

	console.log('done');

	// TODO catch this somehow
	// throw new Error('bewm');
}
run();