import algosdkTypeRef from 'algosdk';
import { AlgonautConfig, AlgonautWallet, AlgonautTransactionStatus, AlgonautAtomicTransaction, AlgonautTransactionFields, AlgonautAppState, WalletConnectListener } from './AlgonautTypes';
import { IInternalEvent } from '@walletconnect/types';
declare global {
    interface Window {
        AlgoSigner: any;
    }
}
export default class Algonaut {
    algodClient: algosdkTypeRef.Algodv2;
    indexerClient: algosdkTypeRef.Indexer;
    account: algosdkTypeRef.Account | undefined;
    address: string | undefined;
    sKey: Uint8Array | undefined;
    mnemonic: string | undefined;
    config: AlgonautConfig | undefined;
    sdk: typeof algosdkTypeRef | undefined;
    uiLoading: boolean;
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
    constructor(config: AlgonautConfig);
    /**
     * @returns config object or `false` if no config is set
     */
    getConfig(): AlgonautConfig | boolean;
    /**
     * Checks status of Algorand network
     * @returns Promise resolving to status of Algorand network
     */
    checkStatus(): Promise<any>;
    /**
     * if you already have an account, set it here
     * @param account an algosdk account already created
     */
    setAccount(account: algosdkTypeRef.Account): void;
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
    recoverAccount(mnemonic: string): algosdkTypeRef.Account | boolean;
    /**
     * General purpose method to await transaction confirmation
     * @param txId a string id of the transacion you want to watch
     * @param limitDelta how many rounds to wait, defaults to
     */
    waitForConfirmation(txId: string, limitDelta?: number): Promise<AlgonautTransactionStatus>;
    /**
     * Creates a LogicSig from a base64 program string.  Note that this method does not COMPILE
     * the program, just builds an LSig from an already compiled base64 result!
     * @param base64ProgramString
     * @returns an algosdk LogicSigAccount
     */
    generateLogicSig(base64ProgramString: string): algosdkTypeRef.LogicSigAccount;
    /**
     * Opt-in the current account for the a token or NFT ASA.
     * @returns Promise resolving to confirmed transaction or error
     */
    optInApp(appIndex: number, appArgs: any[], optionalFields?: AlgonautTransactionFields): Promise<AlgonautTransactionStatus>;
    /**
     * Opt-in the current account for the a token or NFT ASA.
     * @returns Promise resolving to confirmed transaction or error
     */
    optInASA(assetIndex: number): Promise<AlgonautTransactionStatus>;
    /**
     * Sync function that returns a correctly-encoded argument array for
     * an algo transaction
     * @param args must be an any[] array, as it will often need to be
     * a mix of strings and numbers. Valid types are: string, number, and bigint
     * @returns a Uint8Array of encoded arguments
     */
    encodeArguments(args: any[]): Uint8Array[];
    /**
     * Create ASA
     *
     *
     * TBD: move optional params
     * into a params object, add freeze, clawback, etc
    */
    createAsset(assetName: string, symbol: string, metaBlock: string, decimals: number, amount: number, assetURL?: string, defaultFrozen?: boolean, assetMetadataHash?: string): Promise<string>;
    /**
     * Deletes an application from the blockchain
     * @param appIndex - ID of application
     * @returns Promise resolving to confirmed transaction or error
     */
    deleteApplication(appIndex: number): Promise<AlgonautTransactionStatus>;
    /**
     * Deletes ASA
     * @param assetId Index of the ASA to delete
     * @returns Promise resolving to confirmed transaction or error
     */
    deleteASA(assetId: number): Promise<AlgonautTransactionStatus>;
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
    sendASA(receiverAddress: string, assetIndex: number, amount: number | bigint): Promise<AlgonautTransactionStatus>;
    /**
     * Call a "method" on a stateful contract.  In TEAL, you're really giving
     * an argument which branches to a specific place and reads the other args
     * @param contractIndex
     * @param args an array of arguments for the call
     * @param optionalTransactionFields an AlgonautTransactionFields object with
     *  		  any additional fields you want to pass to this transaction
     */
    callApp(appIndex: number, args: any[], optionalFields?: AlgonautTransactionFields): Promise<AlgonautTransactionStatus>;
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
     * Get info about an asset
     * @param assetIndex
     * @returns
     */
    getAssetInfo(assetIndex: number): Promise<any>;
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
    deployFromTeal(tealApprovalCode: string, tealClearCode: string, args: any[], localInts?: number, localBytes?: number, globalInts?: number, globalBytes?: number, optionalFields?: AlgonautTransactionFields): Promise<AlgonautTransactionStatus>;
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
    atomicDeployFromTeal(tealApprovalCode: string, tealClearCode: string, args: any[], localInts?: number, localBytes?: number, globalInts?: number, globalBytes?: number, optionalFields?: AlgonautTransactionFields): Promise<AlgonautAtomicTransaction>;
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
    deployTealWithLSig(lsig: algosdkTypeRef.LogicSigAccount, tealApprovalCode: string, tealClearCode: string, noteText: string, createArgs: string[], accounts: string[], localInts: number, localBytes: number, globalInts: number, globalBytes: number): Promise<AlgonautTransactionStatus>;
    /**
     * Compiles TEAL source via [algodClient.compile](https://py-algorand-sdk.readthedocs.io/en/latest/algosdk/v2client/algod.html#algosdk.v2client.algod.AlgodClient.compile)
     * @param programSource source to compile
     * @returns Promise resolving to Buffer of compiled bytes
     */
    compileProgram(programSource: string): Promise<Uint8Array>;
    /**
     * Sends ALGO from own account to `toAddress`.
     *
     * @param toAddress - address to send to
     * @param amount - amount of Algo to send
     * @param note - note to attach to transaction
     * @returns Promise resolving to transaction status
     */
    sendAlgo(toAddress: string, amount: number, note?: string): Promise<AlgonautTransactionStatus>;
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
     *
     * @param applicationIndex - the applications index
     */
    getAppGlobalState(applicationIndex: number, creatorAddress: string): Promise<AlgonautAppState>;
    /**
     *
     * @param applicationIndex the applications index
     */
    getAppLocalState(applicationIndex: number): Promise<AlgonautAppState>;
    atomicOptInApp(appIndex: number, appArgs: any[], optionalFields?: AlgonautTransactionFields): Promise<AlgonautAtomicTransaction>;
    atomicOptInASA(assetIndex: number): Promise<AlgonautAtomicTransaction>;
    atomicCallApp(appIndex: number, args: any[], optionalFields?: AlgonautTransactionFields): Promise<AlgonautAtomicTransaction>;
    atomicCallAppWithLSig(appIndex: number, args: any[], logicSig: algosdkTypeRef.LogicSigAccount, optionalFields?: AlgonautTransactionFields): Promise<AlgonautAtomicTransaction>;
    atomicAssetTransfer(toAddress: string, amount: number | bigint, asset: number): Promise<AlgonautAtomicTransaction>;
    atomicAssetTransferWithLSig(toAddress: string, amount: number | bigint, asset: number, logicSig: algosdkTypeRef.LogicSigAccount): Promise<AlgonautAtomicTransaction>;
    atomicPayment(toAddress: string, amount: number | bigint, optionalTxParams?: AlgonautTransactionFields): Promise<AlgonautAtomicTransaction>;
    atomicPaymentWithLSig(toAddress: string, amount: number | bigint, logicSig: algosdkTypeRef.LogicSigAccount, optionalTxParams?: AlgonautTransactionFields): Promise<AlgonautAtomicTransaction>;
    /**
     * run atomic takes an array of transactions to run in order, each
     * of the atomic transaction methods needs to return an object containing
     * the transaction and the signed transaction
     * 	[ atomicSendASA(),
            atomicSendAlgo(),
            atomicCallApp()]
     * @param transactions a Uint8Array of ALREADY SIGNED transactions
     */
    sendAtomicTransaction(transactions: AlgonautAtomicTransaction[]): Promise<AlgonautTransactionStatus>;
    /**
     * Interally used to determine how to sign transactions on more generic functions (e.g. {@link deployFromTeal})
     * @returns true if we are signing transactions with WalletConnect, false otherwise
     */
    usingWalletConnect(): boolean;
    /**
     * Prepare one or more transactions for wallet connect signature
     *
     * @param transactions one or more atomic transaction objects
     * @returns an array of Transactions
     */
    createWalletConnectTransactions(transactions: AlgonautAtomicTransaction[]): Promise<algosdkTypeRef.Transaction[]>;
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
     * Sends one or multiple transactions via WalletConnect, prompting the user to approve transaction on their phone.
     *
     * @remarks
     * Returns the results of `algodClient.pendingTransactionInformation` in `AlgonautTransactionStatus.meta`.
     * This is used to get the `application-index` from a `atomicDeployFromTeal` function, among other things.
     *
     * @param walletTxns Array of transactions to send
     * @returns Promise resolving to transaction status
     */
    sendWalletConnectTxns(walletTxns: any[]): Promise<AlgonautTransactionStatus>;
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
