/// <reference types="node" />
import algosdk from 'algosdk';
import type { AlgonautConfig, AlgonautWallet, AlgonautTransactionStatus, AlgonautAtomicTransaction, AlgonautAppState, AlgonautStateData, AlgonautError, WalletConnectListener, AlgonautTxnCallbacks, AlgonautCreateAssetArguments, AlgonautSendAssetArguments, AlgonautCallAppArguments, AlgonautDeployArguments, AlgonautLsigDeployArguments, AlgonautLsigCallAppArguments, AlgonautLsigSendAssetArguments, AlgonautPaymentArguments, AlgonautLsigPaymentArguments, AlgonautUpdateAppArguments, AlgonautAppStateEncoded, InkeySignTxnResponse } from './AlgonautTypes';
import { FrameBus } from './FrameBus';
import { IInternalEvent } from '@walletconnect/types';
declare global {
    interface Window {
        AlgoSigner: any;
    }
}
export declare class Algonaut {
    algodClient: algosdk.Algodv2;
    indexerClient: algosdk.Indexer | undefined;
    sdk: typeof algosdk;
    config: AlgonautConfig | undefined;
    account: algosdk.Account | undefined;
    address: string | undefined;
    mnemonic: string | undefined;
    uiLoading: boolean;
    inkeyWallet: {
        defaultSrc: string;
        otherConfig: {};
        frameBus: FrameBus | undefined;
    };
    walletConnect: {
        connected: boolean;
        connector: any;
        accounts: any[];
        address: string;
        assets: any[];
        chain: any;
    };
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
     *
     * If using Inkey, add `SIGNING_MODE: 'inkey'`.
     * ```
     *
     * @param config config object
     */
    constructor(config: AlgonautConfig);
    /**
     * checks if config obj is valid for use
     * @param config algonaut config for network + signing mode
     * @returns boolean. true is good.
     */
    isValidConfig(config: AlgonautConfig): boolean;
    /**
     * sets config for use (new algod, indexerClient, etc)
     * @param config algonaut config for network + signing mode
     * 		- will throw Error if config is lousy
     */
    setConfig(config: AlgonautConfig): void;
    /**
     * @returns config object or `false` if no config is set
     */
    getConfig(): AlgonautConfig | boolean;
    /**
     * Checks status of Algorand network
     * @returns Promise resolving to status of Algorand network
     */
    checkStatus(): Promise<any | AlgonautError>;
    initInkey(mountConfig: {
        src?: string;
    }): void;
    /**
     * if you already have an account, set it here
     * @param account an algosdk account already created
     */
    setAccount(account: algosdk.Account): void | AlgonautError;
    /**
     * Sets account connected via WalletConnect
     * @param address account address
     */
    setWalletConnectAccount(address: string): void;
    /**
     * This is the same as setting the WC account
     * @param address account address
     */
    setInkeyAccount(address: string): void;
    /**
     * Creates a wallet address + mnemonic from account's secret key and sets the wallet as the currently authenticated account
     * @returns AlgonautWallet Object containing `address` and `mnemonic`
     */
    createWallet(): AlgonautWallet;
    /**
     * Recovers account from mnemonic
     * @param mnemonic Mnemonic associated with Algonaut account
     * @returns If mnemonic is valid, returns account. Otherwise, throws an error.
     */
    recoverAccount(mnemonic: string): algosdk.Account;
    /**
     * General purpose method to await transaction confirmation
     * @param txId a string id of the transacion you want to watch
     * @param limitDelta how many rounds to wait, defaults to 50
     * @param log set to true if you'd like to see "waiting for confirmation" log messages
     */
    waitForConfirmation(txId: string, limitDelta?: number, log?: boolean): Promise<AlgonautTransactionStatus>;
    /**
     * Creates a LogicSig from a base64 program string.  Note that this method does not COMPILE
     * the program, just builds an LSig from an already compiled base64 result!
     * @param base64ProgramString
     * @returns an algosdk LogicSigAccount
     */
    generateLogicSig(base64ProgramString: string): algosdk.LogicSigAccount;
    atomicOptInAsset(assetIndex: number): Promise<AlgonautAtomicTransaction>;
    /**
     * Opt-in the current account for the a token or NFT Asset.
     * @param assetIndex number of asset to opt-in to
     * @param callbacks `AlgonautTxnCallbacks`, passed to {@link sendTransaction}
     * @returns Promise resolving to confirmed transaction or error
     */
    optInAsset(assetIndex: number, callbacks?: AlgonautTxnCallbacks): Promise<AlgonautTransactionStatus>;
    /**
     * You can be opted into an asset but still have a zero balance. Use this call
     * for cases where you just need to know the address's opt-in state
     * @param args object containing `account` and `assetId` properties
     * @returns boolean true if account holds asset
     */
    isOptedIntoAsset(args: {
        account: string;
        assetId: number;
    }): Promise<boolean>;
    /**
     * Sync function that returns a correctly-encoded argument array for
     * an algo transaction
     * @param args must be an any[] array, as it will often need to be
     * a mix of strings and numbers. Valid types are: string, number, and bigint
     * @returns a Uint8Array of encoded arguments
     */
    encodeArguments(args: any[]): Uint8Array[];
    /**
     * Create asset transaction
     * @param args {AlgonautCreateAssetArguments}  Must pass `assetName`, `symbol`, `decimals`, `amount`.
     * @returns atomic txn to create asset
    */
    atomicCreateAsset(args: AlgonautCreateAssetArguments): Promise<AlgonautAtomicTransaction>;
    /**
     * Create asset
     * @param args AlgonautCreateAssetArguments. Must pass `assetName`, `symbol`, `decimals`, `amount`.
     * @param callbacks AlgonautTxnCallbacks
     * @returns asset index
    */
    createAsset(args: AlgonautCreateAssetArguments, callbacks?: AlgonautTxnCallbacks): Promise<AlgonautTransactionStatus>;
    atomicDeleteAsset(assetId: number): Promise<AlgonautAtomicTransaction>;
    /**
     * Deletes asset
     * @param assetId Index of the ASA to delete
     * @param callbacks optional AlgonautTxnCallbacks
     * @returns Promise resolving to confirmed transaction or error
     */
    deleteAsset(assetId: number, callbacks?: AlgonautTxnCallbacks): Promise<AlgonautTransactionStatus>;
    /**
     * Creates send asset transaction.
     *
     * IMPORTANT: Before you can call this, the target account has to "opt-in"
     * to the ASA index.  You can't just send ASAs to people blind!
     *
     * @param args - object containing `to`, `assetIndex`, and `amount` properties
     * @returns Promise resolving to `AlgonautAtomicTransaction`
     */
    atomicSendAsset(args: AlgonautSendAssetArguments): Promise<AlgonautAtomicTransaction>;
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
    sendAsset(args: AlgonautSendAssetArguments, callbacks?: AlgonautTxnCallbacks): Promise<AlgonautTransactionStatus>;
    /**
     * Get info about an asset
     * @param assetIndex
     * @returns
     */
    getAssetInfo(assetIndex: number): Promise<any>;
    /**
     * Creates transaction to opt into an app
     * @param args AlgonautCallAppArgs
     * @returns AlgonautAtomicTransaction
     */
    atomicOptInApp(args: AlgonautCallAppArguments): Promise<AlgonautAtomicTransaction>;
    /**
     * Opt-in the current account for an app.
     * @param args Object containing `appIndex`, `appArgs`, and `optionalFields`
     * @param callbacks optional AlgonautTxnCallbacks
     * @returns Promise resolving to confirmed transaction or error
     */
    optInApp(args: AlgonautCallAppArguments, callbacks?: AlgonautTxnCallbacks): Promise<AlgonautTransactionStatus>;
    /**
     * Returns atomic transaction that deletes application
     * @param appIndex - ID of application
     * @returns Promise resolving to atomic transaction that deletes application
     */
    atomicDeleteApp(appIndex: number): Promise<AlgonautAtomicTransaction>;
    /**
     * DEPRECATED! Use `atomicDeleteApp` instead. Returns atomic transaction that deletes application
     * @deprecated
     * @param appIndex - ID of application
     * @returns Promise resolving to atomic transaction that deletes application
     */
    atomicDeleteApplication(appIndex: number): Promise<AlgonautAtomicTransaction>;
    /**
     * Deletes an application from the blockchain
     * @param appIndex - ID of application
     * @param callbacks optional AlgonautTxnCallbacks
     * @returns Promise resolving to confirmed transaction or error
     */
    deleteApp(appIndex: number, callbacks?: AlgonautTxnCallbacks): Promise<AlgonautTransactionStatus>;
    /**
     * DEPRECATED! Use `deleteApp` instead. This will be removed in future versions.
     * @deprecated
     * @param appIndex - ID of application
     * @param callbacks optional AlgonautTxnCallbacks
     * @returns Promise resolving to confirmed transaction or error
     */
    deleteApplication(appIndex: number, callbacks?: AlgonautTxnCallbacks): Promise<AlgonautTransactionStatus>;
    atomicCallApp(args: AlgonautCallAppArguments): Promise<AlgonautAtomicTransaction>;
    /**
     * Call a "method" on a stateful contract.  In TEAL, you're really giving
     * an argument which branches to a specific place and reads the other args
     * @param args Object containing `appIndex`, `appArgs`, and `optionalFields` properties
     */
    callApp(args: AlgonautCallAppArguments, callbacks?: AlgonautTxnCallbacks): Promise<AlgonautTransactionStatus>;
    atomicCallAppWithLSig(args: AlgonautLsigCallAppArguments): Promise<AlgonautAtomicTransaction>;
    /**
     * Returns an atomic transaction that closes out the user's local state in an application.
     * The opposite of {@link atomicOptInApp}.
     * @param args Object containing `appIndex`, `appArgs`, and `optionalFields` properties
     * @returns Promise resolving to atomic transaction
     */
    atomicCloseOutApp(args: AlgonautCallAppArguments): Promise<AlgonautAtomicTransaction>;
    /**
     * Closes out the user's local state in an application.
     * The opposite of {@link optInApp}.
     * @param args Object containing `appIndex`, `appArgs`, and `optionalFields` properties
     * @param callbacks optional AlgonautTxnCallbacks
     * @returns Promise resolving to atomic transaction
     */
    closeOutApp(args: AlgonautCallAppArguments, callbacks?: AlgonautTxnCallbacks): Promise<AlgonautTransactionStatus>;
    /**
     * Get an application's escrow account
     * @param appId - ID of application
     * @returns Escrow account address as string
     */
    getAppEscrowAccount(appId: number | bigint): string;
    /**
     * Get info about an application (globals, locals, creator address, index)
     *
     * @param appId - ID of application
     * @returns Promise resolving to application state
     */
    getAppInfo(appId: number): Promise<AlgonautAppState>;
    /**
     * Create and deploy a new Smart Contract from TEAL code
     *
     * @param args AlgonautDeployArguments
     * @param callbacks optional AlgonautTxnCallbacks
     * @returns AlgonautTransactionStatus
     */
    createApp(args: AlgonautDeployArguments, callbacks?: AlgonautTxnCallbacks): Promise<AlgonautTransactionStatus>;
    /**
     * Create an atomic transaction to deploy a
     * new Smart Contract from TEAL code
     *
     * @param args AlgonautDeployArguments
     * @returns AlgonautAtomicTransaction
     */
    atomicCreateApp(args: AlgonautDeployArguments): Promise<AlgonautAtomicTransaction>;
    /**
     * deploys a contract from an lsig account
     * keep in mind that the local and global byte and int values have caps,
     * 16 for local and 32 for global and that the cost of deploying the
     * app goes up based on how many of these slots you want to allocate
     *
     * @param args AlgonautLsigDeployArguments
     * @returns
     */
    deployTealWithLSig(args: AlgonautLsigDeployArguments): Promise<AlgonautTransactionStatus>;
    /**
     * Updates an application with `algosdk.makeApplicationUpdateTxn`
     * @param args AlgonautUpdateAppArguments
     * @returns atomic transaction that updates the app
     */
    atomicUpdateApp(args: AlgonautUpdateAppArguments): Promise<AlgonautAtomicTransaction>;
    /**
     * Sends an update app transaction
     * @param args AlgonautUpdateAppArguments
     * @param callbacks optional callbacks: `onSign`, `onSend`, `onConfirm`
     * @returns transaction status
     */
    updateApp(args: AlgonautUpdateAppArguments, callbacks?: AlgonautTxnCallbacks): Promise<AlgonautTransactionStatus>;
    /**
     * Compiles TEAL source via [algodClient.compile](https://py-algorand-sdk.readthedocs.io/en/latest/algosdk/v2client/algod.html#algosdk.v2client.algod.AlgodClient.compile)
     * @param programSource source to compile
     * @returns Promise resolving to Buffer of compiled bytes
     */
    compileProgram(programSource: string): Promise<Uint8Array>;
    atomicSendAlgo(args: AlgonautPaymentArguments): Promise<AlgonautAtomicTransaction>;
    /**
     * DEPRECATED. Use `atomicSendAlgo`. This name will be removed in future versions.
     * @deprecated
     * @param args `AlgonautPaymentArgs` object containing `to`, `amount`, and optional `note`
     * @param callbacks optional AlgonautTxnCallbacks
     * @returns Promise resolving to atomic trasnaction
     */
    atomicPayment(args: AlgonautPaymentArguments): Promise<AlgonautAtomicTransaction>;
    /**
     * Sends ALGO from own account to `args.to`
     *
     * @param args `AlgonautPaymentArgs` object containing `to`, `amount`, and optional `note`
     * @param callbacks optional AlgonautTxnCallbacks
     * @returns Promise resolving to transaction status
     */
    sendAlgo(args: AlgonautPaymentArguments, callbacks?: AlgonautTxnCallbacks): Promise<AlgonautTransactionStatus>;
    /**
     * Fetch full account info for an account
     * @param address the accress to read info for
     * @returns Promise of type AccountInfo
     */
    getAccountInfo(address: string): Promise<any>;
    /**
     * Checks Algo balance of account
     * @param address - Wallet of balance to check
     * @returns Promise resolving to Algo balance
     */
    getAlgoBalance(address: string): Promise<any>;
    /**
     * Checks token balance of account
     * @param address - Wallet of balance to check
     * @param assetIndex - the ASA index
     * @returns Promise resolving to token balance
     */
    getTokenBalance(address: string, assetIndex: number): Promise<number>;
    /**
     * Checks if account has at least one token (before playback)
     * Keeping this here in case this is a faster/less expensive operation than checking actual balance
     * @param address - Address to check
     * @param assetIndex - the index of the ASA
     */
    accountHasTokens(address: string, assetIndex: number): Promise<any>;
    /**
     * Gets global state for an application.
     * @param applicationIndex - the applications index
     * @returns {object} object representing global state
     */
    getAppGlobalState(applicationIndex: number): Promise<any>;
    /**
     * Gets account local state for an app. Defaults to `this.account` unless
     * an address is provided.
     * @param applicationIndex the applications index
     */
    getAppLocalState(applicationIndex: number, address?: string): Promise<AlgonautAppState | void>;
    atomicAssetTransferWithLSig(args: AlgonautLsigSendAssetArguments): Promise<AlgonautAtomicTransaction>;
    atomicPaymentWithLSig(args: AlgonautLsigPaymentArguments): Promise<AlgonautAtomicTransaction>;
    /**
     * Sends a transaction or multiple through the correct channels, depending on signing mode.
     * If no signing mode is set, we assume local signing.
     * @param txnOrTxns Either an array of atomic transactions or a single transaction to sign
     * @param callbacks Optional object with callbacks - `onSign`, `onSend`, and `onConfirm`
     * @returns Promise resolving to AlgonautTransactionStatus
     */
    sendTransaction(txnOrTxns: AlgonautAtomicTransaction[] | algosdk.Transaction | AlgonautAtomicTransaction, callbacks?: AlgonautTxnCallbacks): Promise<AlgonautTransactionStatus>;
    /**
     * Sends messages to Inkey via FrameBus
     * @param data Message to send
     * @returns Whatever Inkey gives us
     */
    inkeyMessageAsync(data: any, options?: {
        showFrame: boolean;
    }): Promise<any>;
    /**
     * Sends unsigned transactions to Inkey, awaits signing, returns signed txns
     * @param txns Array of base64 encoded transactions
     * @returns {Promise<InkeySignTxnResponse>} Promise resolving to response object containing signedTxns if successful. Otherwise, provides `error` or `reject` properties. { success, reject, error, signedTxns }
     */
    inkeySignTxns(txns: string[]): Promise<InkeySignTxnResponse>;
    /**
     * Shows the Inkey wallet frame
     */
    inkeyShow(): void;
    /**
     * Hides the Inkey wallet frame
     */
    inkeyHide(): void;
    /**
     * Sets the app / userbase to use for Inkey accounts. This must be set
     * before Inkey can be used to login or sign transactions.
     * @param appCode String determining the namespace for user accounts
     * @returns Promise resolving to response from Inkey
     */
    inkeySetApp(appCode: string): Promise<any>;
    /**
     * Opens Inkey to allow users to create an account or login with a previously
     * created account. Must be called before transactions can be signed.
     * @param payload Optional payload object, can contain `siteName` parameter to display the name of the application.
     * @returns Promise resolving to an account object of type `{ account: string }`
     */
    inkeyConnect(payload?: {
        siteName?: '';
    }): Promise<any>;
    /**
     * Tells Inkey to close your session & clear local storage.
     * @returns Success or fail message
     */
    inkeyDisconnect(): Promise<any>;
    /**
     * run atomic takes an array of transactions to run in order, each
     * of the atomic transaction methods needs to return an object containing
     * the transaction and the signed transaction
     * 	[ atomicSendASA(),
            atomicSendAlgo(),
            atomicCallApp()]
     * @param transactions a Uint8Array of ALREADY SIGNED transactions
     */
    sendAtomicTransaction(transactions: AlgonautAtomicTransaction[], callbacks?: AlgonautTxnCallbacks): Promise<AlgonautTransactionStatus>;
    /**
     * Signs an array of Transactions (used in Inkey) with the currently authenticated account
     * @param txns Array of algosdk.Transaction
     * @returns Uint8Array[] of signed transactions
     */
    signTransactionGroup(txns: algosdk.Transaction[]): Uint8Array | Uint8Array[];
    /**
     * Signs base64-encoded transactions with the currently authenticated account
     * @param txns Array of Base64-encoded unsigned transactions
     * @returns Uint8Array signed transactions
     */
    signBase64Transactions(txns: string[]): Uint8Array[] | Uint8Array;
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
    sendWalletConnectTxns(walletTxns: AlgonautAtomicTransaction[], callbacks?: AlgonautTxnCallbacks): Promise<AlgonautTransactionStatus>;
    /**
     * Interally used to determine how to sign transactions on more generic functions (e.g. {@link deployFromTeal})
     * @returns true if we are signing transactions with WalletConnect, false otherwise
     */
    usingWalletConnect(): boolean;
    /**
     * Interally used to determine how to sign transactions on more generic functions (e.g. {@link deployFromTeal})
     * @returns true if we are signing transactions with inkey, false otherwise
     */
    usingInkeyWallet(): boolean;
    /**
     * Prepare one or more transactions for wallet connect signature
     *
     * @param transactions one or more atomic transaction objects
     * @returns an array of Transactions
     */
    createWalletConnectTransactions(transactions: AlgonautAtomicTransaction[]): Promise<algosdk.Transaction[]>;
    /**********************************************/
    /***** Below are the Algo Signer APIs *********/
    /**********************************************/
    /**
     * Sends a transaction via AlgoSigner.
     * @param params Transaction parameters to send
     * @returns Promise resolving to confirmed transaction or error
     */
    sendTxWithAlgoSigner(params: {
        assetIndex?: string;
        from: string;
        to: string;
        amount: number;
        note?: string;
        type: string;
        LEDGER: 'TestNet' | 'MainNet';
    }): Promise<any>;
    /**
     * Waits for confirmation of a transaction
     * @param tx Transaction to monitor
     * @returns Promise resolving to error or confirmed transaction
     */
    waitForAlgoSignerConfirmation(tx: any): Promise<any>;
    disconnectAlgoWallet(): Promise<void>;
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
    connectAlgoWallet(clientListener?: WalletConnectListener): Promise<void>;
    /**
     * Sets up listeners for WalletConnect events
     * @param clientListener optional object of listener functions, to be used in an application
     */
    subscribeToEvents(clientListener?: WalletConnectListener): void;
    /**
     * Kills WalletConnect session and calls {@link resetApp}
     */
    killSession(): Promise<void>;
    chainUpdate(newChain: any): Promise<void>;
    resetApp(): Promise<void>;
    startReqAF(): void;
    stopReqAF(playSound?: boolean): void;
    pauseWaitSound(): void;
    /**
     * Function called upon connection to WalletConnect. Sets account in AlgonautJS via {@link setWalletConnectAccount}.
     * @param payload Event payload, containing an array of account addresses
     */
    onConnect(payload: IInternalEvent): Promise<void>;
    /**
     * Called upon disconnection from WalletConnect.
     */
    onDisconnect(): void;
    /**
     * Called when WalletConnect session updates
     * @param accounts Array of account address strings
     */
    onSessionUpdate(accounts: string[]): Promise<void>;
    /**
     * Function to determine if the AlgoSigner extension is installed.
     * @returns true if `window.AlgoSigner` is defined
     */
    isAlgoSignerInstalled(): boolean;
    /**
     * Connects to AlgoSigner extension
     */
    connectToAlgoSigner(): Promise<any>;
    /**
     * Async function that returns list of accounts in the wallet.
     * @param ledger must be 'TestNet' or 'MainNet'.
     * @returns Array of Objects with address fields: [{ address: <String> }, ...]
     */
    getAccounts(ledger: string): Promise<any>;
    /** INCLUDE ALL THE UTILITIES IN ALGONAUT EXPORT FOR CONVENIENCE **/
    /**
     *
     * @param str string
     * @param enc the encoding type of the string (defaults to utf8)
     * @returns string encoded as Uint8Array
     */
    to8Arr(str: string, enc?: BufferEncoding): Uint8Array;
    /**
     * Helper function to turn `globals` and `locals` array into more useful objects
     *
     * @param stateArray State array returned from functions like {@link getAppInfo}
     * @returns A more useful object: `{ array[0].key: array[0].value, array[1].key: array[1].value, ... }`
     */
    stateArrayToObject(stateArray: object[]): any;
    /**
     * Used for decoding state
     * @param encoded Base64 string
     * @returns Human-readable string
     */
    fromBase64(encoded: string): string;
    /**
     * Decodes a Base64-encoded Uint8 Algorand address and returns a string
     * @param encoded An encoded Algorand address
     * @returns Decoded address
     */
    valueAsAddr(encoded: string): string;
    /**
     * Decodes app state into a human-readable format
     * @param stateArray Encoded app state
     * @returns Array of objects with key, value, and address properties
     */
    decodeStateArray(stateArray: AlgonautAppStateEncoded[]): AlgonautStateData[];
    /**
     * Does what it says on the tin.
     * @param txn base64-encoded unsigned transaction
     * @returns transaction object
     */
    decodeBase64UnsignedTransaction(txn: string): algosdk.Transaction;
    /**
     * Describes an Algorand transaction, for display in Inkey
     * @param txn Transaction to describe
     */
    txnSummary(txn: algosdk.Transaction): string;
}
export default Algonaut;
/**
 * This export contains all the offline Algonaut functionality.
 * Since instantiation of the Algonaut class requires that you
 * configure a node, if you wish to use certain conveniences of
 * Algonaut without the need for a network, simply use
 * `import { utils } from '@thencc/algonautjs'`
 */
export declare const utils: {
    /**
     * Creates a wallet address + mnemonic from account's secret key
     * @returns AlgonautWallet Object containing `address` and `mnemonic`
     */
    createWallet(): AlgonautWallet;
    /**
     * Recovers account from mnemonic
     * @param mnemonic Mnemonic associated with Algonaut account
     * @returns If mnemonic is valid, returns account. Otherwise, throws an error.
     */
    recoverAccount(mnemonic: string): algosdk.Account;
    /**
     * Creates a LogicSig from a base64 program string.  Note that this method does not COMPILE
     * the program, just builds an LSig from an already compiled base64 result!
     * @param base64ProgramString
     * @returns an algosdk LogicSigAccount
     */
    generateLogicSig(base64ProgramString: string): algosdk.LogicSigAccount;
    /**
     * Sync function that returns a correctly-encoded argument array for
     * an algo transaction
     * @param args must be an any[] array, as it will often need to be
     * a mix of strings and numbers. Valid types are: string, number, and bigint
     * @returns a Uint8Array of encoded arguments
     */
    encodeArguments(args: any[]): Uint8Array[];
    /**
     * Get an application's escrow account
     * @param appId - ID of application
     * @returns Escrow account address as string
     */
    getAppEscrowAccount(appId: number | bigint): string;
    /**
     *
     * @param str string
     * @param enc the encoding type of the string (defaults to utf8)
     * @returns string encoded as Uint8Array
     */
    to8Arr(str: string, enc?: BufferEncoding): Uint8Array;
    /**
     * Helper function to turn `globals` and `locals` array into more useful objects
     *
     * @param stateArray State array returned from functions like {@link getAppInfo}
     * @returns A more useful object: `{ array[0].key: array[0].value, array[1].key: array[1].value, ... }`
     */
    stateArrayToObject(stateArray: object[]): any;
    fromBase64(encoded: string): string;
    valueAsAddr(encoded: string): string;
    decodeStateArray(stateArray: AlgonautAppStateEncoded[]): AlgonautStateData[];
    /**
     * Signs an array of Transactions (used in Inkey)
     * @param txns Array of algosdk.Transaction
     * @param account algosdk.Account object with `sk`, that signs the transactions
     * @returns Uint8Array[] of signed transactions
     */
    signTransactionGroup(txns: algosdk.Transaction[], account: algosdk.Account): Uint8Array[] | Uint8Array;
    /**
     * Used by Inkey to sign base64-encoded transactions sent to the iframe
     * @param txns Array of Base64-encoded unsigned transactions
     * @param account algosdk.Account object with `sk`, that signs the transactions
     * @returns Uint8Array signed transactions
     */
    signBase64Transactions(txns: string[], account: algosdk.Account): Uint8Array[] | Uint8Array;
    /**
     * Does what it says on the tin.
     * @param txn base64-encoded unsigned transaction
     * @returns transaction object
     */
    decodeBase64UnsignedTransaction(txn: string): algosdk.Transaction;
    /**
     * Describes an Algorand transaction, for display in Inkey
     * @param txn Transaction to describe
     */
    txnSummary(txn: algosdk.Transaction): string;
};
export declare const buffer: BufferConstructor;
