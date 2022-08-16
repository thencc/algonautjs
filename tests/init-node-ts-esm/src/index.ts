// import Algonaut from '@thencc/algonautjs'; // works
import { Algonaut } from '@thencc/algonautjs'; // works

async function run() {
	console.log('run started');

	console.log(Algonaut);

	const algonaut = new Algonaut({
		BASE_SERVER: process.env.BASE_SERVER!,
		INDEX_SERVER: process.env.INDEX_SERVER!,
		LEDGER: process.env.LEDGER!,
		PORT: process.env.PORT!,
		API_TOKEN: { [process.env.API_TOKEN_HEADER!]: process.env.API_TOKEN! }
	});

	// test api call
	const appInfo = await algonaut.getAppInfo(49584323);
	console.log(appInfo);

	console.log('done');

	// TODO catch this somehow
	// throw new Error('bewm');
}
run();