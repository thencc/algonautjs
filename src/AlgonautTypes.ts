

export interface AlgonautConfig {
	BASE_SERVER: string;
	LEDGER: string;
	PORT: string;
	API_TOKEN: any;
}


export type AlgonautError = {
	message: string;
	rawError: Error;
}

export type AlgonautTransactionStatus = {
	status: 'success' | 'fail';
	message: string;
	error?: Error;
}

export type AlgonautWallet = {
	address: string;
	mnemonic: string;
}