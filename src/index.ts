import { atob, Buffer } from 'buffer';
// the web build seems to me missing type defs for algosdk.Account
// and a few other types so we use this ref to get them into the IDE
import algosdkTypeRef from 'algosdk';
import algosdk from 'algosdk/dist/browser/algosdk.min';

import { AlgonautConfig, AlgonautWallet, AlgonautTransactionStatus, AlgonautAtomicTransaction, AlgonautTransactionFields, AlgonautAppState, AlgonautStateData, WalletConnectListener } from './AlgonautTypes';
import * as sha512 from 'js-sha512';
import * as CryptoJS from 'crypto-js';

import WalletConnectMin from '@walletconnect/client/dist/umd/index.min';
import WalletConnect from '@walletconnect/client';
import { IInternalEvent } from '@walletconnect/types';
import QRCodeModal from 'algorand-walletconnect-qrcode-modal';
import { formatJsonRpcRequest } from '@json-rpc-tools/utils';

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
	algodClient: algosdkTypeRef.Algodv2;
	indexerClient: algosdkTypeRef.Indexer;
	account = undefined as undefined | algosdkTypeRef.Account;
	address = undefined as undefined | string;
	sKey = undefined as undefined | Uint8Array;
	mnemonic = undefined as undefined | string;
	config = undefined as undefined | AlgonautConfig;
	sdk = undefined as undefined | typeof algosdkTypeRef;
	uiLoading = false;
	walletConnect = {
		connected: false,
		connector: undefined as any,
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
		this.algodClient = new algosdk.Algodv2(config.API_TOKEN, config.BASE_SERVER,  config.PORT);
		this.indexerClient = new algosdk.Indexer(config.API_TOKEN, config.BASE_SERVER,  config.PORT);

		this.sdk = algosdk;

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
	async checkStatus(): Promise<any> {
		const status = await this.algodClient.status().do();
		console.log('Algorand network status: %o', status);
		return status;
	}

	/**
	 * if you already have an account, set it here
	 * @param account an algosdk account already created
	 */
	setAccount(account: algosdkTypeRef.Account): void {
		this.account = account;
		this.address = account.addr;
		this.mnemonic = algosdk.secretKeyToMnemonic(account.sk);
	}

	/**
	 * Sets account connected via WalletConnect
	 * @param address account address
	 */
	setWalletConnectAccount(address: string) {
		this.account = {
			addr: address,
			sk: new Uint8Array([])
		};
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
	recoverAccount(mnemonic: string): algosdkTypeRef.Account|boolean {
		try {
			this.account = algosdk.mnemonicToSecretKey(mnemonic);
			if (algosdk.isValidAddress(this.account?.addr)) {
				return this.account;
			}
		} catch (error) {
			// should we throw an error here instead of returning false?
			console.log(error);
			return false;
		}
		return false;
	}

	/**
	 * General purpose method to await transaction confirmation
	 * @param txId a string id of the transacion you want to watch
	 * @param limitDelta how many rounds to wait, defaults to
	 */
	async waitForConfirmation (txId: string, limitDelta?: number): Promise<AlgonautTransactionStatus> {
		let lastround = (await this.algodClient.status().do())['last-round'];
		const limit = lastround + (limitDelta? limitDelta: 50);

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
				console.log('waiting for confirmation');
			} catch (er: any) {
				console.error(er.response.text);
			}

			if (
				pendingInfo['confirmed-round'] !== null &&
				pendingInfo['confirmed-round'] > 0
			) {

				console.log(
					'Transaction confirmed in round ' + pendingInfo['confirmed-round']
				);

				returnValue.status = 'success';
				returnValue.message = 'Transaction confirmed in round ' + pendingInfo['confirmed-round'];

				break;
			}

			lastround++;
		}

		return returnValue;

	}

	/**
	 * Creates a LogicSig from a base64 program string.  Note that this method does not COMPILE
	 * the program, just builds an LSig from an already compiled base64 result!
	 * @param base64ProgramString
	 * @returns an algosdk LogicSigAccount
	 */
	generateLogicSig(base64ProgramString: string): algosdkTypeRef.LogicSigAccount {
		const program = new Uint8Array(
			Buffer.from(base64ProgramString, 'base64')
		);

		return new algosdk.LogicSigAccount(program);
	}

	/**
	 * Opt-in the current account for the a token or NFT ASA.
	 * @returns Promise resolving to confirmed transaction or error
	 */
	async optInApp(appIndex: number, appArgs:any[], optionalFields?: AlgonautTransactionFields): Promise<AlgonautTransactionStatus> {
		if (this.account && appIndex) {

			console.log('opt in to app ' + appIndex);
			const sender = this.account.addr;
			const params = await this.algodClient.getTransactionParams().do();

			const optInTransaction = algosdk.makeApplicationOptInTxnFromObject({
				from: sender,
				appIndex: appIndex,
				suggestedParams: params,
				appArgs: appArgs ? this.encodeArguments(appArgs) : undefined,
				accounts: optionalFields?.accounts ? optionalFields?.accounts : undefined,
				foreignApps: optionalFields?.applications ? optionalFields?.applications : undefined,
				foreignAssets: optionalFields?.assets ? optionalFields?.assets : undefined
			});
			const txId = optInTransaction.txID().toString();

			// Sign the transaction
			const signedTxn = optInTransaction.signTxn(this.account.sk);

			try {
				await this.algodClient.sendRawTransaction(signedTxn).do();

				// Wait for confirmation
				const txStatus = await this.waitForConfirmation(txId);
				return txStatus;

			} catch(er: any) {
				console.log('error in opt in');
				console.log(er.response.text);
				return {
					status: 'fail',
					message: er.response.text,
					error: er
				};
			}

		} else {
			return {
				status: 'fail',
				message: 'no algo account found...'
			};
		}

	}

	/**
	 * Opt-in the current account for the a token or NFT ASA.
	 * @returns Promise resolving to confirmed transaction or error
	 */
	async optInASA(assetIndex: number): Promise<AlgonautTransactionStatus> {
		if (this.account) {
			// define sender
			const sender = this.account.addr;

			// get node suggested parameters
			const params = await this.algodClient.getTransactionParams().do();
			// comment out the next two lines to use suggested fee
			//params.fee = 1000;
			//params.flatFee = true;

			// create unsigned transaction
			const txn = algosdk.makeAssetTransferTxnWithSuggestedParams(
				sender,
				sender,
				undefined,
				undefined,
				0,
				undefined,
				assetIndex,
				params
			);
			const txId = txn.txID().toString();

			// Sign the transaction
			const signedTxn = algosdk.signTransaction(txn, this.account.sk);
			console.log('Signed transaction with txID: %s', txId);

			// Submit the transaction
			try {
				await this.algodClient.sendRawTransaction(signedTxn.blob).do();

				// Wait for confirmation
				const txStatus = await this.waitForConfirmation(txId);
				// display results
				return txStatus;

			} catch (er: any) {
				console.log('error in opt in');
				console.log(er.response.text);
				console.log(er);
				return {
					status: 'fail',
					message: er.response.text,
					error: er
				};
			}
		} else {
			return {
				status: 'fail',
				message: 'no algo account found...'
			};
		}
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
	 * Create ASA
	 *
	 *
	 * TBD: move optional params
	 * into a params object, add freeze, clawback, etc
	*/
	async createAsset(
		assetName: string,
		symbol: string,
		metaBlock: string,
		decimals: number,
		amount: number,
		assetURL?: string,
		defaultFrozen?: boolean,
		assetMetadataHash?: string

	): Promise<string> {
		if (!metaBlock) {
			metaBlock = 'wot? wot wot?';
		}

		if (!defaultFrozen) defaultFrozen = false;
		if (!assetURL) assetURL = undefined;

		const metaBlockLength = metaBlock.length;
		console.log('meta block is ' + metaBlockLength);

		if (metaBlockLength > 511) {
			console.warn('drat! this meta block is too long!');
			return 'error';
		}

		const enc = new TextEncoder();

		if (this.account) {

			console.log('ok, starting ASA deploy');

			// arbitrary data: 512 bytes, ~512 characters
			const note = enc.encode(metaBlock);
			const addr = this.account.addr;
			const totalIssuance = amount;
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
				decimals,
				defaultFrozen,
				manager,
				reserve,
				freeze,
				clawback,
				symbol,
				assetName,
				assetURL,
				assetMetadataHash,
				params
			);

			try {

				const rawSignedTxn = txn.signTxn(this.account.sk);
				const tx = await this.algodClient.sendRawTransaction(rawSignedTxn).do();
				console.log('Transaction : ' + tx.txId);
				let assetID = null;

				console.log('waiting for confirmation...');
				// wait for transaction to be confirmed
				const txStatus = await this.waitForConfirmation(tx.txId);


				// TBD: make sure this TX goes through!

				// Get the new asset's information from the creator account
				const ptx = await this.algodClient
					.pendingTransactionInformation(tx.txId)
					.do();
				assetID = ptx['asset-index'];

				console.log(name + ' asset created!');
				console.log(assetID);

				return assetID;

			} catch(er) {
				console.log('transaction error');
				console.log(er);
				return 'error!';
			}

		} else {
			console.log('it looks like there there is no account.');
			return 'no account';
		}
	}

	/**
	 * Deletes an application from the blockchain
	 * @param appIndex - ID of application
	 * @returns Promise resolving to confirmed transaction or error
	 */
	async deleteApplication(appIndex: number): Promise<AlgonautTransactionStatus> {

		if (this.account && appIndex) {
			try {
				const sender = this.account.addr;
				const params = await this.algodClient.getTransactionParams().do();

				console.log('delete: ' + appIndex);

				const txn = algosdk.makeApplicationDeleteTxn(sender, params, appIndex);
				const txId = txn.txID().toString();
				const signedTxn = txn.signTxn(this.account.sk);

				await this.algodClient.sendRawTransaction(signedTxn).do();
				await this.waitForConfirmation(txId);

				// display results
				const transactionResponse = await this.algodClient
					.pendingTransactionInformation(txId)
					.do();
				const appId = transactionResponse['txn']['txn'].apid;
				console.log('Deleted app-id: ', appId);

				return {
					status: 'success',
					message: 'deleted app index ' + appId
				};

			} catch(e: any) {
				console.log(e);
				throw new Error(e.response.text);
			}
		} else {
			return {
				status: 'fail',
				message: 'no account / algo'
			};
		}
	}

	/**
	 * Deletes ASA
	 * @param assetId Index of the ASA to delete
	 * @returns Promise resolving to confirmed transaction or error
	 */
	async deleteASA(assetId: number): Promise<AlgonautTransactionStatus>  {

		if (this.account && assetId) {

			const sender = this.account.addr;
			const enc = new TextEncoder();
			// get node suggested parameters
			const params = await this.algodClient.getTransactionParams().do();

			const txn = algosdk.makeAssetDestroyTxnWithSuggestedParams(
				sender,
				enc.encode('doh!'),
				assetId,
				params
			);

			const signedTxn = txn.signTxn(this.account.sk);
			const tx = await this.algodClient.sendRawTransaction(signedTxn).do();
			const conf = await this.waitForConfirmation(tx.txId);
			console.log(conf);
			return {
				status: 'success',
				message: 'asset ' + assetId + ' deleted'
			};

		} else {
			return {
				status: 'fail',
				message: 'there has no current account.'
			};
		}
	}

	/**
	 * Sends ASA to an address.
	 *
	 * IMPORTANT: Before you can call this, the target account has to "opt-in"
	 * to the ASA index.  You can't just send ASAs to people blind!
	 *
	 * @param receiverAddress - the address to send to
	 * @param assetIndex - the index of the asset to send
	 * @param amount - how much to send (based on the ASAs decimal setting). So to send 1 token with a decimal setting of 3, this value should be 1000.
	 *
	 * @returns Promise resolving to confirmed transaction or error
	 *
	 */
	async sendASA(receiverAddress: string, assetIndex: number, amount: number|bigint): Promise<AlgonautTransactionStatus> {
		if (this.account) {
			try {

				// Create transaction B to A
				const transaction1 = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
					from: this.account.addr,
					to: receiverAddress,
					amount: amount,
					assetIndex: assetIndex,
					suggestedParams: await this.algodClient.getTransactionParams().do()
				});

				const signedTx1 = algosdk.signTransaction(transaction1, this.account.sk);
				const tx = await this.algodClient.sendRawTransaction(signedTx1.blob).do();
				const txStatus = await this.waitForConfirmation(tx.txId);

				return txStatus;
			} catch (e: any) {
				return {
					status: 'fail',
					message: e.response.text,
					error: e
				};
			}
		} else {
			return {
				status: 'fail',
				message: 'there was no algo account...'
			};
		}
	}

	/**
	 * Call a "method" on a stateful contract.  In TEAL, you're really giving
	 * an argument which branches to a specific place and reads the other args
	 * @param contractIndex
	 * @param args an array of arguments for the call
	 * @param optionalTransactionFields an AlgonautTransactionFields object with
	 *  		  any additional fields you want to pass to this transaction
	 */
	async callApp (
		appIndex: number,
		args: any[],
		optionalFields?: AlgonautTransactionFields
	): Promise<AlgonautTransactionStatus> {

		if (this.account && appIndex && args.length) {

			try {
				const processedArgs = this.encodeArguments(args);

				const params = await this.algodClient.getTransactionParams().do();

				const callAppTransaction = algosdk.makeApplicationNoOpTxnFromObject({
					from: this.account.addr,
					suggestedParams: params,
					appIndex: appIndex,
					appArgs: processedArgs,
					accounts: optionalFields?.accounts || undefined,
					foreignApps: optionalFields?.applications || undefined,
					foreignAssets: optionalFields?.assets || undefined
				});

				const txId = callAppTransaction.txID().toString();

				// Sign the transaction
				const signedTx = callAppTransaction.signTxn(
					this.account.sk
				);

				// Submit the transaction
				await this.algodClient.sendRawTransaction(signedTx).do();

				// Wait for confirmation
				const txStatus = await this.waitForConfirmation(txId);
				// display results?
				//await this.algodClient.pendingTransactionInformation(txId).do();

				return txStatus;

			} catch(er: any) {
				return {
					status: 'fail',
					message: er.response.text,
					error: er
				};
			}

		} else {
			return {
				status: 'fail',
				message: 'contract calls need a contract index and at least one argument'
			};
		}
	}

	/**
	 * Get an application's escrow account
	 * @param appId - ID of application
	 * @returns Escrow account address as string
	 */
	getAppEscrowAccount(appId: number | bigint): string {

		return algosdk.getApplicationAddress(appId);

	}




	/**
	 * Get info about an application (globals, locals, creator address, index)
	 *
	 * @param appId - ID of application
	 * @returns Promise resolving to application state
	 */
	async getAppInfo(appId: number): Promise<AlgonautAppState> {

		const info = await this.algodClient.getApplicationByID(appId).do();

		// decode state
		const state = {
			hasState: true,
			globals: [],
			locals: [],
			creatorAddress: info.params.creator,
			index: appId
		} as AlgonautAppState;
		for (let n = 0;
			n < info['params']['global-state'].length;
			n++) {

			const stateItem = info['params']['global-state'][n];

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

			state.globals.push({
				key: key,
				value: value || '',
				address: valueAsAddr
			});

		}

		return state;

	}

	/**
	 * Get info about an asset
	 * @param assetIndex
	 * @returns
	 */
	async getAssetInfo(assetIndex: number): Promise<any> {
		const info = await this.algodClient.getAssetByID(assetIndex).do();
		return info;
	}

	/**
	 * Create and deploy a new Smart Contract from TEAL code
	 *
	 * @param tealApprovalCode
	 * @param tealClearCode
	 * @param args
	 * @param localInts
	 * @param localBytes
	 * @param globalInts
	 * @param globalBytes
	 * @param optionalFields
	 * @returns AlgonautTransactionStatus
	 */
	async deployFromTeal (
		tealApprovalCode: string,
		tealClearCode: string,
		args: any[],
		localInts = 8,
		localBytes = 8,
		globalInts = 8,
		globalBytes = 8,
		optionalFields?: AlgonautTransactionFields
	): Promise<AlgonautTransactionStatus> {
		if (optionalFields && optionalFields.note && optionalFields.note.length > 1023) {
			console.warn('drat! your note is too long!');
			return {
				status: 'fail',
				message: 'your note is too long!'

			};
		} else if (this.account) {
			try {

				const sender = this.account.addr;
				const onComplete = algosdk.OnApplicationComplete.NoOpOC;
				const params = await this.algodClient.getTransactionParams().do();

				let approvalProgram = new Uint8Array();
				let clearProgram = new Uint8Array();

				approvalProgram = await this.compileProgram(tealApprovalCode);
				clearProgram = await this.compileProgram(tealClearCode);

				// create unsigned transaction
				if (approvalProgram && clearProgram) {

					const txn = algosdk.makeApplicationCreateTxn(
						sender,
						params,
						onComplete,
						approvalProgram,
						clearProgram,
						localInts,
						localBytes,
						globalInts,
						globalBytes,
						this.encodeArguments(args),
						optionalFields?.accounts ? optionalFields.accounts : undefined,
						optionalFields?.applications ? optionalFields.applications : undefined,
						optionalFields?.assets ? optionalFields.assets : undefined,
						optionalFields?.note ? new Uint8Array(Buffer.from(optionalFields.note, 'utf8'))  : undefined
					);
					const txId = txn.txID().toString();

					if (this.usingWalletConnect()) {
						// const preparedTxn = await this.createWalletConnectTransactions([
						// 	txn
						// ])
						return {
							status: 'fail',
							message: 'cannot deploy contracts from wallet connect yet. TODO!!'
						};
					} else {
						// Sign the transaction
						const signedTxn = txn.signTxn(this.account.sk);
						console.log('Signed transaction with txID: %s', txId);

						// Submit the transaction
						await this.algodClient.sendRawTransaction(signedTxn).do();

						// Wait for confirmation
						const result = await this.waitForConfirmation(txId);
						const transactionResponse = await this.algodClient
							.pendingTransactionInformation(txId)
							.do();

						result.message = 'Created App ID: ' + transactionResponse['application-index'];
						result.index = transactionResponse['application-index'];
						result.meta = transactionResponse;
						return result;
					}

				} else {
					return {
						status: 'fail',
						message: 'could not compile TEAL code'
					};
				}

			} catch(er: any) {
				return {
					status: 'fail',
					message: er.message,
					error: er
				};
			}
		} else {
			return {
				status: 'fail',
				message: 'there was no account in context'
			};
		}
	}

	/**
	 * Create an atomic transaction to deploy a
	 * new Smart Contract from TEAL code
	 *
	 * @param tealApprovalCode
	 * @param tealClearCode
	 * @param args
	 * @param localInts
	 * @param localBytes
	 * @param globalInts
	 * @param globalBytes
	 * @param optionalFields
	 * @returns AlgonautAtomicTransaction
	 */
	async atomicDeployFromTeal (
		tealApprovalCode: string,
		tealClearCode: string,
		args: any[],
		localInts = 8,
		localBytes = 8,
		globalInts = 8,
		globalBytes = 8,
		optionalFields?: AlgonautTransactionFields
	): Promise<AlgonautAtomicTransaction> {
		if (optionalFields && optionalFields.note && optionalFields.note.length > 1023) {
			throw new Error('Your NOTE is too long, it must be less thatn 1024 Bytes');
		} else if (this.account) {
			try {
				const sender = this.account.addr;
				const onComplete = algosdk.OnApplicationComplete.NoOpOC;
				const params = await this.algodClient.getTransactionParams().do();

				let approvalProgram = new Uint8Array();
				let clearProgram = new Uint8Array();

				approvalProgram = await this.compileProgram(tealApprovalCode);
				clearProgram = await this.compileProgram(tealClearCode);

				// create unsigned transaction
				if (!approvalProgram ||  !clearProgram) {
					throw new Error('Error: you must provide an approval program and a clear state program.');
				}

				const applicationCreateTransaction = algosdk.makeApplicationCreateTxn(
					sender,
					params,
					onComplete,
					approvalProgram,
					clearProgram,
					localInts,
					localBytes,
					globalInts,
					globalBytes,
					this.encodeArguments(args),
					optionalFields?.accounts ? optionalFields.accounts : undefined,
					optionalFields?.applications ? optionalFields.applications : undefined,
					optionalFields?.assets ? optionalFields.assets : undefined,
					optionalFields?.note ? new Uint8Array(Buffer.from(optionalFields.note, 'utf8'))  : undefined
				);

				return {
					transaction: applicationCreateTransaction,
					transactionSigner: this.account,
					isLogigSig: false
				};

			} catch(er: any) {
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
	 * @param lsig
	 * @param tealApprovalCode
	 * @param tealClearCode
	 * @param noteText
	 * @param createArgs
	 * @param accounts
	 * @param localInts up to 16
	 * @param localBytes up to 16
	 * @param globalInts up to 32
	 * @param globalBytes up to 32
	 * @returns
	 */
	async deployTealWithLSig (
		lsig: algosdkTypeRef.LogicSigAccount,
		tealApprovalCode: string,
		tealClearCode: string,
		noteText: string,
		createArgs: string[],
		accounts: string[],
		localInts: number,
		localBytes: number,
		globalInts: number,
		globalBytes: number
	): Promise<AlgonautTransactionStatus> {
		if (noteText.length > 511) {
			return {
				status: 'fail',
				message: 'your note is too dang long!'
			};
		}

		if (this.account) {

			let encodedArgs = [] as Uint8Array[];
			if (createArgs && createArgs.length) {
				encodedArgs = this.encodeArguments(createArgs);
			}

			const sender = lsig.address();
			const onComplete = algosdk.OnApplicationComplete.NoOpOC;
			const params = await this.algodClient.getTransactionParams().do();

			let approvalProgram = new Uint8Array();
			let clearProgram = new Uint8Array();

			try {
				approvalProgram = await this.compileProgram(tealApprovalCode);
				clearProgram = await this.compileProgram(tealClearCode);

				// create unsigned transaction
				if (approvalProgram && clearProgram) {
					const txn = algosdk.makeApplicationCreateTxn(
						sender,
						params,
						onComplete,
						approvalProgram,
						clearProgram,
						localInts,
						localBytes,
						globalInts,
						globalBytes,
						encodedArgs,
						accounts
					);

					const txId = txn.txID().toString();
					const signedTxn = algosdk.signLogicSigTransactionObject(txn, lsig);

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
						message: 'created new app with id: ' + appId
					};
				}
			} catch (er: any) {

				return {
					status: 'fail',
					message: er.response.text,
					error: er
				};
			}
		}
		return {
			status: 'fail',
			message: 'no account'
		};


	}

	/**
	 * Compiles TEAL source via [algodClient.compile](https://py-algorand-sdk.readthedocs.io/en/latest/algosdk/v2client/algod.html#algosdk.v2client.algod.AlgodClient.compile)
	 * @param programSource source to compile
	 * @returns Promise resolving to Buffer of compiled bytes
	 */
	async compileProgram (programSource: string): Promise<Uint8Array> {
		const encoder = new TextEncoder();
		const programBytes = encoder.encode(programSource);
		const compileResponse = await this.algodClient.compile(programBytes).do();
		const compiledBytes = new Uint8Array(
			Buffer.from(compileResponse.result, 'base64')
		);
		return compiledBytes;
	}

	/**
	 * Sends ALGO from own account to `toAddress`.
	 *
	 * @param toAddress - address to send to
	 * @param amount - amount of Algo to send
	 * @param note - note to attach to transaction
	 * @returns Promise resolving to transaction status
	 */
	async sendAlgo(toAddress: string, amount: number, note?: string): Promise<AlgonautTransactionStatus> {
		// construct a transaction note

		const encodedNote = note ? new Uint8Array(Buffer.from(note, 'utf8')) : new Uint8Array();

		const suggestedParams = await this.algodClient.getTransactionParams().do();

		if (this.account) {
			try {
				const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
					from: this.account.addr,
					to: toAddress,
					amount: amount,
					note: encodedNote,
					suggestedParams
				});

				const signedTxn = txn.signTxn(this.account.sk);
				const tx = await this.algodClient.sendRawTransaction(signedTxn).do();

				// Wait for transaction to be confirmed
				const txStatus = await this.waitForConfirmation(tx.txId);

				return txStatus;

			} catch (e: any) {
				return {
					status: 'fail',
					message: e.response.text,
					error: e
				};
			}
		} else {
			return {
				status: 'fail',
				message: 'there was no account'
			};
		}
	}

	/**
	 * Fetch full account info for an account
	 * @param address the accress to read info for
	 * @returns Promise of type AccountInfo
	 */
	async getAccountInfo(address: string): Promise<any> {
		console.log('checking algo balance');
		const accountInfo = await this.algodClient.accountInformation(address).do();
		return accountInfo;
	}


	/**
	 * Checks Algo balance of account
	 * @param address - Wallet of balance to check
	 * @returns Promise resolving to Algo balance
	 */
	async getAlgoBalance(address: string): Promise<any> {
		console.log('checking algo balance');
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
		const accountInfo = await this.algodClient.accountInformation(address).do();
		console.log(accountInfo);

		let stkBalance = 0;
		console.log(accountInfo.assets);
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
	 *
	 * @param applicationIndex - the applications index
	 */
	async getAppGlobalState(applicationIndex: number, creatorAddress: string): Promise<AlgonautAppState> {

		//! if you are reading an ADDRESS, you must do this:
		// const addy = algosdk.encodeAddress(Buffer.from(stateItem.value.bytes, 'base64'));

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
			.accountInformation(creatorAddress)
			.do();

		console.log(accountInfoResponse);

		for (let i = 0; i < accountInfoResponse['created-apps'].length; i++) {
			if (accountInfoResponse['created-apps'][i].id == applicationIndex) {
				console.log('Found Application');

				state.hasState = true;

				for (let n = 0;
					n < accountInfoResponse['created-apps'][i]['params']['global-state'].length;
					n++) {

					const stateItem =
							accountInfoResponse['created-apps'][i]['params']['global-state'][n];

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

					state.globals.push({
						key: key,
						value: value || '',
						address: valueAsAddr
					});

				}
			}
		}

		return state;
	}

	/**
	 *
	 * @param applicationIndex the applications index
	 */
	async getAppLocalState(applicationIndex: number): Promise<AlgonautAppState> {

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
					console.log('Found Application');

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

	async atomicOptInApp(appIndex: number, appArgs:any[], optionalFields?: AlgonautTransactionFields): Promise<AlgonautAtomicTransaction> {
		if (this.account && appIndex) {

			const sender = this.account.addr;
			const params = await this.algodClient.getTransactionParams().do();
			const optInTransaction = algosdk.makeApplicationOptInTxnFromObject({
				from: sender,
				appIndex: appIndex,
				suggestedParams: params,
				appArgs: appArgs ? this.encodeArguments(appArgs) : undefined,
				accounts: optionalFields?.accounts ? optionalFields?.accounts : undefined,
				foreignApps: optionalFields?.applications ? optionalFields?.applications : undefined,
				foreignAssets: optionalFields?.assets ? optionalFields?.assets : undefined
			});

			return {
				transaction: optInTransaction,
				transactionSigner: this.account,
				isLogigSig: false
			};

		} else {
			throw new Error('algonautjs has no account loaded!');
		}

	}

	async atomicOptInASA(assetIndex: number): Promise<AlgonautAtomicTransaction> {

		if (this.account && assetIndex) {

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

		} else {
			throw new Error('there was no account!');
		}

	}

	async atomicCallApp (
		appIndex: number,
		args: any[],
		optionalFields?: AlgonautTransactionFields
	): Promise<AlgonautAtomicTransaction> {

		if (this.account && appIndex && args.length) {

			const processedArgs = this.encodeArguments(args);
			const params = await this.algodClient.getTransactionParams().do();
			const callAppTransaction = algosdk.makeApplicationNoOpTxnFromObject({
				from: this.account.addr,
				suggestedParams: params,
				appIndex: appIndex,
				appArgs: processedArgs,
				accounts: optionalFields?.accounts || undefined,
				foreignApps: optionalFields?.applications || undefined,
				foreignAssets: optionalFields?.assets || undefined
			});

			return {
				transaction: callAppTransaction,
				transactionSigner: this.account,
				isLogigSig: false
			};

		} else {
			throw new Error('there was no account!');
		}
	}

	async atomicCallAppWithLSig (
		appIndex: number,
		args: any[],
		logicSig: algosdkTypeRef.LogicSigAccount,
		optionalFields?: AlgonautTransactionFields
	): Promise<AlgonautAtomicTransaction> {

		if (this.account && appIndex && args.length) {
			const processedArgs = this.encodeArguments(args);
			const params = await this.algodClient.getTransactionParams().do();
			const callAppTransaction = algosdk.makeApplicationNoOpTxnFromObject({
				from: logicSig.address(),
				suggestedParams: params,
				appIndex: appIndex,
				appArgs: processedArgs,
				accounts: optionalFields?.accounts || undefined,
				foreignApps: optionalFields?.applications || undefined,
				foreignAssets: optionalFields?.assets || undefined
			});

			return {
				transaction: callAppTransaction,
				transactionSigner: logicSig,
				isLogigSig: true
			};

		} else {
			throw new Error('there was no account!');
		}
	}

	async atomicAssetTransfer(toAddress: string, amount: number | bigint, asset: number): Promise<AlgonautAtomicTransaction> {

		if (this.account) {

			const transaction =
				algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
					from: this.account.addr,
					to: toAddress,
					amount: amount,
					assetIndex: asset,
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

	async atomicAssetTransferWithLSig(toAddress: string, amount: number | bigint, asset: number, logicSig: algosdkTypeRef.LogicSigAccount): Promise<AlgonautAtomicTransaction> {

		if (logicSig) {
			const transaction =
				algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
					from: logicSig.address(),
					to: toAddress,
					amount: amount,
					assetIndex: asset,
					suggestedParams: await this.algodClient.getTransactionParams().do()
				});

			return {
				transaction: transaction,
				transactionSigner: logicSig,
				isLogigSig: true
			};
		} else {
			throw new Error('there is no logic sig object!');
		}
	}

	async atomicPayment(toAddress: string, amount: number | bigint, optionalTxParams?: AlgonautTransactionFields): Promise<AlgonautAtomicTransaction> {

		if (this.account) {

			const transaction =
				algosdk.makePaymentTxnWithSuggestedParamsFromObject({
					from: this.account.addr,
					to: toAddress,
					amount: amount,
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

	async atomicPaymentWithLSig(toAddress: string, amount: number | bigint, logicSig: algosdkTypeRef.LogicSigAccount, optionalTxParams?: AlgonautTransactionFields): Promise<AlgonautAtomicTransaction> {
		if (logicSig) {

			const transaction =
				algosdk.makePaymentTxnWithSuggestedParamsFromObject({
					from: logicSig.address(),
					to: toAddress,
					amount: amount,
					suggestedParams: await this.algodClient.getTransactionParams().do()
				});

			return {
				transaction: transaction,
				transactionSigner: logicSig,
				isLogigSig: true
			};
		} else {
			throw new Error('there is no account!');
		}
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
	async sendAtomicTransaction(transactions: AlgonautAtomicTransaction[]): Promise<AlgonautTransactionStatus> {

		try {

			const txns = [] as algosdkTypeRef.Transaction[];
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
					signedTx = algosdk.signLogicSigTransaction(txnGroup[i], txn.transactionSigner as algosdkTypeRef.LogicSigAccount);
				} else {
					signedTx = algosdk.signTransaction(txnGroup[i], (txn.transactionSigner as algosdkTypeRef.Account).sk);
				}
				signed.push(signedTx.blob);
			});

			const tx = await this.algodClient.sendRawTransaction(signed).do();
			console.log('Transaction : ' + tx.txId);

			// Wait for transaction to be confirmed
			const txStatus = await this.waitForConfirmation(tx.txId);
			return txStatus;
		} catch (e: any) {
			return {
				status: 'fail',
				message: e.response.text,
				error: e
			};
		}

	}

	/**
	 * Interally used to determine how to sign transactions on more generic functions (e.g. {@link deployFromTeal})
	 * @returns true if we are signing transactions with WalletConnect, false otherwise
	 */
	usingWalletConnect(): boolean {
		if (this.config &&
			this.config.SIGNING_MODE &&
			this.config.SIGNING_MODE === 'wallet-connect') {
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
	async createWalletConnectTransactions(transactions: AlgonautAtomicTransaction[]): Promise<algosdkTypeRef.Transaction[]> {


		console.log('start wc transaction builder');
		const txns = [] as algosdkTypeRef.Transaction[];
		transactions.forEach((txn: AlgonautAtomicTransaction) => {
			txns.push(txn.transaction);
		});

		console.log('done', txns);

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
		console.log('connecting wallet: ');

		// 4067ab2454244fb39835bfeafc285c8d
		if (! clientListener) clientListener = undefined;

		const bridge = 'https://bridge.walletconnect.org';

		this.walletConnect.connector = new WalletConnectMin({
			bridge,
			apiKey: '4067ab2454244fb39835bfeafc285c8d',
			qrcodeModal: QRCodeModal
		});

		console.log('connector created');
		console.log(this.walletConnect.connector);

		console.log('trying to create session');

		// Check if connection is already established
		if (!this.walletConnect.connector.connected) {
			// create new session
			this.walletConnect.connector.createSession();
			console.log('session created');


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

	/**
	 * Function called upon connection to WalletConnect. Sets account in AlgonautJS via {@link setWalletConnectAccount}.
	 * @param payload Event payload, containing an array of account addresses
	 */
	async onConnect(payload: IInternalEvent) {
		const { accounts } = payload.params[0];
		const address = accounts[0];

		this.setWalletConnectAccount(address);

		this.walletConnect.connected = true;
		this.walletConnect.accounts = accounts;
		this.walletConnect.address = address;

	}

	/**
	 * Called upon disconnection from WalletConnect.
	 */
	onDisconnect() {
		this.walletConnect.connected = false;
		this.walletConnect.accounts = [];
		this.walletConnect.address = '';
		this.account = undefined;
	}

	/**
	 * Called when WalletConnect session updates
	 * @param accounts Array of account address strings
	 */
	async onSessionUpdate(accounts: string[]) {
		this.walletConnect.address = accounts[0];
		this.walletConnect.accounts = accounts;
		this.setWalletConnectAccount(accounts[0]);
	}

	/**
	 * Sends one or multiple transactions via WalletConnect, prompting the user to approve transaction on their phone.
	 * 
	 * @remarks
	 * Returns the results of `algodClient.pendingTransactionInformation` in `AlgonautTransactionStatus.meta`.
	 * This is used to get the `application-index` from a `atomicDeployFromTeal` function, among other things.
	 * 
	 * @param walletTxns Array of transactions to send
	 * @returns Promise resolving to transaction status
	 */
	async sendWalletConnectTxns(walletTxns: any[]): Promise<AlgonautTransactionStatus> {

		if (this.walletConnect.connected) {

			// encode txns
			const txnsToSign = walletTxns.map(txn => {
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
			const result = await this.walletConnect.connector.sendCustomRequest(request);
			const signedPartialTxns = result.map((r: any, i: number) => {
				// run whatever error checks here
				if (r == null) {
					throw new Error(`Transaction at index ${i}: was not signed when it should have been`);
				}
				const rawSignedTxn = Buffer.from(r, 'base64');
				return new Uint8Array(rawSignedTxn);
			});

			console.log('signed partial txns are');
			console.log(signedPartialTxns);

			if (signedPartialTxns) {
				const tx = await this.algodClient.sendRawTransaction(signedPartialTxns).do();
				console.log('Transaction : ' + tx.txId);

				// Wait for transaction to be confirmed
				const txStatus = await this.waitForConfirmation(tx.txId);
				const transactionResponse = await this.algodClient
					.pendingTransactionInformation(tx.txId)
					.do();
				txStatus.meta = transactionResponse;
				return txStatus;
			} else {
				return {
					status: 'fail',
					message: 'there were no signed transactions returned'
				};
			}

		} else {
			return {
				status: 'fail',
				message: 'There is no wallet connect session!'
			};
		}




	}

	/**
	 * Helper function to turn `globals` and `locals` array into more useful objects
	 * @param stateArray 
	 * @returns 
	 */
	stateArrayToObject (stateArray: object[]) {
		const stateObj = {} as any;
		stateArray.forEach((value: any) => {
			stateObj[value.key] = value.value;
		});
		return stateObj;
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



