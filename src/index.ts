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
	encodeUnsignedTransaction,
	assignGroupID,
	signLogicSigTransaction,
	signTransaction,
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

import { AnyWalletState, enableWallets, signTransactions, WalletInitParamsObj } from '@thencc/web3-wallet-handler';
export * from '@thencc/web3-wallet-handler';

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

*/

// TODO use a default node config
// import { mainNetConfig as config } from './algoconfig';


export class Algonaut {
	algodClient!: Algodv2; // it will be set or it throws an Error
	indexerClient = undefined as undefined | Indexer;
	config = undefined as undefined | AlgonautConfig; // current config

	// TODO remove this entire sdk?
	// expose entire algosdk in case the dapp needs more
	sdk = algosdk;

	// FYI undefined if using wallet-connect, etc. perhaps rename to .accountLocal ?
	// TODO remove this.account. CAN use defaultAcct = AW.activeAddress
	account = undefined as undefined | AlgosdkAccount; // ONLY defined if using local signing, not wallet-connet or inkey
	address = undefined as undefined | string;
	mnemonic = undefined as undefined | string;

	uiLoading = false;

	// handles all algo wallets (inkey, pera, etc) + remembers last used in localstorage
	AnyWalletState = AnyWalletState;

	/**
	 * Instantiates Algonaut.js.
	 *
	 * @example
	 * Usage:
	 *
	 * ```js
	 * import Algonaut from '@thencc/algonautjs';
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
		this.setNodeConfig(config);
		this.initAnyWallet(config);
	}

	initAnyWallet(config?: AlgonautConfig) {
		console.log('initAnyWallet', config);
		const defaultWip: WalletInitParamsObj = {
			inkey: true
		};
		const wip = config?.anyWalletConfig?.walletInitParams || defaultWip;
		enableWallets(wip); // defaults to all except mnemonic client
	}

	/**
	 * checks if config obj is valid for use
	 * @param config algonaut config for network + signing mode
	 * @returns boolean. true is good.
	 */
	isValidNodeConfig(config: AlgonautConfig): boolean {
		// console.log('isValidNodeConfig?', config);
		let isValid = true;

		// do all checks
		if (!config.BASE_SERVER || !config.API_TOKEN) {
			isValid = false;
		}

		// TODO add more checks...


		// check: if its not a valid signing mode...
		// if (config.SIGNING_MODE !== 'algosigner')

		return isValid;
	}

	/**
	 * sets config for use (new algod, indexerClient, etc)
	 * @param config algonaut config for network + signing mode
	 * 		- will throw Error if config is lousy
	 */
	setNodeConfig(config: AlgonautConfig) {
		// console.log('setNodeConfig', config);
		if (!this.isValidNodeConfig(config)) {
			throw new Error('bad config!');
		}

		this.config = config;
		this.algodClient = new Algodv2(config.API_TOKEN, config.BASE_SERVER, config.PORT);

		if (config.INDEX_SERVER) {
			this.indexerClient = new Indexer(config.API_TOKEN, config.INDEX_SERVER, config.PORT);
		} else {
			console.warn('No indexer configured because INDEX_SERVER was not provided.');
		}
	}

	/**
	 * @returns config object or `false` if no config is set
	 */
	getNodeConfig(): AlgonautConfig | boolean {
		if (this.config) return this.config;
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
		console.log('Algorand network status: %o', status);
		return status;
	}

	// TODO remove this.account and setAccount, use AW
	/**
	 * if you already have an account, set it here
	 * @param account an algosdk account already created
	 */
	setAccount(account: AlgosdkAccount): void | AlgonautError {
		if (!account) {
			throw new Error('No account provided.');
		}

		this.account = account;
		this.address = account.addr;
		// if (this.config) this.config.SIGNING_MODE = 'local';
		this.mnemonic = secretKeyToMnemonic(account.sk);
	}

	/**
	 * Creates a wallet address + mnemonic from account's secret key and sets the wallet as the currently authenticated account
	 * @returns AlgonautWallet Object containing `address` and `mnemonic`
	 */
	createWallet(): AlgonautWallet {
		this.account = generateAccount();

		if (this.account) {
			this.address = this.account.addr;
			this.mnemonic = secretKeyToMnemonic(this.account.sk);
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
	 * @returns If mnemonic is valid, returns account. Otherwise, throws an error.
	 */
	recoverAccount(mnemonic: string): AlgosdkAccount {
		if (!mnemonic) throw new Error('algonaut.recoverAccount: No mnemonic provided.');
		this.account = utils.recoverAccount(mnemonic);
		return this.account;
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

				if (log) {
					console.log('Transaction confirmed in round ' + pendingInfo['confirmed-round']);
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
		return utils.generateLogicSig(base64ProgramString);
	}

	async atomicOptInAsset(assetIndex: number, optionalTxnArgs?: AlgonautTransactionFields): Promise<AlgonautAtomicTransaction> {
		if (!this.account) throw new Error('No account set in Algonaut.');
		if (!assetIndex) throw new Error('No asset index provided.');

		const suggestedParams = optionalTxnArgs?.suggestedParams || (await this.algodClient.getTransactionParams().do());

		const optInTransaction = makeAssetTransferTxnWithSuggestedParamsFromObject({
			from: this.account.addr,
			to: this.account.addr,
			assetIndex: assetIndex,
			amount: 0,
			suggestedParams,
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
	async optInAsset(assetIndex: number, callbacks?: AlgonautTxnCallbacks, optionalTxnArgs?: AlgonautTransactionFields): Promise<AlgonautTransactionStatus> {
		if (!this.account) throw new Error('There was no account!');
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
		return utils.encodeArguments(args);
	}

	/**
	 * Create asset transaction
	 * @param args { AlgonautCreateAssetArguments }  Must pass `assetName`, `symbol`, `decimals`, `amount`.
	 * @returns atomic txn to create asset
	*/
	async atomicCreateAsset(args: AlgonautCreateAssetArguments): Promise<AlgonautAtomicTransaction> {
		if (!args.assetName) throw new Error('args.assetName not provided.');
		if (!args.symbol) throw new Error('args.symbol not provided');
		if (typeof args.decimals == 'undefined') throw new Error('args.decimals not provided.');
		if (!args.amount) throw new Error('args.amount not provided.');
		if (!this.account) throw new Error('There was no account set in Algonaut');


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
		const addr = this.account.addr;
		const totalIssuance = args.amount;

		// set accounts
		const manager = (args.manager && args.manager.length > 0) ? args.manager : this.account.addr;
		const reserve = (args.reserve && args.reserve.length > 0) ? args.reserve : this.account.addr;
		const freeze = (args.freeze && args.freeze.length > 0) ? args.freeze : this.account.addr;
		const clawback = (args.clawback && args.clawback.length > 0) ? args.clawback : this.account.addr;

		const suggestedParams = args.optionalFields?.suggestedParams || (await this.algodClient.getTransactionParams().do());

		// signing and sending "txn" allows "addr" to create an asset
		const txn = makeAssetCreateTxnWithSuggestedParams(
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
			suggestedParams
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

	async atomicDeleteAsset(assetId: number, optionalTxnArgs?: AlgonautTransactionFields): Promise<AlgonautAtomicTransaction> {
		if (!this.account) throw new Error('there was no account!');
		if (!assetId) throw new Error('No assetId provided!');

		const enc = new TextEncoder();
		const suggestedParams = optionalTxnArgs?.suggestedParams || (await this.algodClient.getTransactionParams().do());

		const transaction = makeAssetDestroyTxnWithSuggestedParams(
			this.account.addr,
			enc.encode('doh!'), // what is this? TODO support note...
			assetId,
			suggestedParams,
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
		if (!args.assetIndex) throw new Error('No asset index provided');
		if (!args.amount) throw new Error('No amount provided');
		// if (!this.account) throw new Error('there is no account!');

		const fromAddr = args.from || this.account?.addr;
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
		const suggestedParams = args.optionalFields?.suggestedParams || (await this.algodClient.getTransactionParams().do());

		const optInTransaction = makeApplicationOptInTxnFromObject({
			from: sender,
			appIndex: args.appIndex,
			suggestedParams,
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
	async atomicDeleteApp(appIndex: number, optionalTxnArgs?: AlgonautTransactionFields): Promise<AlgonautAtomicTransaction> {
		if (!this.account) throw new Error('No account set.');
		if (!appIndex) throw new Error('No app ID provided');

		const sender = this.account.addr;
		const suggestedParams = optionalTxnArgs?.suggestedParams || (await this.algodClient.getTransactionParams().do());
		const txn = makeApplicationDeleteTxn(sender, suggestedParams, appIndex);

		return {
			transaction: txn,
			transactionSigner: this.account,
			isLogigSig: false
		};
	}

	/**
	 * DEPRECATED! Use `atomicDeleteApp` instead. Returns atomic transaction that deletes application
	 * @deprecated
	 * @param appIndex - ID of application
	 * @returns Promise resolving to atomic transaction that deletes application
	 */
	async atomicDeleteApplication(appIndex: number, optionalTxnArgs?: AlgonautTransactionFields): Promise<AlgonautAtomicTransaction> {
		console.warn('atomicDeleteApplication is deprecated and will be removed in future versions.');
		return await this.atomicDeleteApp(appIndex, optionalTxnArgs);
	}

	/**
	 * Deletes an application from the blockchain
	 * @param appIndex - ID of application
	 * @param callbacks optional AlgonautTxnCallbacks
	 * @returns Promise resolving to confirmed transaction or error
	 */
	async deleteApp(appIndex: number, callbacks?: AlgonautTxnCallbacks, optionalTxnArgs?: AlgonautTransactionFields): Promise<AlgonautTransactionStatus> {
		if (!this.account) throw new Error('There was no account');

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
			console.log(e);
			throw new Error(e.response?.text);
		}
	}

	/**
	 * DEPRECATED! Use `deleteApp` instead. This will be removed in future versions.
	 * @deprecated
	 * @param appIndex - ID of application
	 * @param callbacks optional AlgonautTxnCallbacks
	 * @returns Promise resolving to confirmed transaction or error
	 */
	async deleteApplication(appIndex: number, callbacks?: AlgonautTxnCallbacks, optionalTxnArgs?: AlgonautTransactionFields): Promise<AlgonautTransactionStatus> {
		console.warn('deleteApplication is deprecated and will be removed in future versions.');
		return await this.deleteApp(appIndex, callbacks, optionalTxnArgs);
	}

	async atomicCallApp(args: AlgonautCallAppArguments): Promise<AlgonautAtomicTransaction> {
		if (!this.account) throw new Error('There was no account!');
		if (!args.appIndex) throw new Error('Must provide appIndex');
		if (!args.appArgs.length) throw new Error('Must provide at least one appArgs');

		const processedArgs = this.encodeArguments(args.appArgs);
		const suggestedParams = args.optionalFields?.suggestedParams || (await this.algodClient.getTransactionParams().do());
		const callAppTransaction = makeApplicationNoOpTxnFromObject({
			from: this.account.addr,
			suggestedParams,
			appIndex: args.appIndex,
			appArgs: processedArgs,
			accounts: args.optionalFields?.accounts || undefined,
			foreignApps: args.optionalFields?.applications || undefined,
			foreignAssets: args.optionalFields?.assets || undefined,
			note: args.optionalFields?.note ? this.to8Arr(args.optionalFields.note) : undefined
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
		if (!this.account) throw new Error('There was no account!');
		if (!args.appIndex) throw new Error('Must provide appIndex');

		try {
			const suggestedParams = args.optionalFields?.suggestedParams || (await this.algodClient.getTransactionParams().do());
			const processedArgs = this.encodeArguments(args.appArgs);
			const closeOutTxn = makeApplicationCloseOutTxnFromObject({
				from: this.account.addr,
				suggestedParams,
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
		return utils.getAppEscrowAccount(appId);
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
		] as any;

		// get locals if we have an account
		if (this.account) {
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
		if (!this.account) throw new Error('There was no account!');
		if (!args.tealApprovalCode) throw new Error('No approval program provided');
		if (!args.tealClearCode) throw new Error('No clear program provided');
		if (!args.schema) throw new Error('No schema provided');

		//console.log('CREATING APP')

		try {

			const sender = this.account.addr;
			const suggestedParams = args.optionalFields?.suggestedParams || (await this.algodClient.getTransactionParams().do());

			let approvalProgram = new Uint8Array();
			let clearProgram = new Uint8Array();

			approvalProgram = await this.compileProgram(args.tealApprovalCode);
			clearProgram = await this.compileProgram(args.tealClearCode);

			// console.log('approval', approvalProgram);
			// console.log('clear', clearProgram);

			// create unsigned transaction
			if (approvalProgram && clearProgram) {

				const txn = makeApplicationCreateTxnFromObject({
					from: sender,
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
					note: args.optionalFields?.note ? this.to8Arr(args.optionalFields.note) : undefined
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
					sender,
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
					args.optionalFields?.note ? this.to8Arr(args.optionalFields.note) : undefined
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
		if (!this.account) throw new Error('Algonaut.js has no account loaded!');
		if (!args.tealApprovalCode) throw new Error('No approval program provided');
		if (!args.tealClearCode) throw new Error('No clear program provided');
		if (args.optionalFields && args.optionalFields.note && args.optionalFields.note.length > 1023) {
			throw new Error('Your NOTE is too long, it must be less thatn 1024 Bytes');
		}

		try {
			const sender = this.account.addr;
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
				sender,
				suggestedParams,
				args.appIndex,
				approvalProgram,
				clearProgram,
				this.encodeArguments(args.appArgs),
				args.optionalFields?.accounts ? args.optionalFields.accounts : undefined,
				args.optionalFields?.applications ? args.optionalFields.applications : undefined,
				args.optionalFields?.assets ? args.optionalFields.assets : undefined,
				args.optionalFields?.note ? this.to8Arr(args.optionalFields.note) : undefined
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
		if (!args.amount) throw new Error('You did not specify an amount!');
		if (!args.to) throw new Error('You did not specify a to address');

		const fromAddr = args.from || this.account?.addr;

		if (fromAddr) {
			const encodedNote = args.optionalFields?.note ? this.to8Arr(args.optionalFields.note) : new Uint8Array();
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
				transactionSigner: this.account,
				isLogigSig: false
			};
		} else {
			throw new Error('there is no fromAddr');
		}
	}

	/**
	 * DEPRECATED. Use `atomicSendAlgo`. This name will be removed in future versions.
	 * @deprecated
	 * @param args `AlgonautPaymentArgs` object containing `to`, `amount`, and optional `note`
	 * @param callbacks optional AlgonautTxnCallbacks
	 * @returns Promise resolving to atomic trasnaction
	 */
	async atomicPayment(args: AlgonautPaymentArguments): Promise<AlgonautAtomicTransaction> {
		console.warn('atomicPayment is deprecated and will be removed in future versions.');
		return await this.atomicSendAlgo(args);
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
	 * Gets account local state for an app. Defaults to `this.account` unless
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

		if (this.account && this.account.addr && !address) {
			address = this.account.addr;
		}

		if (address) {
			const accountInfoResponse = await this.algodClient
				.accountInformation(address)
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
		console.log('normalizeTxns', txnOrTxns);

		let txnArr: (AlgonautAtomicTransaction | Transaction)[] = [];

		if (!Array.isArray(txnOrTxns)) {
			txnArr = [txnOrTxns];
		} else {
			txnArr = txnOrTxns;
		}
		// console.log('txnArr', txnArr);

		let algoTxnArr: Transaction[] = [];
		algoTxnArr = txnArr.map((t) => {
			let nativeT = (t as AlgonautAtomicTransaction).transaction as Transaction | undefined;
			if (nativeT == undefined) {
				nativeT = t as Transaction;
			}
			return nativeT;
		});
		// console.log('algoTxnArr', algoTxnArr);
		const txnBuffArr = algoTxnArr.map(t => t.toByte());
		// console.log('txnBuffArr', txnBuffArr);

		return txnBuffArr;
	}

	/**
	 * Sends a transaction or multiple through the correct channels, depending on signing mode.
	 * If no signing mode is set, we assume local signing.
	 * @param txnOrTxns Either an array of atomic transactions or a single transaction to sign
	 * @param callbacks Optional object with callbacks - `onSign`, `onSend`, and `onConfirm`
	 * @returns Promise resolving to AlgonautTransactionStatus
	 */
	async sendTransaction(txnOrTxns: AlgonautAtomicTransaction[] | Transaction | AlgonautAtomicTransaction, callbacks?: AlgonautTxnCallbacks): Promise<AlgonautTransactionStatus> {
		// if (!AnyWalletState.activeAddress) throw new Error('No AnyWallet acct connected');

		// TODO use "AnyWalletState.activeAddress" as default .from addr

		/**
		 * 1. normalize incoming txn(s) to array of Uint8Arrs
		 * 2. sign w aw
		 * 3. send Raw
		 * 4. return result + txid
		 */

		const awTxnsToSign = this.normalizeTxns(txnOrTxns);
		console.log('awTxnsToSign', awTxnsToSign);
		let awTxnsSigned: Uint8Array[];
		try {
			awTxnsSigned = await signTransactions(awTxnsToSign);
			console.log('awTxnsSigned', awTxnsSigned);
		} catch(e) {
			console.warn('err signing txns...');
			console.log(e);
			return {
				status: 'rejected',
				message: 'User rejected the message.',
				txId: ''
			};
		}

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

			const txns = [] as Transaction[];
			const signed = [] as Uint8Array[];
			transactions.forEach((txn: AlgonautAtomicTransaction) => {
				txns.push(txn.transaction);
			});

			// this is critical, if the group doesn't have an id
			// the transactions are processed as one-offs!
			const txnGroup = assignGroupID(txns);

			// sign all transactions in the group:
			transactions.forEach((txn: AlgonautAtomicTransaction, i) => {
				let signedTx: {
					txID: string;
					blob: Uint8Array;
				};
				if (txn.isLogigSig) {
					signedTx = signLogicSigTransaction(txnGroup[i], txn.transactionSigner as LogicSigAccount);
				} else {
					signedTx = signTransaction(txnGroup[i], (txn.transactionSigner as AlgosdkAccount).sk);
				}
				signed.push(signedTx.blob);
			});

			if (callbacks?.onSign) callbacks.onSign(signed);

			const tx = await this.algodClient.sendRawTransaction(signed).do();

			if (callbacks?.onSend) callbacks.onSend(tx);

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

	/**
	 * Signs an array of Transactions with the currently authenticated account (used in inkey-wallet)
	 * @param txns Array of Transaction
	 * @returns Uint8Array[] of signed transactions
	 */
	signTransactionGroup(txns: Transaction[]) {
		if (!this.account) throw new Error('There is no account!');
		return utils.signTransactionGroup(txns, this.account);
	}

	/**
	 * Signs base64-encoded transactions with the currently authenticated account
	 * @param txns Array of Base64-encoded unsigned transactions
	 * @returns Uint8Array signed transactions
	 */
	signBase64Transactions(txns: string[]): Uint8Array[] | Uint8Array {
		if (!this.account) throw new Error('There is no account!');
		return utils.signBase64Transactions(txns, this.account);
	}

	/**
	 * Signs base64-encoded transactions in the object format with the currently authenticated account
	 * @param txnsForSigning Array of objects containing Base64-encoded unsigned transactions + info about how they need to be signed
	 * @returns Uint8Array signed transactions
	 */
	signBase64TxnObjects(txnsForSigning: TxnForSigning[]): Uint8Array[] | Uint8Array {
		if (!this.account) throw new Error('There is no account!');
		return utils.signBase64TxnObjects(txnsForSigning, this.account);
	}

	/** INCLUDE ALL THE UTILITIES IN ALGONAUT EXPORT FOR CONVENIENCE **/

	/**
	 *
	 * @param str string
	 * @param enc the encoding type of the string (defaults to utf8)
	 * @returns string encoded as Uint8Array
	 */
	to8Arr(str: string, enc: BufferEncoding = 'utf8'): Uint8Array {
		return utils.to8Arr(str, enc);
	}

	/**
	 * Helper function to turn `globals` and `locals` array into more useful objects
	 *
	 * @param stateArray State array returned from functions like {@link getAppInfo}
	 * @returns A more useful object: `{ array[0].key: array[0].value, array[1].key: array[1].value, ... }`
	 */
	stateArrayToObject(stateArray: object[]): any {
		return utils.stateArrayToObject(stateArray);
	}

	/**
	 * Used for decoding state
	 * @param encoded Base64 string
	 * @returns Human-readable string
	 */
	fromBase64(encoded: string): string {
		return utils.fromBase64(encoded);
	}

	/**
	 * Decodes a Base64-encoded Uint8 Algorand address and returns a string
	 * @param encoded An encoded Algorand address
	 * @returns Decoded address
	 */
	valueAsAddr(encoded: string): string {
		return utils.valueAsAddr(encoded);
	}

	/**
	 * Decodes app state into a human-readable format
	 * @param stateArray Encoded app state
	 * @returns Array of objects with key, value, and address properties
	 */
	decodeStateArray(stateArray: AlgonautAppStateEncoded[]) {
		return utils.decodeStateArray(stateArray);
	}

	/**
	 * Does what it says on the tin.
	 * @param txn base64-encoded unsigned transaction
	 * @returns transaction object
	 */
	decodeBase64UnsignedTransaction(txn: string): Transaction {
		return utils.decodeBase64UnsignedTransaction(txn);
	}

	/**
	 * Describes an Algorand transaction, for display in Inkey
	 * @param txn Transaction to describe
	 */
	txnSummary(txn: Transaction) {
		return utils.txnSummary(txn);
	}

}
export default Algonaut;

/**
 * This export contains all the offline Algonaut functionality.
 * Since instantiation of the Algonaut class requires that you
 * configure a node, if you wish to use certain conveniences of
 * Algonaut without the need for a network, simply use
 * `import { utils } from '@thencc/algonautjs'`
 */
export const utils = {
	/**
	 * Creates a wallet address + mnemonic from account's secret key
	 * @returns AlgonautWallet Object containing `address` and `mnemonic`
	 */
	createWallet(): AlgonautWallet {
		const account = generateAccount();

		if (account) {
			const mnemonic = secretKeyToMnemonic(account.sk);
			return {
				address: account.addr,
				mnemonic: mnemonic || ''
			};
		} else {
			throw new Error('There was no account: could not create algonaut wallet!');
		}

	},

	/**
	 * Recovers account from mnemonic
	 * @param mnemonic Mnemonic associated with Algonaut account
	 * @returns If mnemonic is valid, returns account. Otherwise, throws an error.
	 */
	recoverAccount(mnemonic: string): AlgosdkAccount {
		if (!mnemonic) throw new Error('utils.recoverAccount: No mnemonic provided.');

		try {
			const account = mnemonicToSecretKey(mnemonic);
			if (isValidAddress(account?.addr)) {
				//if (this.config) this.config.SIGNING_MODE = 'local';
				return account;
			} else {
				throw new Error('Not a valid mnemonic.');
			}
		} catch (error: any) {
			// should we throw an error here instead of returning false?
			console.error(error);
			throw new Error('Could not recover account from mnemonic.');
		}
	},

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
	},

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
	},

	/**
	 * Get an application's escrow account
	 * @param appId - ID of application
	 * @returns Escrow account address as string
	 */
	getAppEscrowAccount(appId: number | bigint): string {
		if (!appId) throw new Error('No appId provided');
		return getApplicationAddress(appId);
	},

	/**
	 *
	 * @param str string
	 * @param enc the encoding type of the string (defaults to utf8)
	 * @returns string encoded as Uint8Array
	 */
	to8Arr(str: string, enc: BufferEncoding = 'utf8'): Uint8Array {
		return new Uint8Array(Buffer.from(str, enc));
	},

	/**
	 * Helper function to turn `globals` and `locals` array into more useful objects
	 *
	 * @param stateArray State array returned from functions like {@link Algonaut.getAppInfo}
	 * @returns A more useful object: `{ array[0].key: array[0].value, array[1].key: array[1].value, ... }`
	 */
	stateArrayToObject(stateArray: object[]): any {
		const stateObj = {} as any;
		stateArray.forEach((value: any) => {
			if (value.key) stateObj[value.key] = value.value || null;
		});
		return stateObj;
	},

	fromBase64(encoded: string) {
		return Buffer.from(encoded, 'base64').toString();
	},

	valueAsAddr(encoded: string): string {
		return encodeAddress(Buffer.from(encoded, 'base64'));
	},

	decodeStateArray(stateArray: AlgonautAppStateEncoded[]) {
		const result: AlgonautStateData[] = [];

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
	},

	/**
	 * Signs an array of Transactions (used in Inkey)
	 * @param txns Array of Transaction
	 * @param account AlgosdkAccount object with `sk`, that signs the transactions
	 * @returns Uint8Array[] of signed transactions
	 */
	signTransactionGroup(txns: Transaction[], account: AlgosdkAccount): Uint8Array[] | Uint8Array {

		// this is critical, if the group doesn't have an id
		// the transactions are processed as one-offs!

		if (txns.length > 1) {
			const txnGroup = assignGroupID(txns);

			const signed = [] as Uint8Array[];

			// sign all transactions in the group
			txns.forEach((txn: Transaction, i) => {
				const signedTx = signTransaction(txnGroup[i], account.sk);
				signed.push(signedTx.blob);
			});

			return signed;
		} else {
			const signedTx = signTransaction(txns[0], account.sk);
			return signedTx.blob;
		}
	},

	/**
	 * Signs an array of Transactions Objects (used in Inkey)
	 * @param txnsForSigning Array of unsigned Transaction Objects (txn + signing method needed)
	 * @param account AlgosdkAccount object with `sk`, that signs the transactions
	 * @returns Uint8Array[] of signed transactions
	 */
	signTxnObjectGroup(txnsForSigning: TxnForSigning[], account: AlgosdkAccount): Uint8Array[] | Uint8Array {
		// console.log('signTxnObjectGroup', txnsForSigning);

		// this is critical, if the group doesn't have an id
		// the transactions are processed as one-offs!

		if (txnsForSigning.length > 1) {
			// decode txn str -> Transaction type
			txnsForSigning.forEach(txnFS => {
				const decodedTxn = this.decodeBase64UnsignedTransaction(txnFS.txn);
				txnFS.txnDecoded = decodedTxn;
			});

			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			const txns = txnsForSigning.map(tfs => tfs.txnDecoded!);
			const txnGroup = assignGroupID(txns);

			const signed = [] as Uint8Array[];

			// sign all transactions in the group
			txnsForSigning.forEach((txnFS, i) => {
				let signedTx: ReturnType<typeof signTransaction>;

				if (txnFS.isMultisig) {
					if (!txnFS.multisigMeta) {
						throw new Error('multisig signing required multisigMeta');
					}
					signedTx = signMultisigTransaction(txnGroup[i], txnFS.multisigMeta, account.sk);
				} else if (txnFS.isLogicSig) {
					// TODO
					// signedTx = signTransaction(txnGroup[i], account.sk); // reference
					throw new Error('logic sign signing not yet supported...');
				} else {
					// normal signing
					signedTx = signTransaction(txnGroup[i], account.sk);
				}

				signed.push(signedTx.blob);
			});

			return signed;
		} else {
			const txnFS = txnsForSigning[0];
			const txnUnsignedDecoded = this.decodeBase64UnsignedTransaction(txnFS.txn);
			let signedTx: ReturnType<typeof signTransaction>;

			if (txnFS.isMultisig) {
				if (!txnFS.multisigMeta) {
					throw new Error('multisig signing required multisigMeta');
				}
				signedTx = signMultisigTransaction(txnUnsignedDecoded, txnFS.multisigMeta, account.sk);
			} else if (txnFS.isLogicSig) {
				// TODO
				// signedTx = signTransaction(txnDecoded, account.sk);
				throw new Error('logic sign signing not yet supported...');
			} else {
				// normal signing
				signedTx = signTransaction(txnUnsignedDecoded, account.sk);
			}

			return signedTx.blob;
		}
	},

	/**
	 * Used by Inkey to sign base64-encoded transactions sent to the iframe
	 * @param txns Array of Base64-encoded unsigned transactions
	 * @param account AlgosdkAccount object with `sk`, that signs the transactions
	 * @returns Uint8Array signed transactions
	 */
	signBase64Transactions(txns: string[], account: AlgosdkAccount): Uint8Array[] | Uint8Array {
		const decodedTxns: Transaction[] = [];
		txns.forEach(txn => {
			const decodedTxn = this.decodeBase64UnsignedTransaction(txn);
			decodedTxns.push(decodedTxn);
		});
		return this.signTransactionGroup(decodedTxns, account);
	},

	/**
	 * Used by Inkey to sign base64-encoded transactions (objects) sent to the iframe
	 * @param txnsForSigning Array of objects containing a Base64-encoded unsigned transaction + info re how they need to be signed (multisig, logicsig, normal...)
	 * @param account AlgosdkAccount object with `sk`, that signs the transactions
	 * @returns Uint8Array signed transactions
	 */
	signBase64TxnObjects(txnsForSigning: TxnForSigning[], account: AlgosdkAccount): Uint8Array[] | Uint8Array {
		return this.signTxnObjectGroup(txnsForSigning, account);
	},



	/**
	 * Does what it says on the tin.
	 * @param txn base64-encoded unsigned transaction
	 * @returns transaction object
	 */
	decodeBase64UnsignedTransaction(txn: string): Transaction {
		return decodeUnsignedTransaction(Buffer.from(txn, 'base64'));
	},

	/**
	 * Does what it says on the tin.
	 * @param txn algorand txn object
	 * @returns string (like for inkey / base64 transmit use)
	 */
	txnToStr(txn: algosdk.Transaction): string {
		return Buffer.from(txn.toByte()).toString('base64');
	},

	/**
	 * Describes an Algorand transaction, for display in Inkey
	 * @param txn Transaction to describe
	 */
	txnSummary(txn: Transaction): string {
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
};

export const buffer = Buffer; // sometimes this is helpful on the frontend
