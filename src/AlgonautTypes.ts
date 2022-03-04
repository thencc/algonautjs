import algosdk from 'algosdk';


export type AlgonautConfig = {
	BASE_SERVER: string;
	LEDGER: string;
	PORT: string;
	API_TOKEN: any;
	SIGNING_MODE?: 'local' | 'wallet-connect' | 'algosigner';
}

export interface AlgonautStateData {
	key: string;
	value: string | number | bigint;
	address: string; // if we can detect an address, we put it here
}

export interface AlgonautContractSchema {
	localInts: number,
	localBytes: number,
	globalInts: number,
	globalBytes: number,
}

export interface AlgonautDeployArguments {
	tealApprovalCode: string;
	tealClearCode: string;
	args: any[];
	schema: AlgonautContractSchema;
	optionalFields?: AlgonautTransactionFields;
}

export interface AlgonautAppState {
	index: number;
	hasState: boolean;
	creatorAddress: string;
	globals: AlgonautStateData[];
	locals: AlgonautStateData[];
}

export interface AlgonautCallAppArguments {
	appIndex: number;
	appArgs: any[];
	optionalFields?: AlgonautTransactionFields; 
}

export interface AlgonautCreateAssetArguments {
	assetName: string;
	symbol: string;
	metaBlock: string;
	decimals: number;
	amount: number;
	assetURL?: string;
	defaultFrozen?: boolean;
	assetMetadataHash?: string;
}

export interface AlgonautSendASAArguments {
	to: string;
	assetIndex: number;
	amount: number|bigint;
}

export interface WalletConnectListener {
	onSessionUpdate(payload: any): void;
	onConnect(payload: any): void;
	onDisconnect(payload: any): void;
}

export interface AlgonautTxnCallbacks {
	onSign(payload: any): void;
	onSend(payload: any): void;
	onConfirm(payload: any): void;
}

export type AlgonautError = {
	message: string;
	rawError: Error;
}

export type AlgonautTransactionStatus = {
	status: 'success' | 'fail';
	message: string;
	index?: number;
	error?: Error;
	meta?: any;
}

export type AlgonautWallet = {
	address: string;
	mnemonic: string;
}

export type AlgonautTransactionFields = {
	accounts?: string[],
	applications?: number[],
	assets?: number[],
	reKeyTo?: string,
	note?: string,
	closeRemainderTo?: string,
	manager?: string,
	freeze?: string,
	clawback?: string,
	reserve?: string
}

export type AlgonautAtomicTransaction = {
	transaction: algosdk.Transaction;
	transactionSigner: algosdk.Account | algosdk.LogicSigAccount;
	isLogigSig: boolean;
}



