// import Algonaut from '@thencc/algonautjs'; // works
import { Algonaut } from '@thencc/algonautjs'; // works

async function run() {
	console.log('run started');

	console.log(Algonaut);

	const algonaut = new Algonaut({
		BASE_SERVER: process.env.NCC_BASE_SERVER!,
		INDEX_SERVER: process.env.NCC_INDEX_SERVER!,
		LEDGER: process.env.NCC_LEDGER!,
		PORT: process.env.NCC_PORT!,
		API_TOKEN: { [process.env.NCC_API_TOKEN_HEADER!]: process.env.NCC_API_TOKEN! }
	});

	// test api call
	const appInfo = await algonaut.getAppInfo(49584323);
	console.log(appInfo);

	console.log('done');

	// TODO catch this somehow
	// throw new Error('bewm');
}
run();