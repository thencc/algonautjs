import { Buffer } from 'buffer';

import algosdk, {
	secretKeyToMnemonic,
	generateAccount,
	Account as AlgosdkAccount,
	Algodv2,
	Indexer,
	LogicSigAccount,
	makeAssetTransferTxnWithSuggestedParamsFromObject,
	makeApplicationOptInTxnFromObject,
	makeAssetCreateTxnWithSuggestedParams,
	makeAssetDestroyTxnWithSuggestedParams,
	makeApplicationDeleteTxn,
	makeApplicationNoOpTxnFromObject,
	makeApplicationCloseOutTxnFromObject,
	makeApplicationCreateTxnFromObject,
	OnApplicationComplete,
	makeApplicationCreateTxn,
	signLogicSigTransactionObject,
	makeApplicationUpdateTxn,
	encodeAddress,
	makePaymentTxnWithSuggestedParamsFromObject,
	Transaction,
	mnemonicToSecretKey,
	isValidAddress,
	encodeUint64,
	getApplicationAddress,
	microalgosToAlgos,
	decodeUnsignedTransaction,
	signMultisigTransaction
} from 'algosdk';

import type {
	AlgonautConfig,
	AlgonautWallet,
	AlgonautTransactionStatus,
	AlgonautAtomicTransaction,
	AlgonautTransactionFields,
	AlgonautAppState,
	AlgonautStateData,
	AlgonautError,
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
	AlgonautUpdateAppArguments,
	AlgonautGetApplicationResponse,
	AlgonautAppStateEncoded,
	TxnForSigning
} from './AlgonautTypes';
export * from './AlgonautTypes';
export type AlgoTxn = Transaction;

import { 
	AnyWalletState, 
	enableWallets, 
	removeAllAccounts, 
	setLogsEnabled as AWSetLogsEnabled, 
	signTransactions, 
	subscribeToAccountChanges,
	WALLET_ID,
	recallState,
	setAsActiveAccount
} from '@thencc/any-wallet';
import type {
	Account,
	ClientInitParams,
	WalletInitParamsObj
} from '@thencc/any-wallet';
export * from '@thencc/any-wallet';

import type { createClient } from '@thencc/inkey-client-js';
type InkeySdk = Awaited<ReturnType<typeof createClient>>;

import { defaultNodeConfig, mainnetConfig, testnetConfig } from './algo-config';
import { defaultLibConfig } from './constants';
import { logger } from './utils';

/*

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

*/

let unsAcctSync = null as null | (() => void);

export class Algonaut {
	algodClient!: Algodv2; // it will be set or it throws an Error
	indexerClient = undefined as undefined | Indexer;
	nodeConfig = defaultNodeConfig;
	libConfig = defaultLibConfig;
	
	// expose entire algosdk in case the dapp needs more
	sdk = algosdk;
	
	// handles all algo wallets (inkey, pera, etc) + remembers last used in localstorage
	walletState = AnyWalletState;
	inkeyClientSdk = null as null | InkeySdk;
	inkeyLoading = false;
	inkeyLoaded = false;

	account = null as null | typeof AnyWalletState.activeAccount;
	get connectedAccounts() {
		return AnyWalletState.connectedAccounts;
	}

	// TODO come back to private class fields during the security pass. + figure out how to make account immutable
	// "#account" set on aw acct listener (but private fields compile weird..? making a #private field in the type dec)
	// #account = null as null | typeof AnyWalletState.activeAccount;
	// get account() {
	// 	return this.#account;
	// }

	/**
	 * Instantiates Algonaut.js.
	 *
	 * @example
	 * Usage:
	 *
	 * ```js
	 * import { Algonaut } from '@thencc/algonautjs';
	 * const algonaut = new Algonaut({
	 * 		nodeConfig: {
	 *	 		BASE_SERVER: 'https://testnet-algorand.api.purestake.io/ps2',
	 *	 		INDEX_SERVER: 'https://testnet-algorand.api.purestake.io/idx2'
	 *	 		LEDGER: 'TestNet',
	 *	 		PORT: '',
	 *	 		API_TOKEN: { 'X-API-Key': 'YOUR_API_TOKEN' }
	 * 		}
	 * });
	 * ```
	 *
	 * @param config config object
	 */
	constructor(config?: AlgonautConfig) {
		this.setNodeConfig(config?.nodeConfig); // makes algod client too
		this.enableWallets(config?.initWallets);
		this.setLibConfig(config?.libConfig);
		this.initAcctSync();
	}

	setLibConfig(libConfig?: AlgonautConfig['libConfig']) {
		// logger.log('setLibConfig', libConfig);
		if (libConfig == undefined)  {
			libConfig = defaultLibConfig;
		}
		if (libConfig !== undefined) {
			if ('disableLogs' in libConfig && typeof libConfig.disableLogs == 'boolean') {
				logger.enabled = !libConfig.disableLogs;
				AWSetLogsEnabled(!libConfig.disableLogs);
			}
		}
	}

	/**
	 * checks if config obj is valid for use
	 * @param config algonaut config for network + signing mode
	 * @returns boolean. true is good.
	 */
	isValidNodeConfig(nodeConfig?: AlgonautConfig['nodeConfig']): boolean {
		// logger.log('isValidNodeConfig?', config);
		let isValid = true;

		// do all checks
		if (nodeConfig == undefined || !nodeConfig.BASE_SERVER) {
			isValid = false;
		}
		// FYI some configs dont need an api token

		// TODO add more checks...

		return isValid;
	}

	/**
	 * sets config for use (new algod, indexerClient, etc)
	 * @param config algonaut config for network + signing mode
	 * 		- will throw Error if config is lousy
	 */
	setNodeConfig(nodeConfig?: AlgonautConfig['nodeConfig'] | 'mainnet' | 'testnet') {
		logger.log('setNodeConfig', nodeConfig);
		
		if (nodeConfig == undefined) {
			nodeConfig = defaultNodeConfig;
		}

		if (typeof nodeConfig == 'string') {
			if (nodeConfig == 'mainnet') {
				nodeConfig = mainnetConfig;
			} else if (nodeConfig == 'testnet') {
				nodeConfig = testnetConfig;
			} else {
				throw new Error('bad node config string.');
			}
		}

		if (!this.isValidNodeConfig(nodeConfig)) {
			throw new Error('bad node config!');
		}
		if (typeof nodeConfig == 'undefined') {
			throw new Error('node config undefined'); // shouldnt ever happen... but needed to TS to be happy
		}

		this.nodeConfig = nodeConfig;
		this.algodClient = new Algodv2(nodeConfig.API_TOKEN, nodeConfig.BASE_SERVER, nodeConfig.PORT);

		if (nodeConfig.INDEX_SERVER) {
			this.indexerClient = new Indexer(nodeConfig.API_TOKEN, nodeConfig.INDEX_SERVER, nodeConfig.PORT);
		} else {
			console.warn('No indexer configured because INDEX_SERVER was not provided.');
		}
	}

	/**
	 * @returns nodeConfig object or `false` if no nodeConfig is set
	 */
	getNodeConfig(): AlgonautConfig['nodeConfig'] | boolean {
		if (this.nodeConfig) return this.nodeConfig;
		return false;
	}

	/**
	 * Checks status of Algorand network
	 * @returns Promise resolving to status of Algorand network
	 */
	async checkStatus(): Promise<any | AlgonautError> {
		if (!this.getNodeConfig()) {
			throw new Error('No node configuration set.');
		}

		const status = await this.algodClient.status().do();
		logger.log('Algorand network status: %o', status);
		return status;
	}

	initAcctSync() {
		unsAcctSync = subscribeToAccountChanges(
			(acct) => {
				logger.log('acct changed', acct);
				this.account = acct;
				// this.#account = acct; // revisit this for security pass + consider field setting not just entire obj
			}
		);
	}
	stopAcctSync() {
		if (unsAcctSync) unsAcctSync();
	}

	// direct map from any-wallet for ease
	setActiveAccount = setAsActiveAccount;

	enableWallets(walletInitParams?: AlgonautConfig['initWallets']) {
		if (walletInitParams == undefined) {
			logger.debug('.enableWallets called without any init params.');
		}
		// default to NONE
		const defaultWip: WalletInitParamsObj = {
			// inkey: true, // not even inkey
		};
		const wip = walletInitParams || defaultWip;
		enableWallets(wip); // defaults to all except mnemonic client
	}

	/**
	 * @deprecated use .connect() with mnemonic arg
	 * Recovers account from mnemonic
	 *  (helpful for rapid development but overall very insecure unless on server-side)
	 * @param mnemonic Mnemonic associated with Algonaut account
	 * @returns If mnemonic is valid, it returns the account (address, chain). Otherwise, throws an error.
	 */
	async mnemonicConnect(mnemonic: string): Promise<Account[]> {
		if (!mnemonic) throw new Error('algonaut.mnemonicConnect: No mnemonic provided.');
		return await this.connect({
			mnemonic
		});
	}

	/**
	 * @deprecated use .connect or loop through enabled wallets' methods
	 */
	async inkeyConnect(): Promise<Account[]> {
		console.warn('.inkeyConnect is deprecated. please use .connect');
		return await this.connect({
			inkey: true // "true" means use the defaults
		});
	}

	/**
	 * @deprecated use .disconnect or loop through enabled wallets' methods
	 */
	async inkeyDisconnect() {
		console.warn('.inkeyDisconnect is deprecated. please use .disconnect');
		return await this.disconnect([WALLET_ID.INKEY]);
	}

	/**
	 * Shows the inkey-wallet modal 
	 * @returns 
	 */
	async inkeyShow(route?: string) {
		const ic = await this.getInkeyClientSdk();
		ic.show(route);
	}

	/**
	 * Hides the inkey-wallet modal
	 * @returns 
	 */
	async inkeyHide() {
		const ic = await this.getInkeyClientSdk();
		ic.hide();
	}

	/**
	 * Loads and/or returns the inkey-wallet client sdk for whatever use. see inkey-client-js docs for more.
	 * @returns 
	 */
	async getInkeyClientSdk() {
		logger.log('getInkeyClientSdk');
		if (this.inkeyClientSdk !== null) {
			this.inkeyLoaded = true;
			return this.inkeyClientSdk;
		} else {
			// load it
			let inkeyW = this.walletState.enabledWallets?.inkey;
			if (!inkeyW) {
				console.warn('Inkey wallet not enabled by dev');
				throw new Error('Inkey wallet not enabled by dev');
			}

			this.inkeyLoading = true;
			await inkeyW.loadClient();
			this.inkeyLoading = false;

			// @ts-ignore
			const inkeyClientSdk:InkeySdk = inkeyW.client!.sdk;

			if (inkeyClientSdk.frameBus.ready == false) {
				logger.debug('inkeySdk FrameBus not yet ready...');
				await inkeyClientSdk.frameBus.isReady();
				logger.debug('inkeySdk FrameBus IS ready.');
			}

			this.inkeyLoaded = true;
			this.inkeyClientSdk = inkeyClientSdk;
			return this.inkeyClientSdk;
		}
	}

	/**
	 * Connects a wallet to be used as algonaut.account. uses:
	 * 	- the SINGLE passed in init params for the specified wallet
	 *  - or, the SINGLE enabled wallet IF 1 wallet is enabled (as is the default. just inkey)
	 * FAILs and throws when multiple init params are passed in or multiple wallets are enabled when nothing is passed in (since it doesnt know which to connect up)
	 */
	async connect(initWallets?: WalletInitParamsObj) {
		// logger.log('connect initWallets', initWallets);
		if (initWallets !== undefined) {
			const initWs = Object.entries(initWallets);
			if (initWs.length == 1) {
				const wId = initWs[0][0] as WALLET_ID;				
				const wInitParams = initWs[0][1] as ClientInitParams; // grab the only enabled wallet
				const w = AnyWalletState.allWallets[wId];
				logger.debug('connect: ', wId, wInitParams)

				if (w !== undefined) {
					// possibly enable this wallet 
					if (AnyWalletState.enabledWallets == null || 
						!(AnyWalletState.enabledWallets[wId])
					) {
						// AnyWalletState.enabledWallets[wId] = w; // same same as below
						enableWallets(initWallets);
					}

					// FYI ignore the .isConnected check (as in below init using singular enabledWallet) 
					// to allow for authing into multiple accounts of 1 wallet type

					w.initParams = wInitParams;
					return await w.connect();
				} else {
					throw new Error('Could not find wallet to enable');
				}
			} else {
				throw new Error('Cannot init multiple wallets at once using .connect(). To enable multiple wallets at once define initWallets params in Algonaut class instantiation.');
			}
		} else {
			// then assume to use the only enabled wallet (must be only 1)
			if (AnyWalletState.enabledWallets) {
				const enabledWs = Object.entries(AnyWalletState.enabledWallets);
				if (enabledWs.length == 1) {
					const w = enabledWs[0][1]; // grab the only enabled wallet
					if (w) {
						// FYI DONT check isConnected or isActive to allow for inited multiple accts from the same wallet provider
						return await w.connect();
					} else {
						throw new Error('Wallet wasnt initialized correctly.');
					}
				} else {
					throw new Error('Too many wallets enabled to know which to connect.');
				}
			} else {
				throw new Error('No enabled wallets to connect.');
			}
		}
	}

	/**
	 * disconnects
	 * 	- the active wallet IF no arg passed in
	 * 	- all the wallets IF "true" is passed in as an arg
	 * 	- or, specific wallets if an array of wallet ids is passed in. (ex: ["inkey", "algosigner", "mnemonic"] )
	 */
	async disconnect(wIds?: WALLET_ID[] | true) {
		if (typeof wIds == undefined) {
			// (try) disconnect active wallet only
			if (AnyWalletState.enabledWallets) {
				const enabledWs = Object.entries(AnyWalletState.enabledWallets);
				if (enabledWs.length == 1) {
					const w = enabledWs[0][1]; // grab the only enabled wallet
					if (w) {
						if (w.isConnected) {
							logger.log('disconnecting active wallet:', w.id);
							return await w.disconnect();
						} else {
							throw new Error('Wallet already disconnected.');
						}
					} else {
						throw new Error('Wallet wasnt initialized correctly.');
					}
				} else {
					throw new Error('Too many wallets enabled to know which to connect.');
				}
			} else {
				throw new Error('No enabled wallets to disconnect.');
			}
		} else if (typeof wIds == 'boolean') {
			if (wIds == true) {
				// disconnect ALL wallets
				logger.log('disconnecting all wallets from dapp');
				for (let wId of Object.keys(AnyWalletState.allWallets)) {
					const w = AnyWalletState.allWallets[wId as WALLET_ID];
					if (w) {
						if (w.isConnected) {
							logger.log('disconnecting wallet:', wId);
							return await w.disconnect();
						} else {
							throw new Error('Wallet already disconnected.');
						}
					} else {
						throw new Error('Could not find wallet by id to disconnect... (shouldnt happen)');
					}
				}
			} else {
				// nothing
				// for wIds == false
			}
		} else if (Array.isArray(wIds)) {
			// disconnect this/these wallets by wallet id
			logger.log('disconnecting these wallets:', wIds);
			for (let wId of wIds) {
				const w = AnyWalletState.allWallets[wId];
				if (w) {
					if (w.isConnected) {
						logger.log('disconnecting wallet:', wId);
						return await w.disconnect();
					} else {
						throw new Error('Wallet already disconnected.');
					}
				} else {
					throw new Error('Could not find wallet by id to disconnect... (shouldnt happen)');
				}
			}
		} else {
			logger.debug('this shouldnt happen... passed in a bad arg to .disconnect() ');
		}
	}

	disconnectAll() {
		removeAllAccounts();
	}

	reconnect() {
		recallState();
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
					logger.log('waiting for confirmation');
				}
			} catch (er: any) {
				console.error(er.response?.text);
			}

			if (
				pendingInfo['confirmed-round'] !== null &&
				pendingInfo['confirmed-round'] > 0
			) {

				if (log) {
					logger.log('Transaction confirmed in round ' + pendingInfo['confirmed-round']);
				}

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
	generateLogicSig(base64ProgramString: string): LogicSigAccount {
		if (!base64ProgramString) throw new Error('No program string provided.');

		const program = new Uint8Array(
			Buffer.from(base64ProgramString, 'base64')
		);

		return new LogicSigAccount(program);
	}

	async atomicOptInAsset(assetIndex: number, optionalTxnArgs?: AlgonautTransactionFields): Promise<AlgonautAtomicTransaction> {
		if (!this.walletState.activeAddress) throw new Error('No account set in Algonaut.');
		if (!assetIndex) throw new Error('No asset index provided.');

		const suggestedParams = optionalTxnArgs?.suggestedParams || (await this.algodClient.getTransactionParams().do());

		const optInTransaction = makeAssetTransferTxnWithSuggestedParamsFromObject({
			from: this.walletState.activeAddress,
			to: this.walletState.activeAddress,
			assetIndex: assetIndex,
			amount: 0,
			suggestedParams,
		});

		return {
			transaction: optInTransaction,
			transactionSigner: undefined,
			isLogigSig: false
		};
	}

	/**
	 * Opt-in the current account for the a token or NFT Asset.
	 * @param assetIndex number of asset to opt-in to
	 * @param callbacks `AlgonautTxnCallbacks`, passed to {@link sendTransaction}
	 * @returns Promise resolving to confirmed transaction or error
	 */
	async optInAsset(assetIndex: number, callbacks?: AlgonautTxnCallbacks, optionalTxnArgs?: AlgonautTransactionFields): Promise<AlgonautTransactionStatus> {
		if (!this.walletState.activeAddress) throw new Error('There was no account!');
		if (!assetIndex) throw new Error('No asset index provided.');
		const { transaction } = await this.atomicOptInAsset(assetIndex, optionalTxnArgs);
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
				encodedArgs.push(encodeUint64(arg));
			} else if (typeof arg == 'bigint') {
				encodedArgs.push(encodeUint64(arg));
			} else if (typeof arg == 'string') {
				encodedArgs.push(new Uint8Array(Buffer.from(arg)));
			}
		});

		return encodedArgs;
	}

	/**
	 * Create asset transaction
	 * @param args : AlgonautCreateAssetArguments obj must contain: `assetName`, `symbol`, `decimals`, `amount`.
	 * @returns atomic txn to create asset
	*/
	async atomicCreateAsset(args: AlgonautCreateAssetArguments): Promise<AlgonautAtomicTransaction> {
		if (!args.assetName) throw new Error('args.assetName not provided.');
		if (!args.symbol) throw new Error('args.symbol not provided');
		if (typeof args.decimals == 'undefined') throw new Error('args.decimals not provided.');
		if (!args.amount) throw new Error('args.amount not provided.');
		const fromAddr = args.from || this.walletState.activeAddress;
		if (!fromAddr) throw new Error('there is no fromAddr');

		if (!args.metaBlock) {
			args.metaBlock = ' ';
		}

		if (!args.defaultFrozen) args.defaultFrozen = false;
		if (!args.assetURL) args.assetURL = undefined;

		const metaBlockLength = args.metaBlock.length;

		if (metaBlockLength > 1023) {
			console.error('meta block is ' + metaBlockLength);
			throw new Error('drat! this meta block is too long!');
		}

		const enc = new TextEncoder();

		// arbitrary data: 1024 bytes, or about 1023 characters
		const note = enc.encode(args.metaBlock);
		const totalIssuance = args.amount;

		// set accounts
		const manager = (args.manager && args.manager.length > 0) ? args.manager : fromAddr;
		const reserve = (args.reserve && args.reserve.length > 0) ? args.reserve : fromAddr;
		const freeze = (args.freeze && args.freeze.length > 0) ? args.freeze : fromAddr;
		const clawback = (args.clawback && args.clawback.length > 0) ? args.clawback : fromAddr;

		const suggestedParams = args.optionalFields?.suggestedParams || (await this.algodClient.getTransactionParams().do());

		// signing and sending "txn" allows "addr" to create an asset
		const txn = makeAssetCreateTxnWithSuggestedParams(
			fromAddr,
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
			suggestedParams
		);

		return {
			transaction: txn,
			transactionSigner: undefined,
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
			logger.log('transaction error');
			logger.log(er);
			throw new Error(er as any);
		}
	}

	async atomicDeleteAsset(assetId: number, optionalTxnArgs?: AlgonautTransactionFields): Promise<AlgonautAtomicTransaction> {
		if (!this.walletState.activeAddress) throw new Error('there was no account!');
		if (!assetId) throw new Error('No assetId provided!');

		const enc = new TextEncoder();
		const suggestedParams = optionalTxnArgs?.suggestedParams || (await this.algodClient.getTransactionParams().do());

		const transaction = makeAssetDestroyTxnWithSuggestedParams(
			this.walletState.activeAddress,
			enc.encode('doh!'), // what is this?
			assetId,
			suggestedParams,
		);

		return {
			transaction: transaction,
			transactionSigner: undefined,
			isLogigSig: false
		};
	}

	/**
	 * Deletes asset
	 * @param assetId Index of the ASA to delete
	 * @param callbacks optional AlgonautTxnCallbacks
	 * @returns Promise resolving to confirmed transaction or error
	 */
	async deleteAsset(assetId: number, callbacks?: AlgonautTxnCallbacks, optionalTxnArgs?: AlgonautTransactionFields): Promise<AlgonautTransactionStatus> {
		if (!assetId) throw new Error('No asset ID provided!');
		const { transaction } = await this.atomicDeleteAsset(assetId, optionalTxnArgs);
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
		if (!isValidAddress(args.to)) throw new Error('Invalid to address');
		if (!args.assetIndex) throw new Error('No asset index provided');
		if (!(typeof args.amount == 'bigint' || typeof args.amount == 'number')) {
			throw new Error('Amount has to be a number.');
		}
		const fromAddr = args.from || this.walletState.activeAddress;
		if (!fromAddr) throw new Error('there is no fromAddr');

		const suggestedParams = args.optionalFields?.suggestedParams || (await this.algodClient.getTransactionParams().do());

		const transaction =
			makeAssetTransferTxnWithSuggestedParamsFromObject({
				from: fromAddr,
				to: args.to,
				amount: args.amount,
				assetIndex: args.assetIndex,
				suggestedParams
			});

		return {
			transaction: transaction,
			transactionSigner: undefined,
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
		const fromAddr = args.from || this.walletState.activeAddress;
		if (!fromAddr) throw new Error('there is no fromAddr');
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
		const fromAddr = this.walletState.activeAddress;
		if (!fromAddr) throw new Error('there is no fromAddr');
		const suggestedParams = args.optionalFields?.suggestedParams || (await this.algodClient.getTransactionParams().do());

		const optInTransaction = makeApplicationOptInTxnFromObject({
			from: fromAddr,
			appIndex: args.appIndex,
			suggestedParams,
			appArgs: args.appArgs ? this.encodeArguments(args.appArgs) : undefined,
			accounts: args.optionalFields?.accounts ? args.optionalFields?.accounts : undefined,
			foreignApps: args.optionalFields?.applications ? args.optionalFields?.applications : undefined,
			foreignAssets: args.optionalFields?.assets ? args.optionalFields?.assets : undefined
		});

		return {
			transaction: optInTransaction,
			transactionSigner: undefined,
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
	async atomicDeleteApp(appIndex: number, optionalTxnArgs?: AlgonautTransactionFields): Promise<AlgonautAtomicTransaction> {
		if (!appIndex) throw new Error('No app ID provided');
		const fromAddr = this.walletState.activeAddress;
		if (!fromAddr) throw new Error('there is no fromAddr');

		const suggestedParams = optionalTxnArgs?.suggestedParams || (await this.algodClient.getTransactionParams().do());
		const txn = makeApplicationDeleteTxn(fromAddr, suggestedParams, appIndex);

		return {
			transaction: txn,
			transactionSigner: undefined,
			isLogigSig: false
		};
	}

	/**
	 * Deletes an application from the blockchain
	 * @param appIndex - ID of application
	 * @param callbacks optional AlgonautTxnCallbacks
	 * @returns Promise resolving to confirmed transaction or error
	 */
	async deleteApp(appIndex: number, callbacks?: AlgonautTxnCallbacks, optionalTxnArgs?: AlgonautTransactionFields): Promise<AlgonautTransactionStatus> {
		try {
			const { transaction } = await this.atomicDeleteApp(appIndex, optionalTxnArgs);
			const txId = transaction.txID().toString();

			const status = await this.sendTransaction(transaction, callbacks);

			// display results
			const transactionResponse = await this.algodClient
				.pendingTransactionInformation(txId)
				.do();
			const appId = transactionResponse['txn']['txn'].apid;

			return {
				status: 'success',
				message: 'deleted app index ' + appId,
				txId
			};

		} catch (e: any) {
			logger.log(e);
			throw new Error(e.response?.text);
		}
	}

	async atomicCallApp(args: AlgonautCallAppArguments): Promise<AlgonautAtomicTransaction> {
		const fromAddr = args?.from || this.walletState.activeAddress;
		if (!fromAddr) throw new Error('there is no fromAddr');
		if (!args.appIndex) throw new Error('Must provide appIndex');
		if (!args.appArgs.length) throw new Error('Must provide at least one appArgs');

		const processedArgs = this.encodeArguments(args.appArgs);
		const suggestedParams = args.optionalFields?.suggestedParams || (await this.algodClient.getTransactionParams().do());
		const callAppTransaction = makeApplicationNoOpTxnFromObject({
			from: fromAddr,
			suggestedParams,
			appIndex: args.appIndex,
			appArgs: processedArgs,
			accounts: args.optionalFields?.accounts || undefined,
			foreignApps: args.optionalFields?.applications || undefined,
			foreignAssets: args.optionalFields?.assets || undefined,
			note: args.optionalFields?.note ? this.toUint8Array(args.optionalFields.note) : undefined
		});

		return {
			transaction: callAppTransaction,
			transactionSigner: undefined,
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
		if (!args.appIndex) throw new Error('Must provide appIndex');
		if (!args.appArgs.length) throw new Error('Must provide at least one appArgs');

		const processedArgs = this.encodeArguments(args.appArgs);
		const suggestedParams = args.optionalFields?.suggestedParams || (await this.algodClient.getTransactionParams().do());
		const callAppTransaction = makeApplicationNoOpTxnFromObject({
			from: args.lsig.address(),
			suggestedParams,
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
		const fromAddr = args?.from || this.walletState.activeAddress;
		if (!fromAddr) throw new Error('there is no fromAddr');
		if (!args.appIndex) throw new Error('Must provide appIndex');

		try {
			const suggestedParams = args.optionalFields?.suggestedParams || (await this.algodClient.getTransactionParams().do());
			const processedArgs = this.encodeArguments(args.appArgs);
			const closeOutTxn = makeApplicationCloseOutTxnFromObject({
				from: fromAddr,
				suggestedParams,
				appIndex: args.appIndex,
				appArgs: processedArgs,
				accounts: args.optionalFields?.accounts || undefined,
				foreignApps: args.optionalFields?.applications || undefined,
				foreignAssets: args.optionalFields?.assets || undefined
			});

			return {
				transaction: closeOutTxn,
				transactionSigner: undefined,
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
		return getApplicationAddress(appId);
	}

	/**
	 * Get info about an application (globals, locals, creator address, index)
	 *
	 * @param appId - ID of application
	 * @returns Promise resolving to application state
	 */
	async getAppInfo(appId: number): Promise<AlgonautAppState> {
		if (!appId) throw new Error('No appId provided');

		const proms = [
			this.algodClient.getApplicationByID(appId).do(),
		] as Promise<any>[];

		const addr = this.walletState.activeAddress;
		// get locals if we have an account
		if (addr) {
			proms.push(this.getAppLocalState(appId)); // TODO get rid of this call / only return locals (not incorrect duplicate state obj)
		}

		const promsRes = await Promise.all(proms);
		const info = promsRes[0] as AlgonautGetApplicationResponse;
		const localState = promsRes[1] as AlgonautAppState | void;

		// decode state
		const state = {
			hasState: true,
			globals: [],
			locals: localState?.locals || [],
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
		const fromAddr = this.walletState.activeAddress;
		if (!fromAddr) throw new Error('there is no fromAddr');
		if (!args.tealApprovalCode) throw new Error('No approval program provided');
		if (!args.tealClearCode) throw new Error('No clear program provided');
		if (!args.schema) throw new Error('No schema provided');

		try {
			const suggestedParams = args.optionalFields?.suggestedParams || (await this.algodClient.getTransactionParams().do());

			let approvalProgram = new Uint8Array();
			let clearProgram = new Uint8Array();

			approvalProgram = await this.compileProgram(args.tealApprovalCode);
			clearProgram = await this.compileProgram(args.tealClearCode);
			// logger.log('approval', approvalProgram);
			// logger.log('clear', clearProgram);

			// create unsigned transaction
			if (approvalProgram && clearProgram) {

				const txn = makeApplicationCreateTxnFromObject({
					from: fromAddr,
					suggestedParams,
					onComplete: OnApplicationComplete.NoOpOC,
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
					note: args.optionalFields?.note ? this.toUint8Array(args.optionalFields.note) : undefined
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
		const fromAddr = this.walletState.activeAddress;
		if (!fromAddr) throw new Error('there is no fromAddr');
		if (!args.tealApprovalCode) throw new Error('No approval program provided');
		if (!args.tealClearCode) throw new Error('No clear program provided');
		if (!args.schema) throw new Error('No schema provided');

		if (args.optionalFields && args.optionalFields.note && args.optionalFields.note.length > 1023) {
			throw new Error('Your NOTE is too long, it must be less thatn 1024 Bytes');
		} else if (fromAddr) {
			try {
				const onComplete = OnApplicationComplete.NoOpOC;
				const suggestedParams = args.optionalFields?.suggestedParams || (await this.algodClient.getTransactionParams().do());

				let approvalProgram = new Uint8Array();
				let clearProgram = new Uint8Array();

				approvalProgram = await this.compileProgram(args.tealApprovalCode);
				clearProgram = await this.compileProgram(args.tealClearCode);

				// create unsigned transaction
				if (!approvalProgram || !clearProgram) {
					throw new Error('Error: you must provide an approval program and a clear state program.');
				}

				const applicationCreateTransaction = makeApplicationCreateTxn(
					fromAddr,
					suggestedParams,
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
					args.optionalFields?.note ? this.toUint8Array(args.optionalFields.note) : undefined
				);

				return {
					transaction: applicationCreateTransaction,
					transactionSigner: undefined,
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

		let encodedArgs = [] as Uint8Array[];
		if (args.appArgs && args.appArgs.length) {
			encodedArgs = this.encodeArguments(args.appArgs);
		}

		const sender = args.lsig.address();
		const onComplete = OnApplicationComplete.NoOpOC;
		const suggestedParams = args.optionalFields?.suggestedParams || (await this.algodClient.getTransactionParams().do());

		let approvalProgram = new Uint8Array();
		let clearProgram = new Uint8Array();

		try {
			approvalProgram = await this.compileProgram(args.tealApprovalCode);
			clearProgram = await this.compileProgram(args.tealClearCode);

			// create unsigned transaction
			if (approvalProgram && clearProgram) {
				const txn = makeApplicationCreateTxn(
					sender,
					suggestedParams,
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
				const signedTxn = signLogicSigTransactionObject(txn, args.lsig);

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
	 * Updates an application with `makeApplicationUpdateTxn`
	 * @param args AlgonautUpdateAppArguments
	 * @returns atomic transaction that updates the app
	 */
	async atomicUpdateApp(args: AlgonautUpdateAppArguments): Promise<AlgonautAtomicTransaction> {
		const fromAddr = this.walletState.activeAddress;
		if (!fromAddr) throw new Error('there is no fromAddr');
		if (!args.tealApprovalCode) throw new Error('No approval program provided');
		if (!args.tealClearCode) throw new Error('No clear program provided');
		if (args.optionalFields && args.optionalFields.note && args.optionalFields.note.length > 1023) {
			throw new Error('Your NOTE is too long, it must be less thatn 1024 Bytes');
		}

		try {
			const onComplete = OnApplicationComplete.NoOpOC;
			const suggestedParams = args.optionalFields?.suggestedParams || (await this.algodClient.getTransactionParams().do());

			let approvalProgram = new Uint8Array();
			let clearProgram = new Uint8Array();

			approvalProgram = await this.compileProgram(args.tealApprovalCode);
			clearProgram = await this.compileProgram(args.tealClearCode);

			// create unsigned transaction
			if (!approvalProgram || !clearProgram) {
				throw new Error('Error: you must provide an approval program and a clear state program.');
			}

			const applicationCreateTransaction = makeApplicationUpdateTxn(
				fromAddr,
				suggestedParams,
				args.appIndex,
				approvalProgram,
				clearProgram,
				this.encodeArguments(args.appArgs),
				args.optionalFields?.accounts ? args.optionalFields.accounts : undefined,
				args.optionalFields?.applications ? args.optionalFields.applications : undefined,
				args.optionalFields?.assets ? args.optionalFields.assets : undefined,
				args.optionalFields?.note ? this.toUint8Array(args.optionalFields.note) : undefined
			);

			return {
				transaction: applicationCreateTransaction,
				transactionSigner: undefined,
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
	 * Compiles TEAL source via [algodClient.compile](https://py-algorand-sdk.readthedocs.io/en/latest/algosdk/v2client/algod.html#v2client.algod.AlgodClient.compile)
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

	async atomicSendAlgo(args: AlgonautPaymentArguments): Promise<AlgonautAtomicTransaction> {
		if (!(typeof args.amount == 'bigint' || typeof args.amount == 'number')) {
			throw new Error('Amount has to be a number.');
		}
		if (!args.to) throw new Error('You did not specify a to address');
		if (!isValidAddress(args.to)) throw new Error('Invalid to address');
		const fromAddr = args.from || this.walletState.activeAddress;
		if (!fromAddr) throw new Error('there is no fromAddr');

		if (fromAddr) {
			const encodedNote = args.optionalFields?.note ? this.toUint8Array(args.optionalFields.note) : new Uint8Array();
			const suggestedParams = args.optionalFields?.suggestedParams || (await this.algodClient.getTransactionParams().do());

			const transaction =
				makePaymentTxnWithSuggestedParamsFromObject({
					from: fromAddr,
					to: args.to,
					amount: args.amount,
					note: encodedNote,
					suggestedParams
				});

			return {
				transaction: transaction,
				transactionSigner: undefined,
				isLogigSig: false
			};
		} else {
			throw new Error('there is no fromAddr');
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
		const { transaction } = await this.atomicSendAlgo(args);
		return await this.sendTransaction(transaction, callbacks);
	}

	/**
	 * Fetch full account info for an account
	 * @param address the accress to read info for
	 * @returns Promise of type AccountInfo
	 */
	async getAccountInfo(address: string): Promise<any> {
		if (!address) throw new Error('No address provided');
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
		//logger.log('checking algo balance');
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
		//logger.log('accountInfo', accountInfo);

		let bal = 0;
		accountInfo.assets.forEach((asset: any) => {
			if (asset['asset-id'] == assetIndex) {
				bal = asset.amount;
			}
		});

		return bal;
	}

	/**
	 * Checks if account has at least one token (before playback)
	 * Keeping this here in case this is a faster/less expensive operation than checking actual balance
	 * @param address - Address to check
	 * @param assetIndex - the index of the ASA
	 */
	async accountHasTokens(address: string, assetIndex: number): Promise<boolean> {
		let bal = await this.getTokenBalance(address, assetIndex);
		if (bal > 0) {
			return true;
		} else {
			return false;
		}
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
	 * Gets account local state for an app. Defaults to AnyWallets.activeAddress unless
	 * an address is provided.
	 * @param applicationIndex the applications index
	 */
	async getAppLocalState(applicationIndex: number, address?: string): Promise<AlgonautAppState | void> {
		if (!applicationIndex) throw new Error('No application ID provided');

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

		if (this.walletState.activeAddress && !address) {
			address = this.walletState.activeAddress;
		}

		if (address) {
			const accountInfoResponse = await this.algodClient
				.accountInformation(address)
				.do();

			//logger.log(accountInfoResponse);

			for (let i = 0; i < accountInfoResponse['apps-local-state'].length; i++) {
				if (accountInfoResponse['apps-local-state'][i].id == applicationIndex) {
					//logger.log('Found Application');

					state.hasState = true;

					for (let n = 0; n < accountInfoResponse['apps-local-state'][i]['key-value'].length; n++) {

						const stateItem = accountInfoResponse['apps-local-state'][i]['key-value'][n];
						const key = Buffer.from(stateItem.key, 'base64').toString();
						const type = stateItem.value.type;
						let value = undefined as undefined | string | number;
						let valueAsAddr = '';

						if (type == 1) {
							value = Buffer.from(stateItem.value.bytes, 'base64').toString();
							valueAsAddr = encodeAddress(Buffer.from(stateItem.value.bytes, 'base64'));

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
			// throw new Error('No address provided, and no account set.');
			console.warn('Algonaut used in non-authd state, not getting local vars');
		}
	}

	async atomicAssetTransferWithLSig(args: AlgonautLsigSendAssetArguments): Promise<AlgonautAtomicTransaction> {
		if (args.lsig) {
			const suggestedParams = args.optionalFields?.suggestedParams || (await this.algodClient.getTransactionParams().do());

			const transaction =
				makeAssetTransferTxnWithSuggestedParamsFromObject({
					from: args.lsig.address(),
					to: args.to,
					amount: args.amount,
					assetIndex: args.assetIndex,
					suggestedParams
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
			const suggestedParams = args.optionalFields?.suggestedParams || (await this.algodClient.getTransactionParams().do());
			const transaction =
				makePaymentTxnWithSuggestedParamsFromObject({
					from: args.lsig.address(),
					to: args.to,
					amount: args.amount,
					suggestedParams
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

	normalizeTxns(txnOrTxns: Transaction | AlgonautAtomicTransaction | AlgonautAtomicTransaction[]) {
		logger.log('normalizeTxns', txnOrTxns);

		let txnArr: (AlgonautAtomicTransaction | Transaction)[] = [];

		if (!Array.isArray(txnOrTxns)) {
			txnArr = [txnOrTxns];
		} else {
			txnArr = txnOrTxns;
		}
		// logger.log('txnArr', txnArr);

		let algoTxnArr: Transaction[] = [];
		algoTxnArr = txnArr.map((t) => {
			let nativeT = (t as AlgonautAtomicTransaction).transaction as Transaction | undefined;
			if (nativeT == undefined) {
				nativeT = t as Transaction;
			}
			return nativeT;
		});
		logger.log('algoTxnArr', [...algoTxnArr]);

		// assign txn(s) a group id
		if (algoTxnArr.length > 1) {
			algoTxnArr = algosdk.assignGroupID(algoTxnArr);
			logger.log('added group id to txn array');
			if (algoTxnArr[0].group) {
				let gId = this.txnBuffToB64(algoTxnArr[0].group);
				logger.log('gId', gId);
			}
		}

		const txnBuffArr = algoTxnArr.map(t => t.toByte());
		logger.log('txnBuffArr', txnBuffArr);

		return txnBuffArr;
	}

	/**
	 * Signs a transaction or multiple w the correct wallet according to AW (does not send / submit txn(s) to network)
	 * @param txnOrTxns Either an array of atomic transactions or a single transaction to sign
	 * @param signedTxns array of 
	 * @returns Promise resolving to AlgonautTransactionStatus
	 */
	async signTransaction(txnOrTxns: AlgonautAtomicTransaction[] | Transaction | AlgonautAtomicTransaction): Promise<Uint8Array[]> {
		const awTxnsToSign = this.normalizeTxns(txnOrTxns);
		logger.log('awTxnsToSign', awTxnsToSign);
		let awTxnsSigned: Uint8Array[];
		try {
			awTxnsSigned = await signTransactions(awTxnsToSign);
			logger.log('awTxnsSigned', awTxnsSigned);
		} catch(e) {
			console.warn('err signing txns...');
			logger.log(e);
			throw new Error('Error signing transactions');
		}
		return awTxnsSigned;
	}

	/**
	 * Sends a transaction or multiple w the correct wallet according to AW
	 * @param txnOrTxns Either an array of atomic transactions or a single transaction to sign
	 * @param callbacks Optional object with callbacks - `onSign`, `onSend`, and `onConfirm`
	 * @returns Promise resolving to AlgonautTransactionStatus
	 */
	async sendTransaction(txnOrTxns: AlgonautAtomicTransaction[] | Transaction | AlgonautAtomicTransaction, callbacks?: AlgonautTxnCallbacks): Promise<AlgonautTransactionStatus> {
		/**
		 * 1. normalize incoming txn(s) to array of Uint8Arrs
		 * 2. sign w AW
		 * 3. send Raw txn arr
		 * 4. return result + txid
		 */

		const awTxnsSigned = await this.signTransaction(txnOrTxns);

		if (callbacks?.onSign) callbacks.onSign(awTxnsSigned);

		const tx = await this.algodClient.sendRawTransaction(awTxnsSigned).do();

		if (callbacks?.onSend) callbacks.onSend(tx);

		// Wait for transaction to be confirmed
		const txStatus = await this.waitForConfirmation(tx.txId);

		const transactionResponse = await this.algodClient
			.pendingTransactionInformation(tx.txId)
			.do();
		txStatus.meta = transactionResponse;

		if (callbacks?.onConfirm) callbacks.onConfirm(txStatus);
		return txStatus;
	}

	/**
	 * 
	 * @param str string
	 * @param enc the encoding type of the string (defaults to utf8)
	 * @returns string encoded as Uint8Array
	 */
	toUint8Array(str: string, enc: BufferEncoding = 'utf8'): Uint8Array {
		return new Uint8Array(Buffer.from(str, enc));
	}

	/**
	 * @deprecated use toUint8Array instead.
	 * @param str string
	 * @param enc the encoding type of the string (defaults to utf8)
	 * @returns string encoded as Uint8Array
	 */
	to8Arr(str: string, enc: BufferEncoding = 'utf8'): Uint8Array {
		return this.toUint8Array(str, enc);
	}

	/**
	 * Helper function to turn `globals` and `locals` array into more useful objects
	 *
	 * @param stateArray State array returned from functions like {@link getAppInfo}
	 * @returns A more useful object: `{ array[0].key: array[0].value, array[1].key: array[1].value, ... }`
	 * TODO add correct typing for this method
	 */
	stateArrayToObject(stateArray: object[]): any {
		const stateObj = {} as any;
		stateArray.forEach((value: any) => {
			if (value.key) stateObj[value.key] = value.value || null;
		});
		return stateObj;
	}

	/**
	 * Used for decoding state
	 * @param encoded Base64 string
	 * @returns Human-readable string
	 */
	b64StrToHumanStr(encoded: string): string {
		return Buffer.from(encoded, 'base64').toString();
	}

	/**
	 * @deprecated Use b64StrToHumanStr instead
	 * @param encoded Base64 string
	 * @returns Human-readable string
	 */
	fromBase64(encoded: string): string {
		return this.b64StrToHumanStr(encoded);
	}

	/**
	 * Decodes a Base64-encoded Uint8 Algorand address and returns a string
	 * @param encoded An encoded Algorand address
	 * @returns Decoded address
	 */
	valueAsAddr(encoded: string): string {
		return encodeAddress(Buffer.from(encoded, 'base64'));
	}

	/**
	 * Decodes app state into a human-readable format
	 * @param stateArray Encoded app state
	 * @returns Array of objects with key, value, and address properties
	 */
	decodeStateArray(stateArray: AlgonautAppStateEncoded[]) {
		const result: AlgonautStateData[] = [];

		for (let n = 0;
			n < stateArray.length;
			n++) {

			const stateItem = stateArray[n];

			const key = this.b64StrToHumanStr(stateItem.key);
			const type = stateItem.value.type;
			let value = undefined as undefined | string | number;
			let valueAsAddr = '';

			if (type == 1) {
				value = this.b64StrToHumanStr(stateItem.value.bytes);
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

	/**
	 * Does what it says on the tin.
	 * @param txn base64-encoded unsigned transaction
	 * @returns transaction object
	 */
	decodeBase64UnsignedTransaction(txn: string): Transaction {
		return decodeUnsignedTransaction(Buffer.from(txn, 'base64'));
	}

	/**
	 * Describes an Algorand transaction, for display in Inkey
	 * @param txn Transaction to describe
	 */
	txnSummary(txn: Transaction) {
		// for reference: https://developer.algorand.org/docs/get-details/transactions/transactions/

		if (txn.type) {
			const to = txn.to ? encodeAddress(txn.to.publicKey) : '';
			const from = txn.from ? encodeAddress(txn.from.publicKey) : '';

			// sending algo
			if (txn.type === 'pay') {
				if (txn.amount) {
					return `Send ${microalgosToAlgos(txn.amount as number)} ALGO to ${to}`;
				} else {
					return `Send 0 ALGO to ${to}`;
				}

				// sending assets
			} else if (txn.type === 'axfer') {
				if (!txn.amount && to === from) {
					return `Opt-in to asset ID ${txn.assetIndex}`;
				} else {
					const amount = txn.amount ? txn.amount : 0;
					return `Transfer ${amount} of asset ID ${txn.assetIndex} to ${to}`;
				}

				// asset config
				// this could be creating, destroying, or configuring an asset,
				// depending on which fields are set
			} else if (txn.type === 'acfg') {

				// if unit name is supplied, we are creating
				if (txn.assetUnitName) {
					return `Create asset ${txn.assetName}, symbol ${txn.assetUnitName}`;
				}

				return `Configure asset ${txn.assetIndex}`;

				// asset freeze
			} else if (txn.type === 'afrz') {
				return `Freeze asset ${txn.assetIndex}`;

				// application call
			} else if (txn.type === 'appl') {
				// let's find out what kind of application call this is
				// reference: https://developer.algorand.org/docs/get-details/dapps/avm/teal/specification/#oncomplete
				switch (txn.appOnComplete) {
					// NoOp
					case 0:
						return `Call to application ID ${txn.appIndex}`;

					// OptIn
					case 1:
						return `Opt-in to application ID ${txn.appIndex}`;

					// CloseOut
					case 2:
						return `Close out application ID ${txn.appIndex}`;

					// ClearState
					case 3:
						return `Execute clear state program of application ID ${txn.appIndex}`;

					// Update
					case 4:
						return `Update application ID ${txn.appIndex}`;

					// Delete
					case 5:
						return `Delete application ID ${txn.appIndex}`;

					default:
						return `Call to application ID ${txn.appIndex}`;
				}

				// default case
			} else {
				return `Transaction of type ${txn.type} to ${to}`;
			}
		} else {
			// no better option
			return txn.toString();
		}
	}

	/**
	 * Creates a wallet address + mnemonic from account's secret key.
	 * Changed in 0.3: this does NOT set algonaut.account.
	 * @returns AlgonautWallet Object containing `address` and `mnemonic`
	 */
	createWallet(): AlgonautWallet {
		const account = generateAccount();

		if (account) {
			const mnemonic = secretKeyToMnemonic(account.sk);
			return {
				address: account.addr,
				mnemonic: mnemonic,
			};
		} else {
			throw new Error('There was no account: could not create algonaut wallet!');
		}
	}

	/**
	 * Recovers account from mnemonic
	 * Changed in 0.3: this does NOT set algonaut.account.
	 * @param mnemonic Mnemonic associated with Algonaut account
	 * @returns If mnemonic is valid, returns algosdk account (.addr, .sk). Otherwise, throws an error.
	 */
	recoverAccount(mnemonic: string): AlgosdkAccount {
		if (!mnemonic) throw new Error('No mnemonic provided.');

		try {
			const account = mnemonicToSecretKey(mnemonic);
			if (isValidAddress(account?.addr)) {
				return account;
			} else {
				throw new Error('Not a valid mnemonic.');
			}
		} catch (error: any) {
			// should we throw an error here instead of returning false?
			console.error(error);
			throw new Error('Could not recover account from mnemonic.');
		}
	}

	/**
	 * txn(b64) -> txnBuff (buffer)
	 * @param txn base64-encoded unsigned transaction
	 * @returns trransaction as buffer object
	 */
	txnB64ToTxnBuff(txn: string): Buffer {
		return Buffer.from(txn, 'base64');
	}

	/**
	 * Converts between buff -> b64 (txns)
	 * @param buff likely a algorand txn as a Uint8Array buffer
	 * @returns string (like for inkey / base64 transmit use)
	 */
	txnBuffToB64(buff: Uint8Array): string {
		return Buffer.from(buff).toString('base64');
	}

	/**
	 * Does what it says on the tin.
	 * @param txn algorand txn object
	 * @returns string (like for inkey / base64 transmit use)
	 */
	txnToStr(txn: algosdk.Transaction): string {
		const buff = txn.toByte();
		return this.txnBuffToB64(buff);
	}

}
export default Algonaut;

export const buffer = Buffer; // sometimes this is helpful on the frontend
