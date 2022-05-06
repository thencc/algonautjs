import { Buffer } from 'buffer';
import algosdk, { appendSignMultisigTransaction } from 'algosdk';
import {
	AlgonautConfig,
	AlgonautWallet,
	AlgonautTransactionStatus,
	AlgonautAtomicTransaction,
	AlgonautTransactionFields,
	AlgonautAppState,
	AlgonautStateData,
	AlgonautError,
	WalletConnectListener,
	AlgonautTxnCallbacks,
	AlgonautContractSchema,
	AlgonautCreateAssetArguments,
	AlgonautSendAssetArguments,
	AlgonautCallAppArguments,
	AlgonautDeployArguments,
	AlgonautLsigDeployArguments,
	AlgonautLsigCallAppArguments,
	AlgonautLsigSendAssetArguments,
	AlgonautPaymentArguments,
	AlgonautLsigPaymentArguments,
	AlgonautUpdateAppArguments
} from './AlgonautTypes';
// import * as sha512 from 'js-sha512';
// import * as CryptoJS from 'crypto-js';
// import { decode, encode } from 'hi-base32';

// @walletconnect/socket-transport incorrectly uses global in esm build... + @walletconnect/encoding uses Buffer in esm build... so use umd build
import WalletConnect from '@walletconnect/client/dist/umd/index.min.js'; // umd works in node + browser
import { IInternalEvent } from '@walletconnect/types';
import QRCodeModal from 'algorand-walletconnect-qrcode-modal';
import { formatJsonRpcRequest } from '@json-rpc-tools/utils';
import {
	isBrowser,
	isNode,
	isAndroid,
	isIOS,
	isMobile
} from '@walletconnect/utils';

// fix for wallectconnect websocket issue when backgrounded on mobile (uses request animation frame)
let wcReqAF = 0;

// wc fix (audio)
let wcS: HTMLAudioElement;
let wcSDone: HTMLAudioElement;

import waitSound from './lowtone';
import finishedSound from './finished';
waitSound;
finishedSound;
// console.log(waitSound);
// console.log(finishedSound);

import { FrameBus } from './FrameBus';

/*

AlgonautJS should have some "signing modes" which you set at invocation time

probably in
AlgonautConfig




for stateful contracts i think we want to read it in and hold all the
NV pairs as fields

and maybe read the TEAL and make wrapper methods for things we see in
a config file?

TBD:

- standard typed return values
- standard error values, pre-parse the algo error goop


there are a couple ways to go for atomic txs, i THINK the more pleasant API is

await runAtomicTransaction([
	await atomicSendASA(),
	await atomicSendAlgo(),
	await atomicCallApp()
])


TBD:



*/


// import { mainNetConfig as config } from './algoconfig';

// good resource: https://developer.algorand.org/solutions/integrate-algosigner-to-js-app-on-algorand/

declare global {
	interface Window {
		AlgoSigner: any;
	}
}

export default class Algonaut {

	// TBD: add algo wallet for mobile
	algodClient: algosdk.Algodv2;
	indexerClient = undefined as undefined | algosdk.Indexer;

	// FYI undefined if using wallet-connect, etc. perhaps rename to .accountLocal ?
	account = undefined as undefined | algosdk.Account; // ONLY defined if using local signing, not wallet-connet or hippo
	address = undefined as undefined | string;
	sKey = undefined as undefined | Uint8Array;
	mnemonic = undefined as undefined | string;

	config = undefined as undefined | AlgonautConfig;
	sdk = undefined as undefined | typeof algosdk;
	uiLoading = false;

	// microwallet aka hippo
	hippoWallet = {
		// private hippoWallet = { // for extra security we should do this

		// frameId: '',
		// ready: false,
		defaultSrc: '123',
		otherConfig: {},
		frameBus: undefined as undefined | FrameBus
	};

	// everything wallet connect
	walletConnect = {
		connected: false,
		connector: undefined as undefined | WalletConnect,
		accounts: [] as any[],
		address: '',
		assets: [] as any[],
		chain: undefined as any
	};

	/**
	 * Instantiates Algonaut.js.
	 *
	 * @example
	 * Usage:
	 *
	 * ```js
	 * import Algonaut from 'algonaut.js';
	 * const algonaut = new Algonaut({
	 *	 BASE_SERVER: 'https://testnet-algorand.api.purestake.io/ps2',
	 *	 INDEX_SERVER: 'https://testnet-algorand.api.purestake.io/idx2'
	 *	 LEDGER: 'TestNet',
	 *	 PORT: '',
	 *	 API_TOKEN: { 'X-API-Key': 'YOUR_API_TOKEN' }
	 * });
	 * ```
	 *
	 * @param config config object
	 */
	constructor(config: AlgonautConfig) {

		this.config = config;
		this.algodClient = new algosdk.Algodv2(config.API_TOKEN, config.BASE_SERVER, config.PORT);

		if (config.INDEX_SERVER) {
			this.indexerClient = new algosdk.Indexer(config.API_TOKEN, config.INDEX_SERVER, config.PORT);
		} else {
			console.warn('No indexer configured because INDEX_SERVER was not provided.');
		}

		// expose entire algosdk in case the dapp needs more
		this.sdk = algosdk;

		// hippo init
		if (config.SIGNING_MODE && config.SIGNING_MODE == 'hippo') {
			this.initHippo({
				id: config.HIPPO_ID,
				src: config.HIPPO_SRC
			});
		}

	}

	/*
	* @param mountConfig either an id or src (id meaning existing iframe and takes precedence)
	*/
	initHippo(mountConfig: {
		id?: string
		src?: string
	}) {
		console.log('initHippo');

		if (!mountConfig.id && !mountConfig.src) {
			console.warn('not enough hippo config provided, try init again...');
			return;
		}

		// reset
		if (this.hippoWallet.frameBus) {
			this.hippoWallet.frameBus.destroy();
			this.hippoWallet.frameBus = undefined;
		}

		if (mountConfig.id) {
			this.hippoWallet.frameBus = new FrameBus({
				id: mountConfig.id
			});
		} else if (mountConfig.src) {
			this.hippoWallet.frameBus = new FrameBus({
				src: mountConfig.src
			});
		} else {
			console.warn('cannot init hippo');
		}
	}

	/**
	 * @returns config object or `false` if no config is set
	 */
	getConfig(): AlgonautConfig | boolean {
		if (this.config) return this.config;
		return false;
	}

	/**
	 * Checks status of Algorand network
	 * @returns Promise resolving to status of Algorand network
	 */
	async checkStatus(): Promise<any | AlgonautError> {
		if (!this.getConfig()) {
			throw new Error('No node configuration set.');
		}

		const status = await this.algodClient.status().do();
		console.log('Algorand network status: %o', status);
		return status;
	}

	/**
	 * if you already have an account, set it here
	 * @param account an algosdk account already created
	 */
	setAccount(account: algosdk.Account): void | AlgonautError {
		if (!account) {
			throw new Error('No account provided.');
		}

		this.account = account;
		this.address = account.addr;
		// if (this.config) this.config.SIGNING_MODE = 'local';
		this.mnemonic = algosdk.secretKeyToMnemonic(account.sk);
	}

	/**
	 * Sets account connected via WalletConnect
	 * @param address account address
	 */
	setWalletConnectAccount(address: string): void {
		if (!address) {
			throw new Error('No address provided.');
		}

		this.account = {
			addr: address,
			sk: new Uint8Array([])
		};
		// if (this.config) this.config.SIGNING_MODE = 'walletconnect';
	}

	/**
	 * This is the same as setting the WC account
	 * @param address account address
	 */
	setHippoAccount(address: string): void {
		if (!address) throw new Error('No address provided');
		this.setWalletConnectAccount(address);
	}

	/**
	 * Creates a wallet address + mnemonic from account's secret key
	 * @returns AlgonautWallet Object containing `address` and `mnemonic`
	 */
	createWallet(): AlgonautWallet {
		this.account = algosdk.generateAccount();

		if (this.account) {
			this.address = this.account.addr;
			this.mnemonic = algosdk.secretKeyToMnemonic(this.account.sk);
			return {
				address: this.account.addr,
				mnemonic: this.mnemonic || ''
			};
		} else {
			throw new Error('There was no account: could not create algonaut wallet!');
		}

	}

	/**
	 * Recovers account from mnemonic
	 * @param mnemonic Mnemonic associated with Algonaut account
	 * @returns If mnemonic is valid, returns account. Otherwise, returns false.
	 */
	recoverAccount(mnemonic: string): algosdk.Account {
		if (!mnemonic) throw new Error('algonaut.recoverAccount: No mnemonic provided.');

		try {
			this.account = algosdk.mnemonicToSecretKey(mnemonic);
			if (algosdk.isValidAddress(this.account?.addr)) {
				//if (this.config) this.config.SIGNING_MODE = 'local';
				return this.account;
			} else {
				throw new Error('Not a valid mnemonic.');
			}
		} catch (error: any) {
			// should we throw an error here instead of returning false?
			console.log(error);
			throw new Error('Could not recover account from mnemonic.');
		}
	}

	/**
	 * General purpose method to await transaction confirmation
	 * @param txId a string id of the transacion you want to watch
	 * @param limitDelta how many rounds to wait, defaults to 50
	 * @param log set to true if you'd like to see "waiting for confirmation" log messages
	 */
	async waitForConfirmation(txId: string, limitDelta?: number, log = false): Promise<AlgonautTransactionStatus> {
		if (!txId) throw new Error('waitForConfirmation: No transaction ID provided.');

		let lastround = (await this.algodClient.status().do())['last-round'];
		const limit = lastround + (limitDelta ? limitDelta : 50);

		const returnValue = {
			status: 'fail',
			message: ''
		} as AlgonautTransactionStatus;

		while (lastround < limit) {
			let pendingInfo = '' as any;
			try {
				pendingInfo = await this.algodClient
					.pendingTransactionInformation(txId)
					.do();
				if (log) {
					console.log('waiting for confirmation');
				}
			} catch (er: any) {
				console.error(er.response?.text);
			}

			if (
				pendingInfo['confirmed-round'] !== null &&
				pendingInfo['confirmed-round'] > 0
			) {

				console.log(
					'Transaction confirmed in round ' + pendingInfo['confirmed-round']
				);

				returnValue.txId = txId;
				returnValue.status = 'success';
				returnValue.message = 'Transaction confirmed in round ' + pendingInfo['confirmed-round'];

				break;
			}

			lastround = (await this.algodClient.status().do())['last-round'];
		}

		return returnValue;

	}

	/**
	 * Creates a LogicSig from a base64 program string.  Note that this method does not COMPILE
	 * the program, just builds an LSig from an already compiled base64 result!
	 * @param base64ProgramString
	 * @returns an algosdk LogicSigAccount
	 */
	generateLogicSig(base64ProgramString: string): algosdk.LogicSigAccount {
		if (!base64ProgramString) throw new Error('No program string provided.');

		const program = new Uint8Array(
			Buffer.from(base64ProgramString, 'base64')
		);

		return new algosdk.LogicSigAccount(program);
	}

	async atomicOptInAsset(assetIndex: number): Promise<AlgonautAtomicTransaction> {
		if (!this.account) throw new Error('No account set in Algonaut.');
		if (!assetIndex) throw new Error('No asset index provided.');

		const params = await this.algodClient.getTransactionParams().do();

		const optInTransaction = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
			from: this.account.addr,
			to: this.account.addr,
			suggestedParams: params,
			assetIndex: assetIndex,
			amount: 0
		});

		return {
			transaction: optInTransaction,
			transactionSigner: this.account,
			isLogigSig: false
		};

	}

	/**
	 * Opt-in the current account for the a token or NFT Asset.
	 * @param assetIndex number of asset to opt-in to
	 * @param callbacks `AlgonautTxnCallbacks`, passed to {@link sendTransaction}
	 * @returns Promise resolving to confirmed transaction or error
	 */
	async optInAsset(assetIndex: number, callbacks?: AlgonautTxnCallbacks): Promise<AlgonautTransactionStatus> {
		if (!this.account) throw new Error('There was no account!');
		if (!assetIndex) throw new Error('No asset index provided.');
		const { transaction } = await this.atomicOptInAsset(assetIndex);
		return await this.sendTransaction(transaction, callbacks);
	}


	// this is a bit harder with the algosdk api
	// what we may want to do be more opinionated and have a standard local
	// field we always set on apps when opted in

	// OR maybe we check for HAS STATE which might check for local state
	// of any kind on that app id?

	// async isOptedIntoApp(account: string, appId: number): boolean {
	// 	let optInState = false;

	// 	const accountInfo = await this.getAccountInfo(account);
	// 	accountInfo.assets.forEach((asset: any) => {
	// 		if (asset['asset-id'] == assetId) {
	// 			optInState = true;
	// 		}

	// 	});

	// 	return optInState;
	// }


	/**
	 * You can be opted into an asset but still have a zero balance. Use this call
	 * for cases where you just need to know the address's opt-in state
	 * @param args object containing `account` and `assetId` properties
	 * @returns boolean true if account holds asset
	 */
	async isOptedIntoAsset(args: { account: string, assetId: number }): Promise<boolean> {
		if (!args.account) throw new Error('No account provided.');
		if (!args.assetId) throw new Error('No asset ID provided.');

		let optInState = false;
		const accountInfo = await this.getAccountInfo(args.account);
		accountInfo.assets.forEach((asset: any) => {
			if (asset['asset-id'] == args.assetId) {
				optInState = true;
			}

		});

		return optInState;
	}

	/**
	 * Sync function that returns a correctly-encoded argument array for
	 * an algo transaction
	 * @param args must be an any[] array, as it will often need to be
	 * a mix of strings and numbers. Valid types are: string, number, and bigint
	 * @returns a Uint8Array of encoded arguments
	 */
	encodeArguments(args: any[]): Uint8Array[] {
		const encodedArgs = [] as Uint8Array[];

		// loop through args and encode them based on type
		args.forEach((arg: any) => {
			if (typeof arg == 'number') {
				encodedArgs.push(algosdk.encodeUint64(arg));
			} else if (typeof arg == 'bigint') {
				encodedArgs.push(algosdk.encodeUint64(arg));
			} else if (typeof arg == 'string') {
				encodedArgs.push(new Uint8Array(Buffer.from(arg)));
			}
		});

		return encodedArgs;
	}

	/**
	 * Create asset transaction
	 * @param args {AlgonautCreateAssetArguments}  Must pass `assetName`, `symbol`, `decimals`, `amount`.
	 * @returns atomic txn to create asset
	*/
	async atomicCreateAsset(args: AlgonautCreateAssetArguments): Promise<AlgonautAtomicTransaction> {
		if (!args.assetName) throw new Error('args.assetName not provided.');
		if (!args.symbol) throw new Error('args.symbol not provided');
		if (!args.decimals) throw new Error('args.decimals not provided.');
		if (!args.amount) throw new Error('args.amount not provided.');
		if (!this.account) throw new Error('There was no account set in Algonaut');


		if (!args.metaBlock) {
			args.metaBlock = ' ';
		}

		if (!args.defaultFrozen) args.defaultFrozen = false;
		if (!args.assetURL) args.assetURL = undefined;

		const metaBlockLength = args.metaBlock.length;

		if (metaBlockLength > 511) {
			console.error('meta block is ' + metaBlockLength);
			throw new Error('drat! this meta block is too long!');
		}

		const enc = new TextEncoder();

		// arbitrary data: 512 bytes, ~512 characters
		const note = enc.encode(args.metaBlock);
		const addr = this.account.addr;
		const totalIssuance = args.amount;
		const manager = this.account.addr;
		const reserve = this.account.addr;
		const freeze = this.account.addr;
		const clawback = this.account.addr;

		const params = await this.algodClient.getTransactionParams().do();

		// signing and sending "txn" allows "addr" to create an asset
		const txn = algosdk.makeAssetCreateTxnWithSuggestedParams(
			addr,
			note,
			totalIssuance,
			args.decimals,
			args.defaultFrozen,
			manager,
			reserve,
			freeze,
			clawback,
			args.symbol,
			args.assetName,
			args.assetURL,
			args.assetMetadataHash,
			params
		);

		return {
			transaction: txn,
			transactionSigner: this.account,
			isLogigSig: false
		};
	}


	/**
	 * Create asset
	 * @param args AlgonautCreateAssetArguments. Must pass `assetName`, `symbol`, `decimals`, `amount`.
	 * @param callbacks AlgonautTxnCallbacks
	 * @returns asset index
	*/
	async createAsset(
		args: AlgonautCreateAssetArguments,
		callbacks?: AlgonautTxnCallbacks
	): Promise<AlgonautTransactionStatus> {
		const atomicTxn = await this.atomicCreateAsset(args);
		const txn = atomicTxn.transaction;

		try {
			const assetID = null;
			const txStatus = await this.sendTransaction(txn, callbacks);

			const ptx = await this.algodClient
				.pendingTransactionInformation(txn.txID().toString())
				.do();
			txStatus.createdIndex = ptx['asset-index'];

			return txStatus;

		} catch (er) {
			console.log('transaction error');
			console.log(er);
			throw new Error(er as any);
		}
	}

	async atomicDeleteAsset(assetId: number): Promise<AlgonautAtomicTransaction> {
		if (!this.account) throw new Error('there was no account!');
		if (!assetId) throw new Error('No assetId provided!');

		const enc = new TextEncoder();

		const transaction = algosdk.makeAssetDestroyTxnWithSuggestedParams(
			this.account.addr,
			enc.encode('doh!'),
			assetId,
			await this.algodClient.getTransactionParams().do()
		);

		return {
			transaction: transaction,
			transactionSigner: this.account,
			isLogigSig: false
		};
	}

	/**
	 * Deletes asset
	 * @param assetId Index of the ASA to delete
	 * @param callbacks optional AlgonautTxnCallbacks
	 * @returns Promise resolving to confirmed transaction or error
	 */
	async deleteAsset(assetId: number, callbacks?: AlgonautTxnCallbacks): Promise<AlgonautTransactionStatus> {
		if (!assetId) throw new Error('No asset ID provided!');
		const { transaction } = await this.atomicDeleteAsset(assetId);
		return await this.sendTransaction(transaction, callbacks);
	}

	/**
	 * Creates send asset transaction.
	 *
	 * IMPORTANT: Before you can call this, the target account has to "opt-in"
	 * to the ASA index.  You can't just send ASAs to people blind!
	 *
	 * @param args - object containing `to`, `assetIndex`, and `amount` properties
	 * @returns Promise resolving to `AlgonautAtomicTransaction`
	 */
	async atomicSendAsset(args: AlgonautSendAssetArguments): Promise<AlgonautAtomicTransaction> {
		if (!args.to) throw new Error('No to address provided');
		if (!args.assetIndex) throw new Error('No asset index provided');
		if (!args.amount) throw new Error('No amount provided');
		if (!this.account) throw new Error('there is no account!');

		const transaction =
			algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
				from: this.account.addr,
				to: args.to,
				amount: args.amount,
				assetIndex: args.assetIndex,
				suggestedParams: await this.algodClient.getTransactionParams().do()
			});

		return {
			transaction: transaction,
			transactionSigner: this.account,
			isLogigSig: false
		};
	}

	/**
	 * Sends asset to an address.
	 *
	 * IMPORTANT: Before you can call this, the target account has to "opt-in"
	 * to the ASA index.  You can't just send ASAs to people blind!
	 *
	 * @param args - object containing `to`, `assetIndex`, and `amount` properties
	 * @param callbacks optional AlgonautTxnCallbacks
	 * @returns Promise resolving to confirmed transaction or error
	 */
	async sendAsset(args: AlgonautSendAssetArguments, callbacks?: AlgonautTxnCallbacks): Promise<AlgonautTransactionStatus> {
		if (!this.account) throw new Error('There was no account!');
		const { transaction } = await this.atomicSendAsset(args);
		return await this.sendTransaction(transaction, callbacks);
	}

	/**
	 * Get info about an asset
	 * @param assetIndex
	 * @returns
	 */
	async getAssetInfo(assetIndex: number): Promise<any> {
		if (!assetIndex) throw new Error('No asset ID provided');

		const info = await this.algodClient.getAssetByID(assetIndex).do();
		return info;
	}

	/**
	 * Creates transaction to opt into an app
	 * @param args AlgonautCallAppArgs
	 * @returns AlgonautAtomicTransaction
	 */
	async atomicOptInApp(args: AlgonautCallAppArguments): Promise<AlgonautAtomicTransaction> {
		if (!args.appIndex) throw new Error('No app ID provided');
		if (!this.account) throw new Error('No account in algonaut');

		const sender = this.account.addr;
		const params = await this.algodClient.getTransactionParams().do();
		const optInTransaction = algosdk.makeApplicationOptInTxnFromObject({
			from: sender,
			appIndex: args.appIndex,
			suggestedParams: params,
			appArgs: args.appArgs ? this.encodeArguments(args.appArgs) : undefined,
			accounts: args.optionalFields?.accounts ? args.optionalFields?.accounts : undefined,
			foreignApps: args.optionalFields?.applications ? args.optionalFields?.applications : undefined,
			foreignAssets: args.optionalFields?.assets ? args.optionalFields?.assets : undefined
		});

		return {
			transaction: optInTransaction,
			transactionSigner: this.account,
			isLogigSig: false
		};
	}

	/**
	 * Opt-in the current account for an app.
	 * @param args Object containing `appIndex`, `appArgs`, and `optionalFields`
	 * @param callbacks optional AlgonautTxnCallbacks
	 * @returns Promise resolving to confirmed transaction or error
	 */
	async optInApp(args: AlgonautCallAppArguments, callbacks?: AlgonautTxnCallbacks): Promise<AlgonautTransactionStatus> {
		const { transaction } = await this.atomicOptInApp(args);
		return await this.sendTransaction(transaction, callbacks);
	}

	/**
	 * Returns atomic transaction that deletes application
	 * @param appIndex - ID of application
	 * @returns Promise resolving to atomic transaction that deletes application
	 */
	async atomicDeleteApplication(appIndex: number): Promise<AlgonautAtomicTransaction> {
		if (!this.account) throw new Error('No account set.');
		if (!appIndex) throw new Error('No app ID provided');

		const sender = this.account.addr;
		const params = await this.algodClient.getTransactionParams().do();

		//console.log('delete: ' + appIndex);

		const txn = algosdk.makeApplicationDeleteTxn(sender, params, appIndex);

		return {
			transaction: txn,
			transactionSigner: this.account,
			isLogigSig: false
		};
	}

	/**
	 * Deletes an application from the blockchain
	 * @param appIndex - ID of application
	 * @param callbacks optional AlgonautTxnCallbacks
	 * @returns Promise resolving to confirmed transaction or error
	 */
	async deleteApplication(appIndex: number, callbacks?: AlgonautTxnCallbacks): Promise<AlgonautTransactionStatus> {
		if (!this.account) throw new Error('There was no account');

		try {
			const { transaction } = await this.atomicDeleteApplication(appIndex);
			const txId = transaction.txID().toString();

			const status = await this.sendTransaction(transaction, callbacks);

			// display results
			const transactionResponse = await this.algodClient
				.pendingTransactionInformation(txId)
				.do();
			const appId = transactionResponse['txn']['txn'].apid;
			console.log('Deleted app-id: ', appId);

			return {
				status: 'success',
				message: 'deleted app index ' + appId,
				txId
			};

		} catch (e: any) {
			console.log(e);
			throw new Error(e.response?.text);
		}
	}

	async atomicCallApp(args: AlgonautCallAppArguments): Promise<AlgonautAtomicTransaction> {
		if (!this.account) throw new Error('There was no account!');
		if (!args.appIndex) throw new Error('Must provide appIndex');
		if (!args.appArgs.length) throw new Error('Must provide at least one appArgs');

		const processedArgs = this.encodeArguments(args.appArgs);
		const params = await this.algodClient.getTransactionParams().do();
		const callAppTransaction = algosdk.makeApplicationNoOpTxnFromObject({
			from: this.account.addr,
			suggestedParams: params,
			appIndex: args.appIndex,
			appArgs: processedArgs,
			accounts: args.optionalFields?.accounts || undefined,
			foreignApps: args.optionalFields?.applications || undefined,
			foreignAssets: args.optionalFields?.assets || undefined
		});

		return {
			transaction: callAppTransaction,
			transactionSigner: this.account,
			isLogigSig: false
		};
	}

	/**
	 * Call a "method" on a stateful contract.  In TEAL, you're really giving
	 * an argument which branches to a specific place and reads the other args
	 * @param args Object containing `appIndex`, `appArgs`, and `optionalFields` properties
	 */
	async callApp(args: AlgonautCallAppArguments, callbacks?: AlgonautTxnCallbacks): Promise<AlgonautTransactionStatus> {
		const { transaction } = await this.atomicCallApp(args);
		return await this.sendTransaction(transaction, callbacks);
	}

	async atomicCallAppWithLSig(args: AlgonautLsigCallAppArguments): Promise<AlgonautAtomicTransaction> {
		if (!this.account) throw new Error('There was no account!');
		if (!args.appIndex) throw new Error('Must provide appIndex');
		if (!args.appArgs.length) throw new Error('Must provide at least one appArgs');

		const processedArgs = this.encodeArguments(args.appArgs);
		const params = await this.algodClient.getTransactionParams().do();
		const callAppTransaction = algosdk.makeApplicationNoOpTxnFromObject({
			from: args.lsig.address(),
			suggestedParams: params,
			appIndex: args.appIndex,
			appArgs: processedArgs,
			accounts: args.optionalFields?.accounts || undefined,
			foreignApps: args.optionalFields?.applications || undefined,
			foreignAssets: args.optionalFields?.assets || undefined
		});

		return {
			transaction: callAppTransaction,
			transactionSigner: args.lsig,
			isLogigSig: true
		};
	}

	/**
	 * Returns an atomic transaction that closes out the user's local state in an application.
	 * The opposite of {@link atomicOptInApp}.
	 * @param args Object containing `appIndex`, `appArgs`, and `optionalFields` properties
	 * @returns Promise resolving to atomic transaction
	 */
	async atomicCloseOutApp(args: AlgonautCallAppArguments): Promise<AlgonautAtomicTransaction> {
		if (!this.account) throw new Error('There was no account!');
		if (!args.appIndex) throw new Error('Must provide appIndex');

		try {
			const params = await this.algodClient.getTransactionParams().do();
			const processedArgs = this.encodeArguments(args.appArgs);
			const closeOutTxn = algosdk.makeApplicationCloseOutTxnFromObject({
				from: this.account.addr,
				suggestedParams: params,
				appIndex: args.appIndex,
				appArgs: processedArgs,
				accounts: args.optionalFields?.accounts || undefined,
				foreignApps: args.optionalFields?.applications || undefined,
				foreignAssets: args.optionalFields?.assets || undefined
			});

			return {
				transaction: closeOutTxn,
				transactionSigner: this.account,
				isLogigSig: false
			};
		} catch (e: any) {
			throw new Error(e);
		}
	}

	/**
	 * Closes out the user's local state in an application.
	 * The opposite of {@link optInApp}.
	 * @param args Object containing `appIndex`, `appArgs`, and `optionalFields` properties
	 * @param callbacks optional AlgonautTxnCallbacks
	 * @returns Promise resolving to atomic transaction
	 */
	async closeOutApp(args: AlgonautCallAppArguments, callbacks?: AlgonautTxnCallbacks) {
		const { transaction } = await this.atomicCloseOutApp(args);
		return await this.sendTransaction(transaction, callbacks);

	}

	/**
	 * Get an application's escrow account
	 * @param appId - ID of application
	 * @returns Escrow account address as string
	 */
	getAppEscrowAccount(appId: number | bigint): string {
		if (!appId) throw new Error('No appId provided');

		return algosdk.getApplicationAddress(appId);

	}




	/**
	 * Get info about an application (globals, locals, creator address, index)
	 *
	 * @param appId - ID of application
	 * @returns Promise resolving to application state
	 */
	async getAppInfo(appId: number): Promise<AlgonautAppState> {
		if (!appId) throw new Error('No appId provided');

		const info = await this.algodClient.getApplicationByID(appId).do();

		// decode state
		const state = {
			hasState: true,
			globals: [],
			locals: [],
			creatorAddress: info.params.creator,
			index: appId
		} as AlgonautAppState;

		if (info.params['global-state']) {
			state.globals = this.decodeStateArray(info.params['global-state']);
		}

		return state;

	}

	/**
	 * Create and deploy a new Smart Contract from TEAL code
	 *
	 * @param args AlgonautDeployArguments
	 * @param callbacks optional AlgonautTxnCallbacks
	 * @returns AlgonautTransactionStatus
	 */
	async createApp(
		args: AlgonautDeployArguments,
		callbacks?: AlgonautTxnCallbacks
	): Promise<AlgonautTransactionStatus> {
		if (args.optionalFields &&
			args.optionalFields.note &&
			args.optionalFields.note.length > 1023) {
			console.warn('drat! your note is too long!');
			throw new Error('Your note is too long');
		}
		if (!this.account) throw new Error('There was no account!');
		if (!args.tealApprovalCode) throw new Error('No approval program provided');
		if (!args.tealClearCode) throw new Error('No clear program provided');
		if (!args.schema) throw new Error('No schema provided');

		try {

			const sender = this.account.addr;
			const params = await this.algodClient.getTransactionParams().do();

			let approvalProgram = new Uint8Array();
			let clearProgram = new Uint8Array();

			approvalProgram = await this.compileProgram(args.tealApprovalCode);
			clearProgram = await this.compileProgram(args.tealClearCode);

			console.log('approval', approvalProgram);
			console.log('clear', clearProgram);

			// create unsigned transaction
			if (approvalProgram && clearProgram) {

				const txn = algosdk.makeApplicationCreateTxnFromObject({
					from: sender,
					suggestedParams: params,
					onComplete: algosdk.OnApplicationComplete.NoOpOC,
					approvalProgram,
					clearProgram,
					numLocalInts: args.schema.localInts,
					numLocalByteSlices: args.schema.localBytes,
					numGlobalInts: args.schema.globalInts,
					numGlobalByteSlices: args.schema.globalBytes,
					appArgs: this.encodeArguments(args.appArgs),
					accounts: args.optionalFields?.accounts ? args.optionalFields.accounts : undefined,
					foreignApps: args.optionalFields?.applications ? args.optionalFields.applications : undefined,
					foreignAssets: args.optionalFields?.assets ? args.optionalFields.assets : undefined,
					note: args.optionalFields?.note ? new Uint8Array(Buffer.from(args.optionalFields.note, 'utf8')) : undefined
				});
				const txId = txn.txID().toString();

				// Wait for confirmation
				const result = await this.sendTransaction(txn, callbacks);
				const transactionResponse = await this.algodClient
					.pendingTransactionInformation(txId)
					.do();

				result.message = 'Created App ID: ' + transactionResponse['application-index'];
				result.createdIndex = transactionResponse['application-index'];
				result.meta = transactionResponse;
				result.txId = txId;
				return result;

			} else {
				throw new Error('could not compile teal code');
			}

		} catch (er: any) {
			throw new Error(er.message);
		}
	}

	/**
	 * Create an atomic transaction to deploy a
	 * new Smart Contract from TEAL code
	 *
	 * @param args AlgonautDeployArguments
	 * @returns AlgonautAtomicTransaction
	 */
	async atomicCreateApp(args: AlgonautDeployArguments): Promise<AlgonautAtomicTransaction> {
		if (!this.account) throw new Error('There was no account!');
		if (!args.tealApprovalCode) throw new Error('No approval program provided');
		if (!args.tealClearCode) throw new Error('No clear program provided');
		if (!args.schema) throw new Error('No schema provided');

		if (args.optionalFields && args.optionalFields.note && args.optionalFields.note.length > 1023) {
			throw new Error('Your NOTE is too long, it must be less thatn 1024 Bytes');
		} else if (this.account) {
			try {
				const sender = this.account.addr;
				const onComplete = algosdk.OnApplicationComplete.NoOpOC;
				const params = await this.algodClient.getTransactionParams().do();

				let approvalProgram = new Uint8Array();
				let clearProgram = new Uint8Array();

				approvalProgram = await this.compileProgram(args.tealApprovalCode);
				clearProgram = await this.compileProgram(args.tealClearCode);

				// create unsigned transaction
				if (!approvalProgram || !clearProgram) {
					throw new Error('Error: you must provide an approval program and a clear state program.');
				}

				const applicationCreateTransaction = algosdk.makeApplicationCreateTxn(
					sender,
					params,
					onComplete,
					approvalProgram,
					clearProgram,
					args.schema.localInts,
					args.schema.localBytes,
					args.schema.globalInts,
					args.schema.globalBytes,
					this.encodeArguments(args.appArgs),
					args.optionalFields?.accounts ? args.optionalFields.accounts : undefined,
					args.optionalFields?.applications ? args.optionalFields.applications : undefined,
					args.optionalFields?.assets ? args.optionalFields.assets : undefined,
					args.optionalFields?.note ? new Uint8Array(Buffer.from(args.optionalFields.note, 'utf8')) : undefined
				);

				return {
					transaction: applicationCreateTransaction,
					transactionSigner: this.account,
					isLogigSig: false
				};

			} catch (er: any) {
				throw new Error('There was an error creating the transaction');
			}
		} else {
			throw new Error('Algonaut.js has no account loaded!');
		}
	}


	/**
	 * deploys a contract from an lsig account
	 * keep in mind that the local and global byte and int values have caps,
	 * 16 for local and 32 for global and that the cost of deploying the
	 * app goes up based on how many of these slots you want to allocate
	 *
	 * @param args AlgonautLsigDeployArguments
	 * @returns
	 */
	async deployTealWithLSig(
		args: AlgonautLsigDeployArguments
	): Promise<AlgonautTransactionStatus> {
		if (args.noteText && args.noteText.length > 511) {
			throw new Error('Your note is too long');
		}

		if (!this.account) throw new Error('there was no account');

		let encodedArgs = [] as Uint8Array[];
		if (args.appArgs && args.appArgs.length) {
			encodedArgs = this.encodeArguments(args.appArgs);
		}

		const sender = args.lsig.address();
		const onComplete = algosdk.OnApplicationComplete.NoOpOC;
		const params = await this.algodClient.getTransactionParams().do();

		let approvalProgram = new Uint8Array();
		let clearProgram = new Uint8Array();

		try {
			approvalProgram = await this.compileProgram(args.tealApprovalCode);
			clearProgram = await this.compileProgram(args.tealClearCode);

			// create unsigned transaction
			if (approvalProgram && clearProgram) {
				const txn = algosdk.makeApplicationCreateTxn(
					sender,
					params,
					onComplete,
					approvalProgram,
					clearProgram,
					args.schema.localInts,
					args.schema.localBytes,
					args.schema.globalInts,
					args.schema.globalBytes,
					encodedArgs,
					args.optionalFields?.accounts || undefined
				);

				const txId = txn.txID().toString();
				const signedTxn = algosdk.signLogicSigTransactionObject(txn, args.lsig);

				await this.algodClient.sendRawTransaction(signedTxn.blob).do();
				const txStatus = await this.waitForConfirmation(txId);

				// TBD check txStatus

				// display results
				const transactionResponse = await this.algodClient
					.pendingTransactionInformation(txId)
					.do();
				const appId = transactionResponse['application-index'];

				return {
					status: 'success',
					message: 'created new app with id: ' + appId,
					txId
				};
			} else {
				throw new Error('Error compiling programs.');
			}
		} catch (er: any) {
			console.error('Error deploying contract:');
			throw new Error(er);
		}
	}

	/**
	 * Updates an application with `algosdk.makeApplicationUpdateTxn`
	 * @param args AlgonautUpdateAppArguments
	 * @returns atomic transaction that updates the app
	 */
	async atomicUpdateApp(args: AlgonautUpdateAppArguments): Promise<AlgonautAtomicTransaction> {
		if (!this.account) throw new Error('Algonaut.js has no account loaded!');
		if (!args.tealApprovalCode) throw new Error('No approval program provided');
		if (!args.tealClearCode) throw new Error('No clear program provided');
		if (args.optionalFields && args.optionalFields.note && args.optionalFields.note.length > 1023) {
			throw new Error('Your NOTE is too long, it must be less thatn 1024 Bytes');
		}

		try {
			const sender = this.account.addr;
			const onComplete = algosdk.OnApplicationComplete.NoOpOC;
			const params = await this.algodClient.getTransactionParams().do();

			let approvalProgram = new Uint8Array();
			let clearProgram = new Uint8Array();

			approvalProgram = await this.compileProgram(args.tealApprovalCode);
			clearProgram = await this.compileProgram(args.tealClearCode);

			// create unsigned transaction
			if (!approvalProgram || !clearProgram) {
				throw new Error('Error: you must provide an approval program and a clear state program.');
			}

			const applicationCreateTransaction = algosdk.makeApplicationUpdateTxn(
				sender,
				params,
				args.appIndex,
				approvalProgram,
				clearProgram,
				this.encodeArguments(args.appArgs),
				args.optionalFields?.accounts ? args.optionalFields.accounts : undefined,
				args.optionalFields?.applications ? args.optionalFields.applications : undefined,
				args.optionalFields?.assets ? args.optionalFields.assets : undefined,
				args.optionalFields?.note ? new Uint8Array(Buffer.from(args.optionalFields.note, 'utf8')) : undefined
			);

			return {
				transaction: applicationCreateTransaction,
				transactionSigner: this.account,
				isLogigSig: false
			};

		} catch (er: any) {
			throw new Error('There was an error creating the transaction');
		}
	}

	/**
	 * Sends an update app transaction
	 * @param args AlgonautUpdateAppArguments
	 * @param callbacks optional callbacks: `onSign`, `onSend`, `onConfirm`
	 * @returns transaction status
	 */
	async updateApp(args: AlgonautUpdateAppArguments, callbacks?: AlgonautTxnCallbacks): Promise<AlgonautTransactionStatus> {
		const { transaction } = await this.atomicUpdateApp(args);
		return await this.sendTransaction(transaction, callbacks);
	}

	/**
	 * Compiles TEAL source via [algodClient.compile](https://py-algorand-sdk.readthedocs.io/en/latest/algosdk/v2client/algod.html#algosdk.v2client.algod.AlgodClient.compile)
	 * @param programSource source to compile
	 * @returns Promise resolving to Buffer of compiled bytes
	 */
	async compileProgram(programSource: string): Promise<Uint8Array> {
		const encoder = new TextEncoder();
		const programBytes = encoder.encode(programSource);
		const compileResponse = await this.algodClient.compile(programBytes).do();
		const compiledBytes = new Uint8Array(
			Buffer.from(compileResponse.result, 'base64')
		);
		return compiledBytes;
	}

	// TODO rename atomicSendAlgo
	async atomicPayment(args: AlgonautPaymentArguments): Promise<AlgonautAtomicTransaction> {
		if (!args.amount) throw new Error('You did not specify an amount!');
		if (!args.to) throw new Error('You did not specify a to address');

		if (this.account) {
			const encodedNote = args.note ? new Uint8Array(Buffer.from(args.note, 'utf8')) : new Uint8Array();

			const transaction =
				algosdk.makePaymentTxnWithSuggestedParamsFromObject({
					from: this.account.addr,
					to: args.to,
					amount: args.amount,
					note: encodedNote,
					suggestedParams: await this.algodClient.getTransactionParams().do()
				});

			return {
				transaction: transaction,
				transactionSigner: this.account,
				isLogigSig: false
			};
		} else {
			throw new Error('there is no account!');
		}
	}

	/**
	 * Sends ALGO from own account to `args.to`
	 *
	 * @param args `AlgonautPaymentArgs` object containing `to`, `amount`, and optional `note`
	 * @param callbacks optional AlgonautTxnCallbacks
	 * @returns Promise resolving to transaction status
	 */
	async sendAlgo(args: AlgonautPaymentArguments, callbacks?: AlgonautTxnCallbacks): Promise<AlgonautTransactionStatus> {
		if (!this.account) throw new Error('there was no account!');
		const { transaction } = await this.atomicPayment(args);
		return await this.sendTransaction(transaction, callbacks);
	}

	/**
	 * Fetch full account info for an account
	 * @param address the accress to read info for
	 * @returns Promise of type AccountInfo
	 */
	async getAccountInfo(address: string): Promise<any> {
		if (!address) throw new Error('No address provided');

		//console.log//('checking algo balance');
		const accountInfo = await this.algodClient.accountInformation(address).do();
		return accountInfo;
	}


	/**
	 * Checks Algo balance of account
	 * @param address - Wallet of balance to check
	 * @returns Promise resolving to Algo balance
	 */
	async getAlgoBalance(address: string): Promise<any> {
		if (!address) throw new Error('No address provided');
		//console.log('checking algo balance');
		const accountInfo = await this.algodClient.accountInformation(address).do();
		return accountInfo.amount;
	}

	/**
	 * Checks token balance of account
	 * @param address - Wallet of balance to check
	 * @param assetIndex - the ASA index
	 * @returns Promise resolving to token balance
	 */
	async getTokenBalance(address: string, assetIndex: number): Promise<number> {
		if (!address) throw new Error('No address provided');
		if (!assetIndex) throw new Error('No asset index provided');

		const accountInfo = await this.algodClient.accountInformation(address).do();
		//console.log(accountInfo);

		let stkBalance = 0;
		//console.log(accountInfo.assets);
		accountInfo.assets.forEach((asset: any) => {
			if (asset['asset-id'] == assetIndex) {
				stkBalance = asset.amount;
			}
		});

		return stkBalance;
	}

	/**
	 * Checks if account has at least one token (before playback)
	 * Keeping this here in case this is a faster/less expensive operation than checking actual balance
	 * @param address - Address to check
	 * @param assetIndex - the index of the ASA
	 */
	async accountHasTokens(address: string, assetIndex: number): Promise<any> {
		return 'this is not done yet';
	}

	/**
	 * Gets global state for an application.
	 * @param applicationIndex - the applications index
	 * @returns {object} object representing global state
	 */
	async getAppGlobalState(applicationIndex: number): Promise<any> {
		if (!applicationIndex) throw new Error('No application ID provided');

		const info = await this.getAppInfo(applicationIndex);
		if (info.hasState) {
			return this.stateArrayToObject(info.globals);
		} else {
			return {} as any;
		}
	}



	/**
	 *
	 * @param applicationIndex the applications index
	 */
	async getAppLocalState(applicationIndex: number): Promise<AlgonautAppState> {
		if (!applicationIndex) throw new Error('No application ID provided');

		if (this.account) {
			const state = {
				hasState: false,
				globals: [],
				locals: [],
				creatorAddress: '',
				index: applicationIndex
			} as AlgonautAppState;

			// read state

			// can we detect addresses values and auto-convert them?
			// maybe a 32-byte field gets an address field added?

			const accountInfoResponse = await this.algodClient
				.accountInformation(this.account?.addr)
				.do();

			//console.log(accountInfoResponse);

			for (let i = 0; i < accountInfoResponse['apps-local-state'].length; i++) {
				if (accountInfoResponse['apps-local-state'][i].id == applicationIndex) {
					//console.log('Found Application');

					state.hasState = true;

					for (let n = 0; n < accountInfoResponse['apps-local-state'][i]['key-value'].length; n++) {

						const stateItem = accountInfoResponse['apps-local-state'][i]['key-value'][n];
						const key = Buffer.from(stateItem.key, 'base64').toString();
						const type = stateItem.value.type;
						let value = undefined as undefined | string | number;
						let valueAsAddr = '';

						if (type == 1) {
							value = Buffer.from(stateItem.value.bytes, 'base64').toString();
							valueAsAddr = algosdk.encodeAddress(Buffer.from(stateItem.value.bytes, 'base64'));

						} else if (stateItem.value.type == 2) {
							value = stateItem.value.uint;
						}

						state.locals.push({
							key: key,
							value: value || '',
							address: valueAsAddr
						});

					}
				}
			}

			return state;
		} else {
			throw new Error('there is no account');
		}
	}

	async atomicAssetTransferWithLSig(args: AlgonautLsigSendAssetArguments): Promise<AlgonautAtomicTransaction> {

		if (args.lsig) {
			const transaction =
				algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
					from: args.lsig.address(),
					to: args.to,
					amount: args.amount,
					assetIndex: args.assetIndex,
					suggestedParams: await this.algodClient.getTransactionParams().do()
				});

			return {
				transaction: transaction,
				transactionSigner: args.lsig,
				isLogigSig: true
			};
		} else {
			throw new Error('there is no logic sig object!');
		}
	}

	async atomicPaymentWithLSig(args: AlgonautLsigPaymentArguments): Promise<AlgonautAtomicTransaction> {
		if (args.lsig) {

			const transaction =
				algosdk.makePaymentTxnWithSuggestedParamsFromObject({
					from: args.lsig.address(),
					to: args.to,
					amount: args.amount,
					suggestedParams: await this.algodClient.getTransactionParams().do()
				});

			return {
				transaction: transaction,
				transactionSigner: args.lsig,
				isLogigSig: true
			};
		} else {
			throw new Error('there is no account!');
		}
	}

	/**
	 * Sends a transaction or multiple through the correct channels, depending on signing mode.
	 * If no signing mode is set, we assume local signing.
	 * @param txnOrTxns Either an array of atomic transactions or a single transaction to sign
	 * @param callbacks Optional object with callbacks - `onSign`, `onSend`, and `onConfirm`
	 * @returns Promise resolving to AlgonautTransactionStatus
	 */
	async sendTransaction(txnOrTxns: AlgonautAtomicTransaction[] | algosdk.Transaction | AlgonautAtomicTransaction, callbacks?: AlgonautTxnCallbacks): Promise<AlgonautTransactionStatus> {
		if (!this.account) throw new Error('There is no account');
		if (this.config && this.config.SIGNING_MODE && this.config.SIGNING_MODE === 'walletconnect') {

			// walletconnect must be sent as atomic transactions
			if (Array.isArray(txnOrTxns)) {
				return await this.sendWalletConnectTxns(txnOrTxns, callbacks);
			} else {
				if ((txnOrTxns as any).transaction) {
					// we were sent an AlgonautAtomicTransaction
					return await this.sendWalletConnectTxns([(txnOrTxns as AlgonautAtomicTransaction)], callbacks);
				} else {
					// we were sent an algosdk.Transaction
					return await this.sendWalletConnectTxns([{
						transaction: txnOrTxns as algosdk.Transaction,
						transactionSigner: this.account,
						isLogigSig: false
					}], callbacks);
				}
			}
		} else if (this.config && this.config.SIGNING_MODE && this.config.SIGNING_MODE === 'hippo') {
			// let's do the hippo thing

			// 1. depending on how txns are sent into `sendTransaction`, we need to deal with them
			let signedTxns;


			// HANDLE ARRAY OF TRANSACTIONS
			if (Array.isArray(txnOrTxns) && txnOrTxns[0] && txnOrTxns[0].transaction && txnOrTxns.length > 1) {
				// array of AlgonautAtomicTransaction, map these to get .transaction out
				const unwrappedTxns = txnOrTxns.map(txn => txn.transaction);

				// assign group ID
				const txnGroup = algosdk.assignGroupID(unwrappedTxns);


				
				// encode txns
				const txnsToSign = txnGroup.map(txn => {
					const encodedTxn = Buffer.from(algosdk.encodeUnsignedTransaction(txn)).toString('base64');
					return encodedTxn;
				});

				signedTxns = await this.hippoSignTxns(txnsToSign);

			// HANDLE SINGLE ATOMIC TRANSACTION
			} else {
				let txn: algosdk.Transaction;
				if (txnOrTxns && (txnOrTxns as any).transaction) {
					txn = (txnOrTxns as AlgonautAtomicTransaction).transaction;
				} else {
					txn = (txnOrTxns as algosdk.Transaction);
				}

				// send base64 to hippo
				const encodedTxn = Buffer.from(algosdk.encodeUnsignedTransaction(txn)).toString('base64');
				signedTxns = await this.hippoSignTxns([encodedTxn]);
			}

			if (callbacks?.onSign) callbacks.onSign(signedTxns);

			const tx = await this.algodClient.sendRawTransaction(signedTxns).do();

			if (callbacks?.onSend) callbacks.onSend(tx);

			// Wait for transaction to be confirmed
			const txStatus = await this.waitForConfirmation(tx.txId);

			const transactionResponse = await this.algodClient
				.pendingTransactionInformation(tx.txId)
				.do();
			txStatus.meta = transactionResponse;

			if (callbacks?.onConfirm) callbacks.onConfirm(txStatus);

			return txStatus;
		} else {
			console.log('sendTransaction: local');
			// assume local signing
			if (Array.isArray(txnOrTxns)) {
				return await this.sendAtomicTransaction(txnOrTxns, callbacks);
			} else {
				let txn: algosdk.Transaction;
				if (txnOrTxns && (txnOrTxns as any).transaction) {
					// sent an atomic Transaction
					txn = (txnOrTxns as AlgonautAtomicTransaction).transaction;
				} else {
					// assume a transaction
					txn = txnOrTxns as algosdk.Transaction;
				}

				if (!this.account || !this.account.sk) throw new Error('');
				const signedTxn = (txn as algosdk.Transaction).signTxn(this.account.sk);
				if (callbacks?.onSign) callbacks.onSign(signedTxn);

				const tx = await this.algodClient.sendRawTransaction(signedTxn).do();
				if (callbacks?.onSend) callbacks.onSend(signedTxn);

				const txId = tx.txId || tx.id || tx.txId().toString();
				console.log('Transaction ID: ' + txId);

				const txStatus = await this.waitForConfirmation(txId);
				if (callbacks?.onConfirm) callbacks.onConfirm(signedTxn);

				return txStatus;
			}
		}
	}

	/**
	 * Sends messages to Hippo via FrameBus
	 * @param data Message to send
	 * @returns Whatever Hippo gives us
	 */
	async hippoMessageAsync(data: any, options?: { showFrame: boolean }): Promise<any> {
		if (!this.hippoWallet.frameBus) {
			throw new Error('No hippo frameBus');
		}

		if (!this.hippoWallet.frameBus.ready) {
			await this.hippoWallet.frameBus.isReady();
		}

		if (options?.showFrame) this.hippoWallet.frameBus.showFrame();

		const payload = await this.hippoWallet.frameBus.emitAsync<any>(data);
		console.log('hippo payload', payload);
		return payload;
	}

	/**
	 * Sends unsigned transactions to Hippo, awaits signing, returns signed txns
	 * @param txns Array of base64 encoded transactions
	 * @returns {Uint8Array} Signed transactions
	 */
	async hippoSignTxns(txns: string[]) {
		console.log('hippoSignTxns');

		const data = {
			source: 'ncc-hippo-client',
			async: true, // tells frameBus to add to await queue + wallet to return
			type: 'sign-txns', // determines payload type
			payload: {
				txns
			},
		}

		const res = await this.hippoMessageAsync(data, { showFrame: true });

		this.hippoWallet.frameBus?.hideFrame();

		if (res.error) throw new Error(res.error);
		if (res.reject) throw new Error('Transaction request rejected');
		
		return res.signedTxns;
	}

	async hippoSetApp(appCode: string) {
		const data = {
			source: 'ncc-hippo-client',
			async: true,
			type: 'set-app',
			payload: { appCode }
		}

		return await this.hippoMessageAsync(data);
	}

	async hippoConnect(message: string): Promise<any> {
		const data = {
			source: 'ncc-hippo-client',
			async: true,
			type: 'connect',
			payload: { message }
		};

		const account = await this.hippoMessageAsync(data, { showFrame: true });
		console.log(account);
		this.setHippoAccount(account.address);
		return account;
	}

	/**
	 * run atomic takes an array of transactions to run in order, each
	 * of the atomic transaction methods needs to return an object containing
	 * the transaction and the signed transaction
	 * 	[ atomicSendASA(),
			atomicSendAlgo(),
			atomicCallApp()]
	 * @param transactions a Uint8Array of ALREADY SIGNED transactions
	 */
	async sendAtomicTransaction(transactions: AlgonautAtomicTransaction[], callbacks?: AlgonautTxnCallbacks): Promise<AlgonautTransactionStatus> {

		try {

			const txns = [] as algosdk.Transaction[];
			const signed = [] as Uint8Array[];
			transactions.forEach((txn: AlgonautAtomicTransaction) => {
				txns.push(txn.transaction);
			});

			// this is critical, if the group doesn't have an id
			// the transactions are processed as one-offs!
			const txnGroup = algosdk.assignGroupID(txns);

			// sign all transactions in the group:
			transactions.forEach((txn: AlgonautAtomicTransaction, i) => {
				let signedTx: {
					txID: string;
					blob: Uint8Array;
				};
				if (txn.isLogigSig) {
					signedTx = algosdk.signLogicSigTransaction(txnGroup[i], txn.transactionSigner as algosdk.LogicSigAccount);
				} else {
					signedTx = algosdk.signTransaction(txnGroup[i], (txn.transactionSigner as algosdk.Account).sk);
				}
				signed.push(signedTx.blob);
			});

			if (callbacks?.onSign) callbacks.onSign(signed);

			const tx = await this.algodClient.sendRawTransaction(signed).do();

			if (callbacks?.onSend) callbacks.onSend(tx);
			//console.log('Transaction : ' + tx.txId);

			// Wait for transaction to be confirmed
			const txStatus = await this.waitForConfirmation(tx.txId);
			const transactionResponse = await this.algodClient
				.pendingTransactionInformation(tx.txId)
				.do();
			txStatus.meta = transactionResponse;

			if (callbacks?.onConfirm) callbacks.onConfirm(txStatus);

			return txStatus;
		} catch (e: any) {
			console.error('Error sending atomic transaction:');
			throw new Error(e);
		}

	}

	signBase64Transactions(txns: string[]): Uint8Array[] | Uint8Array {
		let decodedTxns: algosdk.Transaction[] = [];
		txns.forEach(txn => {
			const decodedTxn = algosdk.decodeUnsignedTransaction(Buffer.from(txn, 'base64'));
			decodedTxns.push(decodedTxn);
		});
		return this.signTransactionGroup(decodedTxns);
	}

	/**
	 * Signs an array of Transactions (used in Hippo)
	 * @param txns Array of algosdk.Transaction
	 * @returns Uint8Array[] of signed transactions
	 */
	signTransactionGroup(txns: algosdk.Transaction[]): Uint8Array[] | Uint8Array {
		if (!this.account) throw new Error('There is no account!');

		// this is critical, if the group doesn't have an id
		// the transactions are processed as one-offs!
		const account = this.account;
		if (txns.length > 1) {
			console.log('signing transaction group');
			const txnGroup = algosdk.assignGroupID(txns);

			const signed = [] as Uint8Array[];

			// sign all transactions in the group
			txns.forEach((txn: algosdk.Transaction, i) => {
				let signedTx: {
					txID: string;
					blob: Uint8Array;
				};
				signedTx = algosdk.signTransaction(txnGroup[i], account.sk);
				signed.push(signedTx.blob);
			});

			return signed;
		} else {
			console.log('signing single transaction');
			console.log(txns);
			const signedTx = algosdk.signTransaction(txns[0], account.sk);
			return signedTx.blob;
		}
	}

	/**
	 * Sends one or multiple transactions via WalletConnect, prompting the user to approve transaction on their phone.
	 *
	 * @remarks
	 * Returns the results of `algodClient.pendingTransactionInformation` in `AlgonautTransactionStatus.meta`.
	 * This is used to get the `application-index` from a `atomicDeployFromTeal` function, among other things.
	 *
	 * @param walletTxns Array of transactions to send
	 * @param callbacks Transaction callbacks `{ onSign, onSend, onConfirm }`
	 * @returns Promise resolving to transaction status
	 */
	async sendWalletConnectTxns(walletTxns: AlgonautAtomicTransaction[], callbacks?: AlgonautTxnCallbacks): Promise<AlgonautTransactionStatus> {

		if (this.walletConnect.connected) {

			// start BG audio to keep socket open on mobile
			this.startReqAF();

			let txns = walletTxns.map(txn => txn.transaction);

			// this is critical, if the group doesn't have an id
			// the transactions are processed as one-offs
			if (walletTxns.length > 1) {
				//console.log('assigning group ID to transactions...');
				txns = algosdk.assignGroupID(txns);
			}

			// encode txns
			const txnsToSign = txns.map(txn => {
				const encodedTxn = Buffer.from(algosdk.encodeUnsignedTransaction(txn)).toString('base64');

				return {
					txn: encodedTxn,
					message: 'txn description',
					// Note: if the transaction does not need to be signed (because it's part of an atomic group
					// that will be signed by another party), specify an empty singers array like so:
					// signers: [],
				};
			});


			const requestParams = [txnsToSign];
			const request = formatJsonRpcRequest('algo_signTxn', requestParams);

			// this will fail if they cancel... we think
			let result: any;
			try {
				result = await this.walletConnect.connector?.sendCustomRequest(request);
			} catch (er) {
				throw new Error('You canceled the transaction');
			}

			const signedPartialTxns = result.map((r: any, i: number) => {
				// run whatever error checks here
				if (r == null) {
					throw new Error(`Transaction at index ${i}: was not signed when it should have been`);
				}
				const rawSignedTxn = Buffer.from(r, 'base64');
				return new Uint8Array(rawSignedTxn);
			});

			//console.log('signed partial txns are');
			//console.log(signedPartialTxns);
			if (callbacks?.onSign) callbacks.onSign(signedPartialTxns);

			if (signedPartialTxns) {
				let tx: any;
				try {
					tx = await this.algodClient.sendRawTransaction(signedPartialTxns).do();
				} catch (er: any) {
					tx = er;
					console.error('Error sending raw transaction');
					throw new Error(er);
				}

				//console.log('Transaction : ' + tx.txId);
				if (callbacks?.onSend) callbacks.onSend(tx);

				// Wait for transaction to be confirmed
				const txStatus = await this.waitForConfirmation(tx.txId);
				const transactionResponse = await this.algodClient
					.pendingTransactionInformation(tx.txId)
					.do();
				txStatus.meta = transactionResponse;
				if (callbacks?.onConfirm) callbacks.onConfirm(txStatus);

				this.stopReqAF(true);

				return txStatus;
			} else {
				throw new Error('there were no signed transactions returned');
			}

		} else {
			throw new Error('There is no wallet connect session');
		}
	}

	/**
	 * Interally used to determine how to sign transactions on more generic functions (e.g. {@link deployFromTeal})
	 * @returns true if we are signing transactions with WalletConnect, false otherwise
	 */
	usingWalletConnect(): boolean {
		if (this.config &&
			this.config.SIGNING_MODE &&
			this.config.SIGNING_MODE === 'walletconnect') {
			return true;
		}
		return false;
	}

	/**
	 * Interally used to determine how to sign transactions on more generic functions (e.g. {@link deployFromTeal})
	 * @returns true if we are signing transactions with hippo, false otherwise
	 */
	usingHippoWallet(): boolean {
		if (this.config &&
			this.config.SIGNING_MODE &&
			this.config.SIGNING_MODE === 'hippo') {
			return true;
		}
		return false;
	}

	/**
	 * Prepare one or more transactions for wallet connect signature
	 *
	 * @param transactions one or more atomic transaction objects
	 * @returns an array of Transactions
	 */
	async createWalletConnectTransactions(transactions: AlgonautAtomicTransaction[]): Promise<algosdk.Transaction[]> {


		//console.log('start wc transaction builder');
		const txns = [] as algosdk.Transaction[];
		transactions.forEach((txn: AlgonautAtomicTransaction) => {
			txns.push(txn.transaction);
		});

		//console.log('done', txns);

		return txns;

	}


	/**********************************************/
	/***** Below are the Algo Signer APIs *********/
	/**********************************************/

	/**
	 * Sends a transaction via AlgoSigner.
	 * @param params Transaction parameters to send
	 * @returns Promise resolving to confirmed transaction or error
	 */
	async sendTxWithAlgoSigner(params: {
		assetIndex?: string;
		from: string;
		to: string;
		amount: number;
		note?: string;
		type: string;
		LEDGER: 'TestNet' | 'MainNet'
	}): Promise<any> {
		try {
			// connect to algo signer extension
			await this.connectToAlgoSigner();

			// fetch current parameters from the al(l knowing)god
			const txParams = await window.AlgoSigner.algod({
				ledger: params.LEDGER,
				path: '/v2/transactions/params'
			});

			// sign the transaction
			const signedTx = await window.AlgoSigner.sign({
				assetIndex: params.assetIndex || null,
				from: params.from,
				to: params.to,
				amount: +params.amount,
				note: params.note || '',
				type: params.type,
				fee: txParams['min-fee'],
				firstRound: txParams['last-round'],
				lastRound: txParams['last-round'] + 1000,
				genesisID: txParams['genesis-id'],
				genesisHash: txParams['genesis-hash'],
				flatFee: true
			});

			// give us the signed transaction
			const tx = window.AlgoSigner.send({
				ledger: params.LEDGER,
				tx: signedTx.blob
			});

			// wait for confirmation, return result
			return this.waitForAlgoSignerConfirmation(tx);
		} catch (error) {
			console.log(error);
			throw new Error('Error sending transaction: ' + JSON.stringify(error));
		}
	}

	/**
	 * Waits for confirmation of a transaction
	 * @param tx Transaction to monitor
	 * @returns Promise resolving to error or confirmed transaction
	 */
	async waitForAlgoSignerConfirmation(tx: any): Promise<any> {
		console.log(`Transaction ${tx.txId} waiting for confirmation...`);
		let status = await window.AlgoSigner.algod({
			ledger: 'TestNet',
			path: '/v2/transactions/pending/' + tx.txId
		});

		// eslint-disable-next-line no-constant-condition
		while (true) {
			if (status['confirmed-round'] !== null && status['confirmed-round'] > 0) {
				//Got the completed Transaction
				console.log(
					`Transaction confirmed in round ${status['confirmed-round']}.`
				);
				break;
			}

			status = await window.AlgoSigner.algod({
				ledger: 'TestNet',
				path: '/v2/transactions/pending/' + tx.txId
			});
		}

		return tx;
	}




	/*
	* Wallet Connect API Stuff
	*/


	async disconnectAlgoWallet() {
		if (this.walletConnect.connected) {
			this.walletConnect.connector?.killSession();
		}
	}

	/**
	 * Connects to algo wallet via WalletConnect, calling {@link subscribeToEvents}.
	 * Implementation borrowed from [Algorand Docs](https://developer.algorand.org/docs/get-details/walletconnect/)
	 *
	 * @remarks
	 *
	 * There are three listeners you can use, defined by {@link WalletConnectListener}:
	 *  - `onConnect(payload: IInternalEvent)` (`payload.params[0]` contains an array of account addresses)
	 *  - `onDisconnect()`
	 *  - `onSessionUpdate(accounts: string[])`
	 *
	 * @example
	 * Usage:
	 *
	 * ```ts
	 * await algonaut.connectAlgoWallet({
	 *   onConnect: (payload) => console.log('Accounts: ' + payload.params[0]),
	 *   onDisconnect: () => console.log('Do something on disconnect'),
	 *   onSessionUpdate: (accounts) => console.log('Accounts: ' + accounts)
	 * })
	 * ```
	 *
	 * We can use the `onConnect` listener to store an address in application state, for example,
	 * which allows us to conditionally display components depending on authentication status.
	 *
	 * @param clientListener object of listener functions (see {@link WalletConnectListener})
	 */
	async connectAlgoWallet(clientListener?: WalletConnectListener): Promise<void> {
		// console.log('connectAlgoWallet');

		if (isNode()) {
			console.warn('NOTE: this lib isnt made for using wallet connect in node yet...');
			return;
		}

		// 4067ab2454244fb39835bfeafc285c8d
		if (!clientListener) clientListener = undefined;

		const bridge = 'https://bridge.walletconnect.org';


		const wcConnector = new WalletConnect({
			bridge,
			qrcodeModal: QRCodeModal
		});

		wcConnector.on('disconnect', () => {
			console.log('session update');
		});
		this.walletConnect.connector = wcConnector;

		// console.log('connector created');
		// console.log(this.walletConnect.connector);

		//console.log('trying to create session');

		// Check if connection is already established
		if (!this.walletConnect.connector.connected) {
			// create new session
			this.walletConnect.connector.createSession();
			// console.log('session created');

			// keeps some background tasks running while navigating to Pera Wallet to approve wc session link handshake
			this.startReqAF();
		}

		this.subscribeToEvents(clientListener);
	}

	/**
	 * Sets up listeners for WalletConnect events
	 * @param clientListener optional object of listener functions, to be used in an application
	 */
	subscribeToEvents(clientListener?: WalletConnectListener): void {
		if (!this.walletConnect.connector) {
			return;
		}

		this.walletConnect.connector.on('session_update', async (error: any, payload: any) => {
			console.log('connector.on("session_update")');
			if (error) {
				throw error;
			}

			const { accounts } = payload.params[0];
			if (clientListener) clientListener.onSessionUpdate(payload);
			this.onSessionUpdate(accounts);
		});

		this.walletConnect.connector.on('connect', (error: any, payload: any) => {
			console.log('connector.on("connect")');
			if (error) {
				throw error;
			}
			if (clientListener) clientListener.onConnect(payload);
			this.onConnect(payload);
		});

		this.walletConnect.connector.on('disconnect', (error: any, payload: any) => {
			console.log('connector.on("disconnect")');
			if (error) {
				console.log(payload);
				throw error;
			}
			if (clientListener) clientListener.onDisconnect(payload);
			this.onDisconnect();
		});

		if (this.walletConnect.connector.connected) {
			const { accounts } = this.walletConnect.connector;
			const address = accounts[0];

			this.walletConnect.connected = true;
			this.walletConnect.accounts = accounts;
			this.walletConnect.address = address;
			this.onSessionUpdate(accounts);
		}
	}

	/**
	 * Kills WalletConnect session and calls {@link resetApp}
	 */
	async killSession() {
		if (this.walletConnect.connector) {
			this.walletConnect.connector.killSession();
		}
		this.resetApp();
	}

	// this should get a ChainType
	async chainUpdate(newChain: any) {
		this.walletConnect.chain = newChain;
	}


	async resetApp() {
		console.log('reset app called');
		console.log('TBD!');
	}

	startReqAF() {
		// console.log('startReqAF');
		// keeps some background tasks running while navigating to Pera Wallet to approve wc session link handshake

		// TODO helpful for desktop debugging but redo isMobile check
		// if (isBrowser()) {
		if (isBrowser() && isMobile()) {
			// reqaf fix
			const keepAlive = () => {
				// console.log('keepAlive');

				const qrIsOpen = document.querySelector('#walletconnect-qrcode-modal');
				if (!qrIsOpen) {
					this.stopReqAF();
					return;
				}

				wcReqAF = requestAnimationFrame(keepAlive);
			};
			requestAnimationFrame(keepAlive);
			// wcReqAF = 1;

			// audio fix
			wcS = new Audio();
			wcS.src = waitSound; // the base64 string of the sound
			wcS.autoplay = true;
			wcS.volume = 0.6;
			wcS.loop = true;
			wcS.play();

			wcSDone = new Audio();
			wcSDone.src = finishedSound; // the base64 string of the sound
			wcSDone.volume = 0.1;
			wcSDone.play();
			wcSDone.pause();

		}
	}

	stopReqAF(playSound?: boolean) {
		// console.log('stopReqAF', wcReqAF);
		// CANCEL wcReqAF to free up CPU
		if (wcReqAF) {
			cancelAnimationFrame(wcReqAF);
			wcReqAF = 0; // reset

			// TODO make audio end gracefully + upon return to dapp
			// audio fix
			wcS.pause();

			if (playSound) {
				wcSDone.play();
			}

		} else {
			console.log('no wcReqAF to cancel'); // is this the browser?
		}
	}

	pauseWaitSound() {
		wcS.pause();
	}

	/**
	 * Function called upon connection to WalletConnect. Sets account in AlgonautJS via {@link setWalletConnectAccount}.
	 * @param payload Event payload, containing an array of account addresses
	 */
	async onConnect(payload: IInternalEvent) {
		// console.log('onConnect');

		const { accounts } = payload.params[0];
		const address = accounts[0];

		this.setWalletConnectAccount(address);

		this.walletConnect.connected = true;
		this.walletConnect.accounts = accounts;
		this.walletConnect.address = address;

		// CANCEL wcReqAF to free up CPU
		this.stopReqAF(true); // if ticking...
	}

	/**
	 * Called upon disconnection from WalletConnect.
	 */
	onDisconnect() {
		// console.log('onDisconnect');
		this.walletConnect.connected = false;
		this.walletConnect.accounts = [];
		this.walletConnect.address = '';
		this.account = undefined;

		// CANCEL wcReqAF to free up CPU
		this.stopReqAF(); // if ticking...
	}

	/**
	 * Called when WalletConnect session updates
	 * @param accounts Array of account address strings
	 */
	async onSessionUpdate(accounts: string[]) {
		// console.log('onSessionUpdate');
		this.walletConnect.address = accounts[0];
		this.walletConnect.accounts = accounts;
		this.setWalletConnectAccount(accounts[0]);
	}

	/**
	 * Helper function to turn `globals` and `locals` array into more useful objects
	 *
	 * @param stateArray State array returned from functions like {@link getAppInfo}
	 * @returns A more useful object: `{ array[0].key: array[0].value, array[1].key: array[1].value, ... }`
	 */
	stateArrayToObject(stateArray: object[]): any {
		const stateObj = {} as any;
		stateArray.forEach((value: any) => {
			if (value.key) stateObj[value.key] = value.value || null;
		});
		return stateObj;
	}

	fromBase64(encoded: string) {
		return Buffer.from(encoded, 'base64').toString();
	}

	valueAsAddr(encoded: string) {
		return algosdk.encodeAddress(Buffer.from(encoded, 'base64'));
	}

	decodeStateArray(stateArray: { key: string, value: { bytes: string, type: number, uint: number } }[]) {
		const result: any[] = [];

		for (let n = 0;
			n < stateArray.length;
			n++) {

			const stateItem = stateArray[n];

			const key = this.fromBase64(stateItem.key);
			const type = stateItem.value.type;
			let value = undefined as undefined | string | number;
			let valueAsAddr = '';

			if (type == 1) {
				value = this.fromBase64(stateItem.value.bytes);
				valueAsAddr = this.valueAsAddr(stateItem.value.bytes);

			} else if (stateItem.value.type == 2) {
				value = stateItem.value.uint;
			}

			result.push({
				key: key,
				value: value || '',
				address: valueAsAddr
			});

		}

		return result;
	}

	/* BELOW HERE ARE ALL THE ALGO SIGNER APIS IF WE GO THAT ROUTE */

	/**
	 * Function to determine if the AlgoSigner extension is installed.
	 * @returns true if `window.AlgoSigner` is defined
	 */
	isAlgoSignerInstalled(): boolean {
		return typeof window.AlgoSigner !== 'undefined';
	}

	/**
	 * Connects to AlgoSigner extension
	 */
	async connectToAlgoSigner(): Promise<any> {
		return await window.AlgoSigner.connect();
	}

	/**
	 * Async function that returns list of accounts in the wallet.
	 * @param ledger must be 'TestNet' or 'MainNet'.
	 * @returns Array of Objects with address fields: [{ address: <String> }, ...]
	 */
	async getAccounts(ledger: string): Promise<any> {
		await this.connectToAlgoSigner();
		const accounts = await window.AlgoSigner.accounts({ ledger });
		return accounts;
	}


}

export const buffer = Buffer; // sometimes this is helpful on the frontend
