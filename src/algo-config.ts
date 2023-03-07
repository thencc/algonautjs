import type { AlgonautConfig } from './AlgonautTypes';

export const testnetConfig: AlgonautConfig['nodeConfig'] = {
	LEDGER: 'testnet',
	BASE_SERVER: 'https://testnet-api.algonode.cloud',
	INDEX_SERVER: '',
	API_TOKEN: '',
	PORT: '',
};
export const mainnetConfig: AlgonautConfig['nodeConfig'] = {
	LEDGER: 'mainnet',
	BASE_SERVER: 'https://mainnet-api.algonode.cloud',
	INDEX_SERVER: '',
	API_TOKEN: '',
	PORT: '',
};
export const defaultNodeConfig = testnetConfig;
