/* eslint-disable @typescript-eslint/no-explicit-any */

// log helper - for disabling logs w a query string but not the dapp's logs
export const logger = {
	enabled: false,
	log(...args: any) {
		if (!this.enabled) return;
		console.log(...args);
	},
	debug(...args: any) {
		if (!this.enabled) return;
		console.debug(...args);
	},
};
