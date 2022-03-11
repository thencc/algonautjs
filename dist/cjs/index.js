"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const buffer_1 = require("buffer");
// the web build seems to me missing type defs for algosdk.Account
// and a few other types so we use this ref to get them into the IDE
const algosdk_1 = require("algosdk");
const algosdk_min_1 = require("algosdk");
const index_min_1 = require("@walletconnect/client/dist/umd/index.min");
const algorand_walletconnect_qrcode_modal_1 = require("algorand-walletconnect-qrcode-modal");
const utils_1 = require("@json-rpc-tools/utils");
class Algonaut {
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
    constructor(config) {
        this.account = undefined;
        this.address = undefined;
        this.sKey = undefined;
        this.mnemonic = undefined;
        this.config = undefined;
        this.sdk = undefined;
        this.uiLoading = false;
        this.walletConnect = {
            connected: false,
            connector: undefined,
            accounts: [],
            address: '',
            assets: [],
            chain: undefined
        };
        this.config = config;
        this.algodClient = new algosdk_min_1.default.Algodv2(config.API_TOKEN, config.BASE_SERVER, config.PORT);
        this.indexerClient = new algosdk_min_1.default.Indexer(config.API_TOKEN, config.BASE_SERVER, config.PORT);
        this.sdk = algosdk_min_1.default;
    }
    /**
     * @returns config object or `false` if no config is set
     */
    getConfig() {
        if (this.config)
            return this.config;
        return false;
    }
    /**
     * Checks status of Algorand network
     * @returns Promise resolving to status of Algorand network
     */
    async checkStatus() {
        const status = await this.algodClient.status().do();
        console.log('Algorand network status: %o', status);
        return status;
    }
    /**
     * if you already have an account, set it here
     * @param account an algosdk account already created
     */
    setAccount(account) {
        this.account = account;
        this.address = account.addr;
        this.mnemonic = algosdk_min_1.default.secretKeyToMnemonic(account.sk);
    }
    /**
     * Sets account connected via WalletConnect
     * @param address account address
     */
    setWalletConnectAccount(address) {
        this.account = {
            addr: address,
            sk: new Uint8Array([])
        };
    }
    /**
     * Creates a wallet address + mnemonic from account's secret key
     * @returns AlgonautWallet Object containing `address` and `mnemonic`
     */
    createWallet() {
        this.account = algosdk_min_1.default.generateAccount();
        if (this.account) {
            this.address = this.account.addr;
            this.mnemonic = algosdk_min_1.default.secretKeyToMnemonic(this.account.sk);
            return {
                address: this.account.addr,
                mnemonic: this.mnemonic || ''
            };
        }
        else {
            throw new Error('There was no account: could not create algonaut wallet!');
        }
    }
    /**
     * Recovers account from mnemonic
     * @param mnemonic Mnemonic associated with Algonaut account
     * @returns If mnemonic is valid, returns account. Otherwise, returns false.
     */
    recoverAccount(mnemonic) {
        var _a;
        try {
            this.account = algosdk_min_1.default.mnemonicToSecretKey(mnemonic);
            if (algosdk_min_1.default.isValidAddress((_a = this.account) === null || _a === void 0 ? void 0 : _a.addr)) {
                return this.account;
            }
        }
        catch (error) {
            // should we throw an error here instead of returning false?
            console.log(error);
            return false;
        }
        return false;
    }
    /**
     * General purpose method to await transaction confirmation
     * @param txId a string id of the transacion you want to watch
     * @param limitDelta how many rounds to wait, defaults to 50
     * @param log set to true if you'd like to see "waiting for confirmation" log messages
     */
    async waitForConfirmation(txId, limitDelta, log = false) {
        var _a;
        let lastround = (await this.algodClient.status().do())['last-round'];
        const limit = lastround + (limitDelta ? limitDelta : 50);
        const returnValue = {
            status: 'fail',
            message: ''
        };
        while (lastround < limit) {
            let pendingInfo = '';
            try {
                pendingInfo = await this.algodClient
                    .pendingTransactionInformation(txId)
                    .do();
                if (log) {
                    console.log('waiting for confirmation');
                }
            }
            catch (er) {
                console.error((_a = er.response) === null || _a === void 0 ? void 0 : _a.text);
            }
            if (pendingInfo['confirmed-round'] !== null &&
                pendingInfo['confirmed-round'] > 0) {
                console.log('Transaction confirmed in round ' + pendingInfo['confirmed-round']);
                returnValue.txId = txId;
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
    generateLogicSig(base64ProgramString) {
        const program = new Uint8Array(buffer_1.Buffer.from(base64ProgramString, 'base64'));
        return new algosdk_min_1.default.LogicSigAccount(program);
    }
    async atomicOptInAsset(assetIndex) {
        if (this.account && assetIndex) {
            const params = await this.algodClient.getTransactionParams().do();
            const optInTransaction = algosdk_min_1.default.makeAssetTransferTxnWithSuggestedParamsFromObject({
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
        else {
            throw new Error('there was no account!');
        }
    }
    /**
     * Opt-in the current account for the a token or NFT Asset.
     * @param assetIndex number of asset to opt-in to
     * @param callbacks `AlgonautTxnCallbacks`, passed to {@link sendTransaction}
     * @returns Promise resolving to confirmed transaction or error
     */
    async optInAsset(assetIndex, callbacks) {
        if (!this.account)
            throw new Error('There was no account!');
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
     * @param assetId
     * @returns
     */
    async isOptedIntoAsset(args) {
        let optInState = false;
        const accountInfo = await this.getAccountInfo(args.account);
        accountInfo.assets.forEach((asset) => {
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
    encodeArguments(args) {
        const encodedArgs = [];
        // loop through args and encode them based on type
        args.forEach((arg) => {
            if (typeof arg == 'number') {
                encodedArgs.push(algosdk_min_1.default.encodeUint64(arg));
            }
            else if (typeof arg == 'bigint') {
                encodedArgs.push(algosdk_min_1.default.encodeUint64(arg));
            }
            else if (typeof arg == 'string') {
                encodedArgs.push(new Uint8Array(buffer_1.Buffer.from(arg)));
            }
        });
        return encodedArgs;
    }
    /**
     * Create asset
     * @param args AlgonautCreateAssetArguments. Must pass `assetName`, `symbol`, `decimals`, `amount`.
     * @param callbacks AlgonautTxnCallbacks
     * @returns asset index
    */
    async createAsset(args, callbacks) {
        if (!args.metaBlock) {
            args.metaBlock = 'wot? wot wot?';
        }
        if (!args.defaultFrozen)
            args.defaultFrozen = false;
        if (!args.assetURL)
            args.assetURL = undefined;
        const metaBlockLength = args.metaBlock.length;
        if (metaBlockLength > 511) {
            console.error('meta block is ' + metaBlockLength);
            throw new Error('drat! this meta block is too long!');
        }
        const enc = new TextEncoder();
        if (!this.account)
            throw new Error('There was no account');
        //console.log('ok, starting ASA deploy');
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
        const txn = algosdk_min_1.default.makeAssetCreateTxnWithSuggestedParams(addr, note, totalIssuance, args.decimals, args.defaultFrozen, manager, reserve, freeze, clawback, args.symbol, args.assetName, args.assetURL, args.assetMetadataHash, params);
        try {
            let assetID = null;
            const txStatus = await this.sendTransaction(txn, callbacks);
            const ptx = await this.algodClient
                .pendingTransactionInformation(txn.txID().toString())
                .do();
            txStatus.createdIndex = ptx['asset-index'];
            return txStatus;
        }
        catch (er) {
            console.log('transaction error');
            console.log(er);
            throw new Error(er);
        }
    }
    async atomicDeleteAsset(assetId) {
        if (!this.account)
            throw new Error('there was no account!');
        const enc = new TextEncoder();
        const transaction = algosdk_min_1.default.makeAssetDestroyTxnWithSuggestedParams(this.account.addr, enc.encode('doh!'), assetId, await this.algodClient.getTransactionParams().do());
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
    async deleteAsset(assetId, callbacks) {
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
    async atomicSendAsset(args) {
        if (!this.account)
            throw new Error('there is no account!');
        const transaction = algosdk_min_1.default.makeAssetTransferTxnWithSuggestedParamsFromObject({
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
    async sendAsset(args, callbacks) {
        if (!this.account)
            throw new Error('There was no account!');
        const { transaction } = await this.atomicSendAsset(args);
        return await this.sendTransaction(transaction, callbacks);
    }
    /**
     * Get info about an asset
     * @param assetIndex
     * @returns
     */
    async getAssetInfo(assetIndex) {
        const info = await this.algodClient.getAssetByID(assetIndex).do();
        return info;
    }
    /**
     * Creates transaction to opt into an app
     * @param args AlgonautCallAppArgs
     * @returns AlgonautAtomicTransaction
     */
    async atomicOptInApp(args) {
        var _a, _b, _c, _d, _e, _f;
        if (this.account && args.appIndex) {
            const sender = this.account.addr;
            const params = await this.algodClient.getTransactionParams().do();
            const optInTransaction = algosdk_min_1.default.makeApplicationOptInTxnFromObject({
                from: sender,
                appIndex: args.appIndex,
                suggestedParams: params,
                appArgs: args.appArgs ? this.encodeArguments(args.appArgs) : undefined,
                accounts: ((_a = args.optionalFields) === null || _a === void 0 ? void 0 : _a.accounts) ? (_b = args.optionalFields) === null || _b === void 0 ? void 0 : _b.accounts : undefined,
                foreignApps: ((_c = args.optionalFields) === null || _c === void 0 ? void 0 : _c.applications) ? (_d = args.optionalFields) === null || _d === void 0 ? void 0 : _d.applications : undefined,
                foreignAssets: ((_e = args.optionalFields) === null || _e === void 0 ? void 0 : _e.assets) ? (_f = args.optionalFields) === null || _f === void 0 ? void 0 : _f.assets : undefined
            });
            return {
                transaction: optInTransaction,
                transactionSigner: this.account,
                isLogigSig: false
            };
        }
        else {
            throw new Error('algonautjs has no account loaded!');
        }
    }
    /**
     * Opt-in the current account for an app.
     * @param args Object containing `appIndex`, `appArgs`, and `optionalFields`
     * @param callbacks optional AlgonautTxnCallbacks
     * @returns Promise resolving to confirmed transaction or error
     */
    async optInApp(args, callbacks) {
        if (this.account && args.appIndex) {
            const { transaction } = await this.atomicOptInApp(args);
            //const txId = transaction.txID().toString();
            return await this.sendTransaction(transaction, callbacks);
        }
        else {
            if (!this.account)
                throw new Error('No account set.');
            throw new Error('Must provide appIndex');
        }
    }
    /**
     * Returns atomic transaction that deletes application
     * @param appIndex - ID of application
     * @returns Promise resolving to atomic transaction that deletes application
     */
    async atomicDeleteApplication(appIndex) {
        if (this.account && appIndex) {
            try {
                const sender = this.account.addr;
                const params = await this.algodClient.getTransactionParams().do();
                //console.log('delete: ' + appIndex);
                const txn = algosdk_min_1.default.makeApplicationDeleteTxn(sender, params, appIndex);
                return {
                    transaction: txn,
                    transactionSigner: this.account,
                    isLogigSig: false
                };
            }
            catch (e) {
                throw new Error(e);
            }
        }
        else {
            throw new Error('No account loaded');
        }
    }
    /**
     * Deletes an application from the blockchain
     * @param appIndex - ID of application
     * @param callbacks optional AlgonautTxnCallbacks
     * @returns Promise resolving to confirmed transaction or error
     */
    async deleteApplication(appIndex, callbacks) {
        var _a;
        if (!this.account)
            throw new Error('There was no account');
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
        }
        catch (e) {
            console.log(e);
            throw new Error((_a = e.response) === null || _a === void 0 ? void 0 : _a.text);
        }
    }
    async atomicCallApp(args) {
        var _a, _b, _c;
        if (this.account && args.appIndex && args.appArgs.length) {
            const processedArgs = this.encodeArguments(args.appArgs);
            const params = await this.algodClient.getTransactionParams().do();
            const callAppTransaction = algosdk_min_1.default.makeApplicationNoOpTxnFromObject({
                from: this.account.addr,
                suggestedParams: params,
                appIndex: args.appIndex,
                appArgs: processedArgs,
                accounts: ((_a = args.optionalFields) === null || _a === void 0 ? void 0 : _a.accounts) || undefined,
                foreignApps: ((_b = args.optionalFields) === null || _b === void 0 ? void 0 : _b.applications) || undefined,
                foreignAssets: ((_c = args.optionalFields) === null || _c === void 0 ? void 0 : _c.assets) || undefined
            });
            return {
                transaction: callAppTransaction,
                transactionSigner: this.account,
                isLogigSig: false
            };
        }
        else {
            throw new Error('there was no account!');
        }
    }
    /**
     * Call a "method" on a stateful contract.  In TEAL, you're really giving
     * an argument which branches to a specific place and reads the other args
     * @param args Object containing `appIndex`, `appArgs`, and `optionalFields` properties
     */
    async callApp(args, callbacks) {
        if (!this.account)
            throw new Error('There was no account!');
        if (!args.appIndex)
            throw new Error('Must provide appIndex');
        if (!args.appArgs.length)
            throw new Error('Must provide at least one appArgs');
        const { transaction } = await this.atomicCallApp(args);
        return await this.sendTransaction(transaction, callbacks);
    }
    async atomicCallAppWithLSig(args) {
        var _a, _b, _c;
        if (this.account && args.appIndex && args.appArgs.length) {
            const processedArgs = this.encodeArguments(args.appArgs);
            const params = await this.algodClient.getTransactionParams().do();
            const callAppTransaction = algosdk_min_1.default.makeApplicationNoOpTxnFromObject({
                from: args.lsig.address(),
                suggestedParams: params,
                appIndex: args.appIndex,
                appArgs: processedArgs,
                accounts: ((_a = args.optionalFields) === null || _a === void 0 ? void 0 : _a.accounts) || undefined,
                foreignApps: ((_b = args.optionalFields) === null || _b === void 0 ? void 0 : _b.applications) || undefined,
                foreignAssets: ((_c = args.optionalFields) === null || _c === void 0 ? void 0 : _c.assets) || undefined
            });
            return {
                transaction: callAppTransaction,
                transactionSigner: args.lsig,
                isLogigSig: true
            };
        }
        else {
            throw new Error('there was no account!');
        }
    }
    /**
     * Returns an atomic transaction that closes out the user's local state in an application.
     * The opposite of {@link atomicOptInApp}.
     * @param args Object containing `appIndex`, `appArgs`, and `optionalFields` properties
     * @returns Promise resolving to atomic transaction
     */
    async atomicCloseOutApp(args) {
        var _a, _b, _c;
        if (this.account && args.appIndex && args.appArgs.length) {
            try {
                const params = await this.algodClient.getTransactionParams().do();
                const processedArgs = this.encodeArguments(args.appArgs);
                const closeOutTxn = algosdk_min_1.default.makeApplicationCloseOutTxnFromObject({
                    from: this.account.addr,
                    suggestedParams: params,
                    appIndex: args.appIndex,
                    appArgs: processedArgs,
                    accounts: ((_a = args.optionalFields) === null || _a === void 0 ? void 0 : _a.accounts) || undefined,
                    foreignApps: ((_b = args.optionalFields) === null || _b === void 0 ? void 0 : _b.applications) || undefined,
                    foreignAssets: ((_c = args.optionalFields) === null || _c === void 0 ? void 0 : _c.assets) || undefined
                });
                return {
                    transaction: closeOutTxn,
                    transactionSigner: this.account,
                    isLogigSig: false
                };
            }
            catch (e) {
                throw new Error(e);
            }
        }
        else {
            throw new Error('requires app index');
        }
    }
    /**
     * Closes out the user's local state in an application.
     * The opposite of {@link optInApp}.
     * @param args Object containing `appIndex`, `appArgs`, and `optionalFields` properties
     * @param callbacks optional AlgonautTxnCallbacks
     * @returns Promise resolving to atomic transaction
     */
    async closeOutApp(args, callbacks) {
        if (!this.account)
            throw new Error('There was no account!');
        if (!args.appIndex)
            throw new Error('Must provide appIndex');
        if (!args.appArgs.length)
            throw new Error('Must provide at least one appArgs');
        const { transaction } = await this.atomicCloseOutApp(args);
        return await this.sendTransaction(transaction, callbacks);
    }
    /**
     * Get an application's escrow account
     * @param appId - ID of application
     * @returns Escrow account address as string
     */
    getAppEscrowAccount(appId) {
        return algosdk_min_1.default.getApplicationAddress(appId);
    }
    /**
     * Get info about an application (globals, locals, creator address, index)
     *
     * @param appId - ID of application
     * @returns Promise resolving to application state
     */
    async getAppInfo(appId) {
        const info = await this.algodClient.getApplicationByID(appId).do();
        // decode state
        const state = {
            hasState: true,
            globals: [],
            locals: [],
            creatorAddress: info.params.creator,
            index: appId
        };
        for (let n = 0; n < info['params']['global-state'].length; n++) {
            const stateItem = info['params']['global-state'][n];
            const key = buffer_1.Buffer.from(stateItem.key, 'base64').toString();
            const type = stateItem.value.type;
            let value = undefined;
            let valueAsAddr = '';
            if (type == 1) {
                value = buffer_1.Buffer.from(stateItem.value.bytes, 'base64').toString();
                valueAsAddr = algosdk_min_1.default.encodeAddress(buffer_1.Buffer.from(stateItem.value.bytes, 'base64'));
            }
            else if (stateItem.value.type == 2) {
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
     * Create and deploy a new Smart Contract from TEAL code
     *
     * @param args AlgonautDeployArguments
     * @param callbacks optional AlgonautTxnCallbacks
     * @returns AlgonautTransactionStatus
     */
    async deployFromTeal(args, callbacks) {
        var _a, _b, _c, _d;
        if (args.optionalFields &&
            args.optionalFields.note &&
            args.optionalFields.note.length > 1023) {
            console.warn('drat! your note is too long!');
            throw new Error('Your note is too long');
        }
        if (!this.account)
            throw new Error('There was no account!');
        try {
            const sender = this.account.addr;
            const onComplete = algosdk_min_1.default.OnApplicationComplete.NoOpOC;
            const params = await this.algodClient.getTransactionParams().do();
            let approvalProgram = new Uint8Array();
            let clearProgram = new Uint8Array();
            approvalProgram = await this.compileProgram(args.tealApprovalCode);
            clearProgram = await this.compileProgram(args.tealClearCode);
            // create unsigned transaction
            if (approvalProgram && clearProgram) {
                const txn = algosdk_min_1.default.makeApplicationCreateTxn(sender, params, onComplete, approvalProgram, clearProgram, args.schema.localInts, args.schema.localBytes, args.schema.globalInts, args.schema.globalBytes, this.encodeArguments(args.appArgs), ((_a = args.optionalFields) === null || _a === void 0 ? void 0 : _a.accounts) ? args.optionalFields.accounts : undefined, ((_b = args.optionalFields) === null || _b === void 0 ? void 0 : _b.applications) ? args.optionalFields.applications : undefined, ((_c = args.optionalFields) === null || _c === void 0 ? void 0 : _c.assets) ? args.optionalFields.assets : undefined, ((_d = args.optionalFields) === null || _d === void 0 ? void 0 : _d.note) ? new Uint8Array(buffer_1.Buffer.from(args.optionalFields.note, 'utf8')) : undefined);
                const txId = txn.txID().toString();
                if (this.usingWalletConnect()) {
                    throw new Error('cannot deploy contracts from wallet connect yet. TODO!!');
                }
                else {
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
                }
            }
            else {
                throw new Error('could not compile teal code');
            }
        }
        catch (er) {
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
    async atomicDeployFromTeal(args) {
        var _a, _b, _c, _d;
        if (args.optionalFields && args.optionalFields.note && args.optionalFields.note.length > 1023) {
            throw new Error('Your NOTE is too long, it must be less thatn 1024 Bytes');
        }
        else if (this.account) {
            try {
                const sender = this.account.addr;
                const onComplete = algosdk_min_1.default.OnApplicationComplete.NoOpOC;
                const params = await this.algodClient.getTransactionParams().do();
                let approvalProgram = new Uint8Array();
                let clearProgram = new Uint8Array();
                approvalProgram = await this.compileProgram(args.tealApprovalCode);
                clearProgram = await this.compileProgram(args.tealClearCode);
                // create unsigned transaction
                if (!approvalProgram || !clearProgram) {
                    throw new Error('Error: you must provide an approval program and a clear state program.');
                }
                const applicationCreateTransaction = algosdk_min_1.default.makeApplicationCreateTxn(sender, params, onComplete, approvalProgram, clearProgram, args.schema.localInts, args.schema.localBytes, args.schema.globalInts, args.schema.globalBytes, this.encodeArguments(args.appArgs), ((_a = args.optionalFields) === null || _a === void 0 ? void 0 : _a.accounts) ? args.optionalFields.accounts : undefined, ((_b = args.optionalFields) === null || _b === void 0 ? void 0 : _b.applications) ? args.optionalFields.applications : undefined, ((_c = args.optionalFields) === null || _c === void 0 ? void 0 : _c.assets) ? args.optionalFields.assets : undefined, ((_d = args.optionalFields) === null || _d === void 0 ? void 0 : _d.note) ? new Uint8Array(buffer_1.Buffer.from(args.optionalFields.note, 'utf8')) : undefined);
                return {
                    transaction: applicationCreateTransaction,
                    transactionSigner: this.account,
                    isLogigSig: false
                };
            }
            catch (er) {
                throw new Error('There was an error creating the transaction');
            }
        }
        else {
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
    async deployTealWithLSig(args) {
        var _a;
        if (args.noteText && args.noteText.length > 511) {
            throw new Error('Your note is too long');
        }
        if (!this.account)
            throw new Error('there was no account');
        let encodedArgs = [];
        if (args.appArgs && args.appArgs.length) {
            encodedArgs = this.encodeArguments(args.appArgs);
        }
        const sender = args.lsig.address();
        const onComplete = algosdk_min_1.default.OnApplicationComplete.NoOpOC;
        const params = await this.algodClient.getTransactionParams().do();
        let approvalProgram = new Uint8Array();
        let clearProgram = new Uint8Array();
        try {
            approvalProgram = await this.compileProgram(args.tealApprovalCode);
            clearProgram = await this.compileProgram(args.tealClearCode);
            // create unsigned transaction
            if (approvalProgram && clearProgram) {
                const txn = algosdk_min_1.default.makeApplicationCreateTxn(sender, params, onComplete, approvalProgram, clearProgram, args.schema.localInts, args.schema.localBytes, args.schema.globalInts, args.schema.globalBytes, encodedArgs, ((_a = args.optionalFields) === null || _a === void 0 ? void 0 : _a.accounts) || undefined);
                const txId = txn.txID().toString();
                const signedTxn = algosdk_min_1.default.signLogicSigTransactionObject(txn, args.lsig);
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
            }
            else {
                throw new Error('Error compiling programs.');
            }
        }
        catch (er) {
            console.error('Error deploying contract:');
            throw new Error(er);
        }
    }
    /**
     * Compiles TEAL source via [algodClient.compile](https://py-algorand-sdk.readthedocs.io/en/latest/algosdk/v2client/algod.html#algosdk.v2client.algod.AlgodClient.compile)
     * @param programSource source to compile
     * @returns Promise resolving to Buffer of compiled bytes
     */
    async compileProgram(programSource) {
        const encoder = new TextEncoder();
        const programBytes = encoder.encode(programSource);
        const compileResponse = await this.algodClient.compile(programBytes).do();
        const compiledBytes = new Uint8Array(buffer_1.Buffer.from(compileResponse.result, 'base64'));
        return compiledBytes;
    }
    async atomicPayment(args) {
        if (this.account) {
            const encodedNote = args.note ? new Uint8Array(buffer_1.Buffer.from(args.note, 'utf8')) : new Uint8Array();
            const transaction = algosdk_min_1.default.makePaymentTxnWithSuggestedParamsFromObject({
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
        }
        else {
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
    async sendAlgo(args, callbacks) {
        if (!this.account)
            throw new Error('there was no account!');
        const { transaction } = await this.atomicPayment(args);
        return await this.sendTransaction(transaction);
    }
    /**
     * Fetch full account info for an account
     * @param address the accress to read info for
     * @returns Promise of type AccountInfo
     */
    async getAccountInfo(address) {
        //console.log//('checking algo balance');
        const accountInfo = await this.algodClient.accountInformation(address).do();
        return accountInfo;
    }
    /**
     * Checks Algo balance of account
     * @param address - Wallet of balance to check
     * @returns Promise resolving to Algo balance
     */
    async getAlgoBalance(address) {
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
    async getTokenBalance(address, assetIndex) {
        const accountInfo = await this.algodClient.accountInformation(address).do();
        //console.log(accountInfo);
        let stkBalance = 0;
        //console.log(accountInfo.assets);
        accountInfo.assets.forEach((asset) => {
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
    async accountHasTokens(address, assetIndex) {
        return 'this is not done yet';
    }
    /**
     *
     * @param applicationIndex - the applications index
     */
    async getAppGlobalState(applicationIndex, creatorAddress) {
        //! if you are reading an ADDRESS, you must do this:
        // const addy = algosdk.encodeAddress(Buffer.from(stateItem.value.bytes, 'base64'));
        const state = {
            hasState: false,
            globals: [],
            locals: [],
            creatorAddress: '',
            index: applicationIndex
        };
        // read state
        // can we detect addresses values and auto-convert them?
        // maybe a 32-byte field gets an address field added?
        const accountInfoResponse = await this.algodClient
            .accountInformation(creatorAddress)
            .do();
        //console.log(accountInfoResponse);
        for (let i = 0; i < accountInfoResponse['created-apps'].length; i++) {
            if (accountInfoResponse['created-apps'][i].id == applicationIndex) {
                //console.log('Found Application');
                state.hasState = true;
                for (let n = 0; n < accountInfoResponse['created-apps'][i]['params']['global-state'].length; n++) {
                    const stateItem = accountInfoResponse['created-apps'][i]['params']['global-state'][n];
                    const key = buffer_1.Buffer.from(stateItem.key, 'base64').toString();
                    const type = stateItem.value.type;
                    let value = undefined;
                    let valueAsAddr = '';
                    if (type == 1) {
                        value = buffer_1.Buffer.from(stateItem.value.bytes, 'base64').toString();
                        valueAsAddr = algosdk_min_1.default.encodeAddress(buffer_1.Buffer.from(stateItem.value.bytes, 'base64'));
                    }
                    else if (stateItem.value.type == 2) {
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
    async getAppLocalState(applicationIndex) {
        var _a;
        if (this.account) {
            const state = {
                hasState: false,
                globals: [],
                locals: [],
                creatorAddress: '',
                index: applicationIndex
            };
            // read state
            // can we detect addresses values and auto-convert them?
            // maybe a 32-byte field gets an address field added?
            const accountInfoResponse = await this.algodClient
                .accountInformation((_a = this.account) === null || _a === void 0 ? void 0 : _a.addr)
                .do();
            //console.log(accountInfoResponse);
            for (let i = 0; i < accountInfoResponse['apps-local-state'].length; i++) {
                if (accountInfoResponse['apps-local-state'][i].id == applicationIndex) {
                    //console.log('Found Application');
                    state.hasState = true;
                    for (let n = 0; n < accountInfoResponse['apps-local-state'][i]['key-value'].length; n++) {
                        const stateItem = accountInfoResponse['apps-local-state'][i]['key-value'][n];
                        const key = buffer_1.Buffer.from(stateItem.key, 'base64').toString();
                        const type = stateItem.value.type;
                        let value = undefined;
                        let valueAsAddr = '';
                        if (type == 1) {
                            value = buffer_1.Buffer.from(stateItem.value.bytes, 'base64').toString();
                            valueAsAddr = algosdk_min_1.default.encodeAddress(buffer_1.Buffer.from(stateItem.value.bytes, 'base64'));
                        }
                        else if (stateItem.value.type == 2) {
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
        }
        else {
            throw new Error('there is no account');
        }
    }
    async atomicAssetTransferWithLSig(args) {
        if (args.lsig) {
            const transaction = algosdk_min_1.default.makeAssetTransferTxnWithSuggestedParamsFromObject({
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
        }
        else {
            throw new Error('there is no logic sig object!');
        }
    }
    async atomicPaymentWithLSig(args) {
        if (args.lsig) {
            const transaction = algosdk_min_1.default.makePaymentTxnWithSuggestedParamsFromObject({
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
        }
        else {
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
    async sendTransaction(txnOrTxns, callbacks) {
        var _a;
        if (!this.account)
            throw new Error('There is no account');
        if (((_a = this.config) === null || _a === void 0 ? void 0 : _a.SIGNING_MODE) && this.config.SIGNING_MODE === 'walletconnect') {
            // walletconnect must be sent as atomic transactions
            if (Array.isArray(txnOrTxns)) {
                return await this.sendWalletConnectTxns(txnOrTxns, callbacks);
            }
            else {
                // we have an algosdkTypeRef.Transaction
                return await this.sendWalletConnectTxns([{
                        transaction: txnOrTxns,
                        transactionSigner: this.account,
                        isLogigSig: false
                    }], callbacks);
            }
        }
        else {
            // assume local signing
            if (Array.isArray(txnOrTxns)) {
                return await this.sendAtomicTransaction(txnOrTxns, callbacks);
            }
            else if (txnOrTxns instanceof algosdk_1.default.Transaction) {
                let txn = txnOrTxns;
                if (!this.account || !this.account.sk)
                    throw new Error('');
                const signedTxn = txn.signTxn(this.account.sk);
                if (callbacks === null || callbacks === void 0 ? void 0 : callbacks.onSign)
                    callbacks.onSign(signedTxn);
                const tx = await this.algodClient.sendRawTransaction(signedTxn).do();
                if (callbacks === null || callbacks === void 0 ? void 0 : callbacks.onSend)
                    callbacks.onSend(signedTxn);
                const txId = tx.txId || tx.id || tx.txId().toString();
                console.log('Transaction ID: ' + txId);
                const txStatus = await this.waitForConfirmation(txId);
                if (callbacks === null || callbacks === void 0 ? void 0 : callbacks.onConfirm)
                    callbacks.onConfirm(signedTxn);
                return txStatus;
            }
            else {
                throw new Error('Local signed single-transactions should not be atomic');
            }
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
    async sendAtomicTransaction(transactions, callbacks) {
        try {
            const txns = [];
            const signed = [];
            transactions.forEach((txn) => {
                txns.push(txn.transaction);
            });
            // this is critical, if the group doesn't have an id
            // the transactions are processed as one-offs!
            const txnGroup = algosdk_min_1.default.assignGroupID(txns);
            // sign all transactions in the group:
            transactions.forEach((txn, i) => {
                let signedTx;
                if (txn.isLogigSig) {
                    signedTx = algosdk_min_1.default.signLogicSigTransaction(txnGroup[i], txn.transactionSigner);
                }
                else {
                    signedTx = algosdk_min_1.default.signTransaction(txnGroup[i], txn.transactionSigner.sk);
                }
                signed.push(signedTx.blob);
            });
            if (callbacks === null || callbacks === void 0 ? void 0 : callbacks.onSign)
                callbacks.onSign(signed);
            const tx = await this.algodClient.sendRawTransaction(signed).do();
            if (callbacks === null || callbacks === void 0 ? void 0 : callbacks.onSend)
                callbacks.onSend(tx);
            //console.log('Transaction : ' + tx.txId);
            // Wait for transaction to be confirmed
            const txStatus = await this.waitForConfirmation(tx.txId);
            const transactionResponse = await this.algodClient
                .pendingTransactionInformation(tx.txId)
                .do();
            txStatus.meta = transactionResponse;
            if (callbacks === null || callbacks === void 0 ? void 0 : callbacks.onConfirm)
                callbacks.onConfirm(txStatus);
            return txStatus;
        }
        catch (e) {
            console.error('Error sending atomic transaction:');
            throw new Error(e);
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
    async sendWalletConnectTxns(walletTxns, callbacks) {
        if (this.walletConnect.connected) {
            let txns = walletTxns.map(txn => txn.transaction);
            // this is critical, if the group doesn't have an id
            // the transactions are processed as one-offs
            if (walletTxns.length > 1) {
                //console.log('assigning group ID to transactions...');
                txns = algosdk_min_1.default.assignGroupID(txns);
            }
            // encode txns
            const txnsToSign = txns.map(txn => {
                const encodedTxn = buffer_1.Buffer.from(algosdk_min_1.default.encodeUnsignedTransaction(txn)).toString('base64');
                return {
                    txn: encodedTxn,
                    message: 'txn description',
                    // Note: if the transaction does not need to be signed (because it's part of an atomic group
                    // that will be signed by another party), specify an empty singers array like so:
                    // signers: [],
                };
            });
            const requestParams = [txnsToSign];
            const request = (0, utils_1.formatJsonRpcRequest)('algo_signTxn', requestParams);
            // this will fail if they cancel... we think
            let result;
            try {
                result = await this.walletConnect.connector.sendCustomRequest(request);
            }
            catch (er) {
                throw new Error('You canceled the transaction');
            }
            const signedPartialTxns = result.map((r, i) => {
                // run whatever error checks here
                if (r == null) {
                    throw new Error(`Transaction at index ${i}: was not signed when it should have been`);
                }
                const rawSignedTxn = buffer_1.Buffer.from(r, 'base64');
                return new Uint8Array(rawSignedTxn);
            });
            //console.log('signed partial txns are');
            //console.log(signedPartialTxns);
            if (callbacks === null || callbacks === void 0 ? void 0 : callbacks.onSign)
                callbacks.onSign(signedPartialTxns);
            if (signedPartialTxns) {
                let tx;
                try {
                    tx = await this.algodClient.sendRawTransaction(signedPartialTxns).do();
                }
                catch (er) {
                    tx = er;
                    console.error('Error sending raw transaction');
                    throw new Error(er);
                }
                //console.log('Transaction : ' + tx.txId);
                if (callbacks === null || callbacks === void 0 ? void 0 : callbacks.onSend)
                    callbacks.onSend(tx);
                // Wait for transaction to be confirmed
                const txStatus = await this.waitForConfirmation(tx.txId);
                const transactionResponse = await this.algodClient
                    .pendingTransactionInformation(tx.txId)
                    .do();
                txStatus.meta = transactionResponse;
                if (callbacks === null || callbacks === void 0 ? void 0 : callbacks.onConfirm)
                    callbacks.onConfirm(txStatus);
                return txStatus;
            }
            else {
                throw new Error('there were no signed transactions returned');
            }
        }
        else {
            throw new Error('There is no wallet connect session');
        }
    }
    /**
     * Interally used to determine how to sign transactions on more generic functions (e.g. {@link deployFromTeal})
     * @returns true if we are signing transactions with WalletConnect, false otherwise
     */
    usingWalletConnect() {
        if (this.config &&
            this.config.SIGNING_MODE &&
            this.config.SIGNING_MODE === 'walletconnect') {
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
    async createWalletConnectTransactions(transactions) {
        //console.log('start wc transaction builder');
        const txns = [];
        transactions.forEach((txn) => {
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
    async sendTxWithAlgoSigner(params) {
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
        }
        catch (error) {
            console.log(error);
            throw new Error('Error sending transaction: ' + JSON.stringify(error));
        }
    }
    /**
     * Waits for confirmation of a transaction
     * @param tx Transaction to monitor
     * @returns Promise resolving to error or confirmed transaction
     */
    async waitForAlgoSignerConfirmation(tx) {
        console.log(`Transaction ${tx.txId} waiting for confirmation...`);
        let status = await window.AlgoSigner.algod({
            ledger: 'TestNet',
            path: '/v2/transactions/pending/' + tx.txId
        });
        // eslint-disable-next-line no-constant-condition
        while (true) {
            if (status['confirmed-round'] !== null && status['confirmed-round'] > 0) {
                //Got the completed Transaction
                console.log(`Transaction confirmed in round ${status['confirmed-round']}.`);
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
        var _a;
        if (this.walletConnect.connected) {
            (_a = this.walletConnect.connector) === null || _a === void 0 ? void 0 : _a.killSession();
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
    async connectAlgoWallet(clientListener) {
        console.log('connecting wallet: ');
        // 4067ab2454244fb39835bfeafc285c8d
        if (!clientListener)
            clientListener = undefined;
        const bridge = 'https://bridge.walletconnect.org';
        this.walletConnect.connector = new index_min_1.default({
            bridge,
            apiKey: '4067ab2454244fb39835bfeafc285c8d',
            qrcodeModal: algorand_walletconnect_qrcode_modal_1.default
        });
        //console.log('connector created');
        //console.log(this.walletConnect.connector);
        //console.log('trying to create session');
        // Check if connection is already established
        if (!this.walletConnect.connector.connected) {
            // create new session
            this.walletConnect.connector.createSession();
            //console.log('session created');
        }
        this.subscribeToEvents(clientListener);
    }
    /**
     * Sets up listeners for WalletConnect events
     * @param clientListener optional object of listener functions, to be used in an application
     */
    subscribeToEvents(clientListener) {
        if (!this.walletConnect.connector) {
            return;
        }
        this.walletConnect.connector.on('session_update', async (error, payload) => {
            //console.log('connector.on("session_update")');
            if (error) {
                throw error;
            }
            const { accounts } = payload.params[0];
            if (clientListener)
                clientListener.onSessionUpdate(payload);
            this.onSessionUpdate(accounts);
        });
        this.walletConnect.connector.on('connect', (error, payload) => {
            //console.log('connector.on("connect")');
            if (error) {
                throw error;
            }
            if (clientListener)
                clientListener.onConnect(payload);
            this.onConnect(payload);
        });
        this.walletConnect.connector.on('disconnect', (error, payload) => {
            //console.log('connector.on("disconnect")');
            if (error) {
                //console.log(payload);
                throw error;
            }
            if (clientListener)
                clientListener.onDisconnect(payload);
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
    async chainUpdate(newChain) {
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
    async onConnect(payload) {
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
    async onSessionUpdate(accounts) {
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
    stateArrayToObject(stateArray) {
        const stateObj = {};
        stateArray.forEach((value) => {
            if (value.key)
                stateObj[value.key] = value.value || null;
        });
        return stateObj;
    }
    fromBase64(encoded) {
        return buffer_1.Buffer.from(encoded, 'base64').toString();
    }
    valueAsAddr(encoded) {
        return algosdk_min_1.default.encodeAddress(buffer_1.Buffer.from(encoded, 'base64'));
    }
    decodeStateArray(stateArray) {
        const result = [];
        for (let n = 0; n < stateArray.length; n++) {
            const stateItem = stateArray[n];
            const key = this.fromBase64(stateItem.key);
            const type = stateItem.value.type;
            let value = undefined;
            let valueAsAddr = '';
            if (type == 1) {
                value = this.fromBase64(stateItem.value.bytes);
                valueAsAddr = this.valueAsAddr(stateItem.value.bytes);
            }
            else if (stateItem.value.type == 2) {
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
    isAlgoSignerInstalled() {
        return typeof window.AlgoSigner !== 'undefined';
    }
    /**
     * Connects to AlgoSigner extension
     */
    async connectToAlgoSigner() {
        return await window.AlgoSigner.connect();
    }
    /**
     * Async function that returns list of accounts in the wallet.
     * @param ledger must be 'TestNet' or 'MainNet'.
     * @returns Array of Objects with address fields: [{ address: <String> }, ...]
     */
    async getAccounts(ledger) {
        await this.connectToAlgoSigner();
        const accounts = await window.AlgoSigner.accounts({ ledger });
        return accounts;
    }
}
exports.default = Algonaut;
//# sourceMappingURL=index.js.map