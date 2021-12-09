"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const buffer_1 = require("buffer");
const algosdk_min_1 = require("algosdk");
const index_min_1 = require("@walletconnect/client/dist/umd/index.min");
const algorand_walletconnect_qrcode_modal_1 = require("algorand-walletconnect-qrcode-modal");
const utils_1 = require("@json-rpc-tools/utils");
class Algonaut {
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
        // initial support for wallet connect
        if (config.SIGNING_MODE == 'wallet-connect') {
            console.log('spinning up in wallet connect mode!');
            const wcButton = document.createElement('button');
            wcButton.style.position = 'absolute';
            wcButton.style.top = '8px';
            wcButton.style.right = '8px';
            wcButton.style.zIndex = '10000';
            wcButton.classList.add('algonautjs-wc-button');
            wcButton.innerHTML = 'Connect Wallet';
            wcButton.addEventListener('click', event => {
                const walletConnectButton = document.querySelector('.algonautjs-wc-button');
                console.log('click!', walletConnectButton.classList);
                if (walletConnectButton.classList.contains('is-connected')) {
                    console.log('starting disconnect');
                    this.disconnectAlgoWallet();
                }
                else {
                    console.log('starting connect');
                    this.connectAlgoWallet();
                }
            });
            document.body.appendChild(wcButton);
        }
    }
    getConfig() {
        return this.config;
    }
    async checkStatus() {
        const status = await this.algodClient.status().do();
        console.log('Algorand network status: %o', status);
        return status;
    }
    /** if you already have an account, set it here
     * @param account an algosdk account already created
     *
     */
    setAccount(account) {
        this.account = account;
        this.address = account.addr;
        this.mnemonic = algosdk_min_1.default.secretKeyToMnemonic(account.sk);
    }
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
    recoverAccount(mnemonic) {
        var _a;
        try {
            this.account = algosdk_min_1.default.mnemonicToSecretKey(mnemonic);
            if (algosdk_min_1.default.isValidAddress((_a = this.account) === null || _a === void 0 ? void 0 : _a.addr)) {
                return this.account;
            }
        }
        catch (error) {
            console.log(error);
            return false;
        }
    }
    /**
     * General purpose method to await transaction confirmation
     * @param txId a string id of the transacion you want to watch
     * @param limitDelta how many rounds to wait, defaults to
     */
    async waitForConfirmation(txId, limitDelta) {
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
                console.log('waiting for confirmation');
            }
            catch (er) {
                console.error(er.response.text);
            }
            if (pendingInfo['confirmed-round'] !== null &&
                pendingInfo['confirmed-round'] > 0) {
                console.log('Transaction confirmed in round ' + pendingInfo['confirmed-round']);
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
    /**
     * Opt-in the current account for the a token or NFT ASA.
     * @returns Promise resolving to confirmed transaction or error
     */
    async optInApp(appIndex, appArgs, optionalFields) {
        if (this.account && appIndex) {
            console.log('opt in to app ' + appIndex);
            const sender = this.account.addr;
            const params = await this.algodClient.getTransactionParams().do();
            const optInTransaction = algosdk_min_1.default.makeApplicationOptInTxnFromObject({
                from: sender,
                appIndex: appIndex,
                suggestedParams: params,
                appArgs: appArgs ? this.encodeArguments(appArgs) : undefined,
                accounts: (optionalFields === null || optionalFields === void 0 ? void 0 : optionalFields.accounts) ? optionalFields === null || optionalFields === void 0 ? void 0 : optionalFields.accounts : undefined,
                foreignApps: (optionalFields === null || optionalFields === void 0 ? void 0 : optionalFields.applications) ? optionalFields === null || optionalFields === void 0 ? void 0 : optionalFields.applications : undefined,
                foreignAssets: (optionalFields === null || optionalFields === void 0 ? void 0 : optionalFields.assets) ? optionalFields === null || optionalFields === void 0 ? void 0 : optionalFields.assets : undefined
            });
            const txId = optInTransaction.txID().toString();
            // Sign the transaction
            const signedTxn = optInTransaction.signTxn(this.account.sk);
            try {
                await this.algodClient.sendRawTransaction(signedTxn).do();
                // Wait for confirmation
                const txStatus = await this.waitForConfirmation(txId);
                return txStatus;
            }
            catch (er) {
                console.log('error in opt in');
                console.log(er.response.text);
                return {
                    status: 'fail',
                    message: er.response.text,
                    error: er
                };
            }
        }
        else {
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
    async optInASA(assetIndex) {
        if (this.account) {
            // define sender
            const sender = this.account.addr;
            // get node suggested parameters
            const params = await this.algodClient.getTransactionParams().do();
            // comment out the next two lines to use suggested fee
            //params.fee = 1000;
            //params.flatFee = true;
            // create unsigned transaction
            const txn = algosdk_min_1.default.makeAssetTransferTxnWithSuggestedParams(sender, sender, undefined, undefined, 0, undefined, assetIndex, params);
            const txId = txn.txID().toString();
            // Sign the transaction
            const signedTxn = algosdk_min_1.default.signTransaction(txn, this.account.sk);
            console.log('Signed transaction with txID: %s', txId);
            // Submit the transaction
            try {
                await this.algodClient.sendRawTransaction(signedTxn.blob).do();
                // Wait for confirmation
                const txStatus = await this.waitForConfirmation(txId);
                // display results
                return txStatus;
            }
            catch (er) {
                console.log('error in opt in');
                console.log(er.response.text);
                console.log(er);
                return {
                    status: 'fail',
                    message: er.response.text,
                    error: er
                };
            }
        }
        else {
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
     * Create ASA
     *
     *
     * TBD: move optional params
     * into a params object, add freeze, clawback, etc
    */
    async createAsset(assetName, symbol, metaBlock, decimals, amount, assetURL, defaultFrozen, assetMetadataHash) {
        if (!metaBlock) {
            metaBlock = 'wot? wot wot?';
        }
        if (!defaultFrozen)
            defaultFrozen = false;
        if (!assetURL)
            assetURL = undefined;
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
            const txn = algosdk_min_1.default.makeAssetCreateTxnWithSuggestedParams(addr, note, totalIssuance, decimals, defaultFrozen, manager, reserve, freeze, clawback, symbol, assetName, assetURL, assetMetadataHash, params);
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
            }
            catch (er) {
                console.log('transaction error');
                console.log(er);
                return 'error!';
            }
        }
        else {
            console.log('it looks like there there is no account.');
            return 'no account';
        }
    }
    async deleteApplication(appIndex) {
        if (this.account && appIndex) {
            try {
                const sender = this.account.addr;
                const params = await this.algodClient.getTransactionParams().do();
                console.log('delete: ' + appIndex);
                const txn = algosdk_min_1.default.makeApplicationDeleteTxn(sender, params, appIndex);
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
            }
            catch (e) {
                console.log(e);
                throw new Error(e.response.text);
            }
        }
        else {
            return {
                status: 'fail',
                message: 'no account / algo'
            };
        }
    }
    async deleteASA(assetId) {
        if (this.account && assetId) {
            const sender = this.account.addr;
            const enc = new TextEncoder();
            // get node suggested parameters
            const params = await this.algodClient.getTransactionParams().do();
            const txn = algosdk_min_1.default.makeAssetDestroyTxnWithSuggestedParams(sender, enc.encode('doh!'), assetId, params);
            const signedTxn = txn.signTxn(this.account.sk);
            const tx = await this.algodClient.sendRawTransaction(signedTxn).do();
            const conf = await this.waitForConfirmation(tx.txId);
            console.log(conf);
            return {
                status: 'success',
                message: 'asset ' + assetId + ' deleted'
            };
        }
        else {
            return {
                status: 'fail',
                message: 'there has no current account.'
            };
        }
    }
    /**
     * Sends ASA to an address
     * @param receiverAddress the address to send to
     * @param assetIndex the index of the asset to send
     * @param amount how much to send (based on the ASAs decimal setting)
     * 	so to send 1 token with a decimal setting of 3, this value should be 1000
     *
     * @returns Promise resolving to confirmed transaction or error
     *
     *
     * IMPORTANT: Before you can call this, the target account has to "opt-in"
     * to the ASA index.  You can't just send ASAs to people blind!
     *
     */
    async sendASA(receiverAddress, assetIndex, amount) {
        if (this.account) {
            try {
                // Create transaction B to A
                const transaction1 = algosdk_min_1.default.makeAssetTransferTxnWithSuggestedParamsFromObject({
                    from: this.account.addr,
                    to: receiverAddress,
                    amount: amount,
                    assetIndex: assetIndex,
                    suggestedParams: await this.algodClient.getTransactionParams().do()
                });
                const signedTx1 = algosdk_min_1.default.signTransaction(transaction1, this.account.sk);
                const tx = await this.algodClient.sendRawTransaction(signedTx1.blob).do();
                const txStatus = await this.waitForConfirmation(tx.txId);
                return txStatus;
            }
            catch (e) {
                return {
                    status: 'fail',
                    message: e.response.text,
                    error: e
                };
            }
        }
        else {
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
    async callApp(appIndex, args, optionalFields) {
        if (this.account && appIndex && args.length) {
            try {
                const processedArgs = this.encodeArguments(args);
                const params = await this.algodClient.getTransactionParams().do();
                const callAppTransaction = algosdk_min_1.default.makeApplicationNoOpTxnFromObject({
                    from: this.account.addr,
                    suggestedParams: params,
                    appIndex: appIndex,
                    appArgs: processedArgs,
                    accounts: (optionalFields === null || optionalFields === void 0 ? void 0 : optionalFields.accounts) || undefined,
                    foreignApps: (optionalFields === null || optionalFields === void 0 ? void 0 : optionalFields.applications) || undefined,
                    foreignAssets: (optionalFields === null || optionalFields === void 0 ? void 0 : optionalFields.assets) || undefined
                });
                const txId = callAppTransaction.txID().toString();
                // Sign the transaction
                const signedTx = callAppTransaction.signTxn(this.account.sk);
                // Submit the transaction
                await this.algodClient.sendRawTransaction(signedTx).do();
                // Wait for confirmation
                const txStatus = await this.waitForConfirmation(txId);
                // display results?
                //await this.algodClient.pendingTransactionInformation(txId).do();
                return txStatus;
            }
            catch (er) {
                return {
                    status: 'fail',
                    message: er.response.text,
                    error: er
                };
            }
        }
        else {
            return {
                status: 'fail',
                message: 'contract calls need a contract index and at least one argument'
            };
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
    async deployTealWithLSig(lsig, tealApprovalCode, tealClearCode, noteText, createArgs, accounts, localInts, localBytes, globalInts, globalBytes) {
        if (noteText.length > 511) {
            return {
                status: 'fail',
                message: 'your note is too dang long!'
            };
        }
        if (this.account) {
            let encodedArgs = [];
            if (createArgs && createArgs.length) {
                encodedArgs = this.encodeArguments(createArgs);
            }
            const sender = lsig.address();
            const onComplete = algosdk_min_1.default.OnApplicationComplete.NoOpOC;
            const params = await this.algodClient.getTransactionParams().do();
            let approvalProgram = new Uint8Array();
            let clearProgram = new Uint8Array();
            try {
                approvalProgram = await this.compileProgram(tealApprovalCode);
                clearProgram = await this.compileProgram(tealClearCode);
                // create unsigned transaction
                if (approvalProgram && clearProgram) {
                    const txn = algosdk_min_1.default.makeApplicationCreateTxn(sender, params, onComplete, approvalProgram, clearProgram, localInts, localBytes, globalInts, globalBytes, encodedArgs, accounts);
                    const txId = txn.txID().toString();
                    const signedTxn = algosdk_min_1.default.signLogicSigTransactionObject(txn, lsig);
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
            }
            catch (er) {
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
    async compileProgram(programSource) {
        const encoder = new TextEncoder();
        const programBytes = encoder.encode(programSource);
        const compileResponse = await this.algodClient.compile(programBytes).do();
        const compiledBytes = new Uint8Array(buffer_1.Buffer.from(compileResponse.result, 'base64'));
        return compiledBytes;
    }
    async sendAlgo(toAddress, amount, note) {
        // construct a transaction note
        const encodedNote = note ? new Uint8Array(buffer_1.Buffer.from(note, 'utf8')) : new Uint8Array();
        const suggestedParams = await this.algodClient.getTransactionParams().do();
        if (this.account) {
            try {
                const txn = algosdk_min_1.default.makePaymentTxnWithSuggestedParamsFromObject({
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
            }
            catch (e) {
                return {
                    status: 'fail',
                    message: e.response.text,
                    error: e
                };
            }
        }
        else {
            return {
                status: 'fail',
                message: 'there was no account'
            };
        }
    }
    /* BELOW HERE ARE ALL THE ALGO SIGNER APIS IF WE GO THAT ROUTE */
    /**
     * Function to determine if the AlgoSigner extension is installed.
     * @returns Boolean
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
    /**
     * Checks Algo balance of account
     * @param address Wallet of balance to check
     * @returns Promise resolving to Algo balance
     */
    async getAlgoBalance(address) {
        console.log('checking algo balance');
        const accountInfo = await this.algodClient.accountInformation(address).do();
        return accountInfo.amount;
    }
    /**
     * Checks token balance of account
     * @param address Wallet of balance to check
     * @param assetIndex the ASA index
     * @returns Promise resolving to token balance
     */
    async getTokenBalance(address, assetIndex) {
        const accountInfo = await this.algodClient.accountInformation(address).do();
        console.log(accountInfo);
        let stkBalance = 0;
        console.log(accountInfo.assets);
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
     * @param address Address to check
     * @param assetIndex the index of the ASA
     */
    async accountHasTokens(address, assetIndex) {
        return 'this is not done yet';
    }
    /**
     *
     * @param applicationIndex the applications index
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
        console.log(accountInfoResponse);
        for (let i = 0; i < accountInfoResponse['created-apps'].length; i++) {
            if (accountInfoResponse['created-apps'][i].id == applicationIndex) {
                console.log('Found Application');
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
            console.log(accountInfoResponse);
            for (let i = 0; i < accountInfoResponse['apps-local-state'].length; i++) {
                if (accountInfoResponse['apps-local-state'][i].id == applicationIndex) {
                    console.log('Found Application');
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
    async atomicOptInApp(appIndex, appArgs, optionalFields) {
        if (this.account && appIndex) {
            const sender = this.account.addr;
            const params = await this.algodClient.getTransactionParams().do();
            const optInTransaction = algosdk_min_1.default.makeApplicationOptInTxnFromObject({
                from: sender,
                appIndex: appIndex,
                suggestedParams: params,
                appArgs: appArgs ? this.encodeArguments(appArgs) : undefined,
                accounts: (optionalFields === null || optionalFields === void 0 ? void 0 : optionalFields.accounts) ? optionalFields === null || optionalFields === void 0 ? void 0 : optionalFields.accounts : undefined,
                foreignApps: (optionalFields === null || optionalFields === void 0 ? void 0 : optionalFields.applications) ? optionalFields === null || optionalFields === void 0 ? void 0 : optionalFields.applications : undefined,
                foreignAssets: (optionalFields === null || optionalFields === void 0 ? void 0 : optionalFields.assets) ? optionalFields === null || optionalFields === void 0 ? void 0 : optionalFields.assets : undefined
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
    async atomicOptInASA(assetIndex) {
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
    async atomicCallApp(appIndex, args, optionalFields) {
        if (this.account && appIndex && args.length) {
            const processedArgs = this.encodeArguments(args);
            const params = await this.algodClient.getTransactionParams().do();
            const callAppTransaction = algosdk_min_1.default.makeApplicationNoOpTxnFromObject({
                from: this.account.addr,
                suggestedParams: params,
                appIndex: appIndex,
                appArgs: processedArgs,
                accounts: (optionalFields === null || optionalFields === void 0 ? void 0 : optionalFields.accounts) || undefined,
                foreignApps: (optionalFields === null || optionalFields === void 0 ? void 0 : optionalFields.applications) || undefined,
                foreignAssets: (optionalFields === null || optionalFields === void 0 ? void 0 : optionalFields.assets) || undefined
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
    async atomicCallAppWithLSig(appIndex, args, logicSig, optionalFields) {
        if (this.account && appIndex && args.length) {
            const processedArgs = this.encodeArguments(args);
            const params = await this.algodClient.getTransactionParams().do();
            const callAppTransaction = algosdk_min_1.default.makeApplicationNoOpTxnFromObject({
                from: logicSig.address(),
                suggestedParams: params,
                appIndex: appIndex,
                appArgs: processedArgs,
                accounts: (optionalFields === null || optionalFields === void 0 ? void 0 : optionalFields.accounts) || undefined,
                foreignApps: (optionalFields === null || optionalFields === void 0 ? void 0 : optionalFields.applications) || undefined,
                foreignAssets: (optionalFields === null || optionalFields === void 0 ? void 0 : optionalFields.assets) || undefined
            });
            return {
                transaction: callAppTransaction,
                transactionSigner: logicSig,
                isLogigSig: true
            };
        }
        else {
            throw new Error('there was no account!');
        }
    }
    async atomicAssetTransfer(toAddress, amount, asset) {
        if (this.account) {
            const transaction = algosdk_min_1.default.makeAssetTransferTxnWithSuggestedParamsFromObject({
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
        }
        else {
            throw new Error('there is no account!');
        }
    }
    async atomicAssetTransferWithLSig(toAddress, amount, asset, logicSig) {
        if (logicSig) {
            const transaction = algosdk_min_1.default.makeAssetTransferTxnWithSuggestedParamsFromObject({
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
        }
        else {
            throw new Error('there is no logic sig object!');
        }
    }
    async atomicPayment(toAddress, amount, optionalTxParams) {
        if (this.account) {
            const transaction = algosdk_min_1.default.makePaymentTxnWithSuggestedParamsFromObject({
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
        }
        else {
            throw new Error('there is no account!');
        }
    }
    async atomicPaymentWithLSig(toAddress, amount, logicSig, optionalTxParams) {
        if (logicSig) {
            const transaction = algosdk_min_1.default.makePaymentTxnWithSuggestedParamsFromObject({
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
        }
        else {
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
    async sendAtomicTransaction(transactions) {
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
            const tx = await this.algodClient.sendRawTransaction(signed).do();
            console.log('Transaction : ' + tx.txId);
            // Wait for transaction to be confirmed
            const txStatus = await this.waitForConfirmation(tx.txId);
            return txStatus;
        }
        catch (e) {
            return {
                status: 'fail',
                message: e.response.text,
                error: e
            };
        }
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
    async connectAlgoWallet() {
        console.log('connecting wallet: ');
        // 4067ab2454244fb39835bfeafc285c8d
        const bridge = 'https://bridge.walletconnect.org';
        this.walletConnect.connector = new index_min_1.default({
            bridge,
            apiKey: '4067ab2454244fb39835bfeafc285c8d',
            qrcodeModal: algorand_walletconnect_qrcode_modal_1.default
        });
        console.log('connector created');
        console.log(this.walletConnect.connector);
        console.log('trying to create session');
        // Check if connection is already established
        if (!this.walletConnect.connector.connected) {
            // create new session
            this.walletConnect.connector.createSession();
        }
        this.subscribeToEvents();
    }
    async subscribeToEvents() {
        if (!this.walletConnect.connector) {
            return;
        }
        this.walletConnect.connector.on('session_update', async (error, payload) => {
            console.log('connector.on("session_update")');
            if (error) {
                throw error;
            }
            const { accounts } = payload.params[0];
            this.onSessionUpdate(accounts);
        });
        this.walletConnect.connector.on('connect', (error, payload) => {
            console.log('connector.on("connect")');
            const walletConnectButton = document.querySelector('.algonautjs-wc-button');
            walletConnectButton.innerHTML = 'Disconnect Wallet';
            walletConnectButton.classList.add('is-connected');
            if (error) {
                throw error;
            }
            this.onConnect(payload);
        });
        this.walletConnect.connector.on('disconnect', (error, payload) => {
            console.log('connector.on("disconnect")');
            if (error) {
                console.log(payload);
                throw error;
            }
            const walletConnectButton = document.querySelector('.algonautjs-wc-button');
            walletConnectButton.innerHTML = 'Connect Wallet';
            walletConnectButton.classList.remove('is-connected');
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
    async killSession() {
        if (this.walletConnect.connector) {
            this.walletConnect.connector.killSession();
        }
        this.resetApp();
    }
    // this should get a ChainType
    async chainUpdate(newChain) {
        this.walletConnect.chain = newChain;
        this.getAccountAssets();
    }
    async resetApp() {
        console.log('reset app called');
        console.log('TBD!');
    }
    // iinternal even type from example
    async onConnect(payload) {
        const { accounts } = payload.params[0];
        const address = accounts[0];
        this.walletConnect.connected = true;
        this.walletConnect.accounts = accounts;
        this.walletConnect.address = address;
        this.getAccountAssets();
    }
    onDisconnect() {
        this.walletConnect.connected = false;
        this.walletConnect.accounts = [];
        this.walletConnect.address = '';
    }
    async onSessionUpdate(accounts) {
        this.walletConnect.address = accounts[0];
        this.walletConnect.accounts = accounts;
        await this.getAccountAssets();
    }
    async getAccountAssets() {
        this.uiLoading = true;
        try {
            // get account balances
            this.walletConnect.assets = await this.apiGetAccountAssets(this.walletConnect.address);
        }
        catch (error) {
            console.error(error);
        }
        this.uiLoading = false;
    }
    async apiGetAccountAssets(address) {
        console.log('TBD get assets from algonautjs');
        // return assets;
        return 'almost there for ' + address;
    }
    async signTxns(walletTxns) {
        // can we just insist that you pass in an array?
        const request = (0, utils_1.formatJsonRpcRequest)('algo_signTxn', walletTxns);
        const result = await this.walletConnect.connector.sendCustomRequest(request);
        const signedPartialTxns = result.map((r, i) => {
            // run whatever error checks here
            if (r == null) {
                throw new Error(`Transaction at index ${i}: was not signed when it should have been`);
            }
            const rawSignedTxn = buffer_1.Buffer.from(r, 'base64');
            return new Uint8Array(rawSignedTxn);
        });
        console.log('signed partial txns are');
        console.log(signedPartialTxns);
        return signedPartialTxns;
    }
}
exports.default = Algonaut;
//# sourceMappingURL=index.js.map