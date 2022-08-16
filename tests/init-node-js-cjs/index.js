// const Algonaut = require('@thencc/algonautjs').default; // this works
// const { default: Algonaut } = require('@thencc/algonautjs'); // AND this works
const { Algonaut } = require('@thencc/algonautjs'); // AND this works
console.log('Algonaut', Algonaut);

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

	// test api call
	algonaut.getAppInfo(49584323).then(bricksInfo => {
		console.log('bricksInfo');
		console.log(bricksInfo);
	});

	console.log('finished');
	// throw new Error('bewm');
})();
