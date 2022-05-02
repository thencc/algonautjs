/// <reference types="node" />
import algosdk from 'algosdk';
import { AlgonautConfig, AlgonautWallet, AlgonautTransactionStatus, AlgonautAtomicTransaction, AlgonautAppState, AlgonautError, WalletConnectListener, AlgonautTxnCallbacks, AlgonautCreateAssetArguments, AlgonautSendAssetArguments, AlgonautCallAppArguments, AlgonautDeployArguments, AlgonautLsigDeployArguments, AlgonautLsigCallAppArguments, AlgonautLsigSendAssetArguments, AlgonautPaymentArguments, AlgonautLsigPaymentArguments, AlgonautUpdateAppArguments } from './AlgonautTypes';
import WalletConnect from '@walletconnect/client/dist/umd/index.min.js';
import { IInternalEvent } from '@walletconnect/types';
import { FrameBus } from './FrameBus';
declare global {
    interface Window {
        AlgoSigner: any;
    }
}
export default class Algonaut {
    algodClient: algosdk.Algodv2;
    indexerClient: algosdk.Indexer | undefined;
    account: algosdk.Account | undefined;
    address: string | undefined;
    sKey: Uint8Array | undefined;
    mnemonic: string | undefined;
    config: AlgonautConfig | undefined;
    sdk: typeof algosdk | undefined;
    uiLoading: boolean;
    hippoWallet: {
        defaultSrc: string;
        otherConfig: {};
        frameBus: FrameBus | undefined;
    };
    walletConnect: {
        connected: boolean;
        connector: WalletConnect | undefined;
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
    constructor(config: AlgonautConfig);
    initHippo(mountConfig: {
        id?: string;
        src?: string;
    }): void;
    /**
     * @returns config object or `false` if no config is set
     */
    getConfig(): AlgonautConfig | boolean;
    /**
     * Checks status of Algorand network
     * @returns Promise resolving to status of Algorand network
     */
    checkStatus(): Promise<any | AlgonautError>;
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
     * Creates a wallet address + mnemonic from account's secret key
     * @returns AlgonautWallet Object containing `address` and `mnemonic`
     */
    createWallet(): AlgonautWallet;
    /**
     * Recovers account from mnemonic
     * @param mnemonic Mnemonic associated with Algonaut account
     * @returns If mnemonic is valid, returns account. Otherwise, returns false.
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
    atomicDeleteApplication(appIndex: number): Promise<AlgonautAtomicTransaction>;
    /**
     * Deletes an application from the blockchain
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
     *
     * @param applicationIndex the applications index
     */
    getAppLocalState(applicationIndex: number): Promise<AlgonautAppState>;
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
    hippoSignTxns(txns: algosdk.Transaction[]): Promise<Uint8Array[]>;
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
     * @returns true if we are signing transactions with hippo, false otherwise
     */
    usingHippoWallet(): boolean;
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
     * Helper function to turn `globals` and `locals` array into more useful objects
     *
     * @param stateArray State array returned from functions like {@link getAppInfo}
     * @returns A more useful object: `{ array[0].key: array[0].value, array[1].key: array[1].value, ... }`
     */
    stateArrayToObject(stateArray: object[]): any;
    fromBase64(encoded: string): string;
    valueAsAddr(encoded: string): string;
    decodeStateArray(stateArray: {
        key: string;
        value: {
            bytes: string;
            type: number;
            uint: number;
        };
    }[]): any[];
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
}
export declare const buffer: BufferConstructor;
