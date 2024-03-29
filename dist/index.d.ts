/// <reference types="node" />
import { Buffer } from 'buffer';
import algosdk, { Account as AlgosdkAccount, Algodv2, LogicSigAccount, Transaction } from 'algosdk';
import type { AlgonautConfig, AlgonautWallet, AlgonautTransactionStatus, AlgonautAtomicTransaction, AlgonautTransactionFields, AlgonautAppState, AlgonautStateData, AlgonautError, AlgonautTxnCallbacks, AlgonautCreateAssetArguments, AlgonautSendAssetArguments, AlgonautCallAppArguments, AlgonautDeployArguments, AlgonautLsigDeployArguments, AlgonautLsigCallAppArguments, AlgonautLsigSendAssetArguments, AlgonautPaymentArguments, AlgonautLsigPaymentArguments, AlgonautUpdateAppArguments, AlgonautAppStateEncoded } from './AlgonautTypes';
export * from './AlgonautTypes';
export type AlgoTxn = Transaction;
import { AnyWalletState } from '@thencc/any-wallet';
import type { Account } from '@thencc/any-wallet';
export * from '@thencc/any-wallet';
import type { InkeySdk } from '@thencc/inkey-client-js';
export declare class Algonaut {
    algodClient: Algodv2;
    indexerClient: algosdk.Indexer | undefined;
    nodeConfig: {
        BASE_SERVER: string;
        INDEX_SERVER?: string | undefined;
        LEDGER: string;
        PORT: string;
        API_TOKEN: any;
    };
    libConfig: {
        disableLogs: boolean;
    };
    sdk: typeof algosdk;
    walletState: AnyWalletState;
    inkeyClientSdk: {
        frameBus: {
            ready: boolean;
            initing: boolean;
            destroying: boolean;
            __v_skip: boolean;
            walEl: HTMLIFrameElement | null;
            walElContainer: any;
            walWin: Window | null;
            onMsgHandler: ((event: any) => void) | null;
            requests: import("@thencc/inkey-types").FrameBusRequestsMap;
            initSrc(src?: string | undefined, align?: "center" | "left" | "right" | undefined, styles?: import("@thencc/inkey-types").InkeyStyleObj | undefined): Promise<void>;
            showFrame(routepath?: string | undefined): void;
            hideFrame(): void;
            setHeight(height: number, unit?: string | undefined): void;
            destroy(): void;
            isReady(): Promise<boolean>;
            setOnDisconnect(f: any): void;
            onDisconnect(): void;
            onMessage(event: import("@thencc/inkey-types").RxEvents | import("@thencc/inkey-types").TxEvents): void;
            emit<T = undefined>(data: T extends import("@thencc/inkey-types").InkeyTxMsgBase<string, any> ? T : import("@thencc/inkey-types").InkeyTxPostMsgDefault): T extends import("@thencc/inkey-types").InkeyTxMsgBase<string, any> ? T : import("@thencc/inkey-types").InkeyTxPostMsgDefault;
            emitAsync<PromReturn, T_1 = undefined>(data: T_1 extends import("@thencc/inkey-types").InkeyTxMsgBase<string, any> ? T_1 : import("@thencc/inkey-types").InkeyTxPostMsgDefault): Promise<PromReturn>;
            insertStyles(css: string): void;
            removeStyles(): void;
        };
        connect(payload?: {
            siteName?: string | undefined;
            connectedAccounts?: import("@thencc/inkey-types").InkeyAccount[] | undefined;
        } | undefined): Promise<import("@thencc/inkey-types").InkeyAccount[]>;
        disconnect(): Promise<import("@thencc/inkey-types").InkeyResponseBase>;
        show(routepath?: string | undefined): void;
        hide(): void;
        ping<R = any, T_2 = undefined>(data: any, options?: {
            showFrame?: boolean | undefined;
        } | undefined): Promise<R>;
        signTxnsUint8Array(txns: Uint8Array[], connectedAccounts?: import("@thencc/inkey-types").InkeyAccount[] | undefined): Promise<import("@thencc/inkey-types").InkeySignTxnResponse>;
        signTxns(txns: string[] | import("@thencc/inkey-types").TxnForSigning[], connectedAccounts?: import("@thencc/inkey-types").InkeyAccount[] | undefined): Promise<import("@thencc/inkey-types").InkeySignTxnResponse>;
    } | null;
    inkeyLoading: boolean;
    inkeyLoaded: boolean;
    account: Account | null;
    get connectedAccounts(): Account[];
    /**
     * connects the given wallet + optional init params
     * @argument walletId of which wallet type to connect
     * @returns an array of connected accounts
     */
    connect: typeof this.walletState.connectWallet;
    disconnect: typeof this.walletState.disconnectWallet;
    disconnectAll: typeof this.walletState.disconnectAllWallets;
    setActiveAccount: typeof this.walletState.setAsActiveAccount;
    subscribeToAccountChanges: typeof this.walletState.subscribeToAccountChanges;
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
    constructor(config?: AlgonautConfig);
    initAwState(config?: AlgonautConfig): void;
    setLibConfig(config?: AlgonautConfig): void;
    /**
     * checks if config obj is valid for use
     * @param config algonaut config for network + signing mode
     * @returns boolean. true is good.
     */
    isValidNodeConfig(nodeConfig?: AlgonautConfig['nodeConfig']): boolean;
    /**
     * sets config for use (new algod, indexerClient, etc)
     * @param config algonaut config for network + signing mode
     * 		- will throw Error if config is lousy
     */
    setNodeConfig(nodeConfig?: AlgonautConfig['nodeConfig'] | 'mainnet' | 'testnet'): void;
    /**
     * @returns nodeConfig object or `false` if no nodeConfig is set
     */
    getNodeConfig(): AlgonautConfig['nodeConfig'] | boolean;
    /**
     * Checks status of Algorand network
     * @returns Promise resolving to status of Algorand network
     */
    checkStatus(): Promise<any | AlgonautError>;
    initAcctSync(): void;
    stopAcctSync(): void;
    initWallets(walletInitParams?: AlgonautConfig['initWallets']): void;
    /**
     * @deprecated use .connect() with mnemonic arg
     * Recovers account from mnemonic
     *  (helpful for rapid development but overall very insecure unless on server-side)
     * @param mnemonic Mnemonic associated with Algonaut account
     * @returns If mnemonic is valid, it returns the account (address, chain). Otherwise, throws an error.
     */
    mnemonicConnect(mnemonic: string): Promise<Account[]>;
    /**
     * @deprecated use .connect or loop through enabled wallets' methods
     */
    inkeyConnect(): Promise<Account[]>;
    /**
     * @deprecated use .disconnect or loop through enabled wallets' methods
     */
    inkeyDisconnect(): Promise<void>;
    /**
     * Shows the inkey-wallet modal
     * @returns
     */
    inkeyShow(route?: string): Promise<void>;
    /**
     * Hides the inkey-wallet modal
     * @returns
     */
    inkeyHide(): Promise<void>;
    /**
     * Loads and/or returns the inkey-wallet client sdk for whatever use. see inkey-client-js docs for more.
     * @returns
     */
    getInkeyClientSdk(): Promise<InkeySdk>;
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
    generateLogicSig(base64ProgramString: string): LogicSigAccount;
    atomicOptInAsset(assetIndex: number, optionalTxnArgs?: AlgonautTransactionFields): Promise<AlgonautAtomicTransaction>;
    /**
     * Opt-in the current account for the a token or NFT Asset.
     * @param assetIndex number of asset to opt-in to
     * @param callbacks `AlgonautTxnCallbacks`, passed to {@link sendTransaction}
     * @returns Promise resolving to confirmed transaction or error
     */
    optInAsset(assetIndex: number, callbacks?: AlgonautTxnCallbacks, optionalTxnArgs?: AlgonautTransactionFields): Promise<AlgonautTransactionStatus>;
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
     * @param args : AlgonautCreateAssetArguments obj must contain: `assetName`, `symbol`, `decimals`, `amount`.
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
    atomicDeleteAsset(assetId: number, optionalTxnArgs?: AlgonautTransactionFields): Promise<AlgonautAtomicTransaction>;
    /**
     * Deletes asset
     * @param assetId Index of the ASA to delete
     * @param callbacks optional AlgonautTxnCallbacks
     * @returns Promise resolving to confirmed transaction or error
     */
    deleteAsset(assetId: number, callbacks?: AlgonautTxnCallbacks, optionalTxnArgs?: AlgonautTransactionFields): Promise<AlgonautTransactionStatus>;
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
    atomicDeleteApp(appIndex: number, optionalTxnArgs?: AlgonautTransactionFields): Promise<AlgonautAtomicTransaction>;
    /**
     * Deletes an application from the blockchain
     * @param appIndex - ID of application
     * @param callbacks optional AlgonautTxnCallbacks
     * @returns Promise resolving to confirmed transaction or error
     */
    deleteApp(appIndex: number, callbacks?: AlgonautTxnCallbacks, optionalTxnArgs?: AlgonautTransactionFields): Promise<AlgonautTransactionStatus>;
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
     * Updates an application with `makeApplicationUpdateTxn`
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
     * Compiles TEAL source via [algodClient.compile](https://py-algorand-sdk.readthedocs.io/en/latest/algosdk/v2client/algod.html#v2client.algod.AlgodClient.compile)
     * @param programSource source to compile
     * @returns Promise resolving to Buffer of compiled bytes
     */
    compileProgram(programSource: string): Promise<Uint8Array>;
    atomicSendAlgo(args: AlgonautPaymentArguments): Promise<AlgonautAtomicTransaction>;
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
    accountHasTokens(address: string, assetIndex: number): Promise<boolean>;
    /**
     * Gets global state for an application.
     * @param applicationIndex - the applications index
     * @returns {object} object representing global state
     */
    getAppGlobalState(applicationIndex: number): Promise<any>;
    /**
     * Gets account local state for an app. Defaults to AnyWallets.activeAddress unless
     * an address is provided.
     * @param applicationIndex the applications index
     */
    getAppLocalState(applicationIndex: number, address?: string): Promise<AlgonautAppState | void>;
    atomicAssetTransferWithLSig(args: AlgonautLsigSendAssetArguments): Promise<AlgonautAtomicTransaction>;
    atomicPaymentWithLSig(args: AlgonautLsigPaymentArguments): Promise<AlgonautAtomicTransaction>;
    normalizeTxns(txnOrTxns: Transaction | AlgonautAtomicTransaction | AlgonautAtomicTransaction[]): Uint8Array[];
    /**
     * Signs a transaction or multiple w the correct wallet according to AW (does not send / submit txn(s) to network)
     * @param txnOrTxns Either an array of atomic transactions or a single transaction to sign
     * @param signedTxns array of
     * @returns Promise resolving to AlgonautTransactionStatus
     */
    signTransaction(txnOrTxns: AlgonautAtomicTransaction[] | Transaction | AlgonautAtomicTransaction): Promise<Uint8Array[]>;
    /**
     * Sends a transaction or multiple w the correct wallet according to AW
     * @param txnOrTxns Either an array of atomic transactions or a single transaction to sign
     * @param callbacks Optional object with callbacks - `onSign`, `onSend`, and `onConfirm`
     * @returns Promise resolving to AlgonautTransactionStatus
     */
    sendTransaction(txnOrTxns: AlgonautAtomicTransaction[] | Transaction | AlgonautAtomicTransaction, callbacks?: AlgonautTxnCallbacks): Promise<AlgonautTransactionStatus>;
    /**
     *
     * @param str string
     * @param enc the encoding type of the string (defaults to utf8)
     * @returns string encoded as Uint8Array
     */
    toUint8Array(str: string, enc?: BufferEncoding): Uint8Array;
    /**
     * @deprecated use toUint8Array instead.
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
     * TODO add correct typing for this method
     */
    stateArrayToObject(stateArray: object[]): any;
    /**
     * Used for decoding state
     * @param encoded Base64 string
     * @returns Human-readable string
     */
    b64StrToHumanStr(encoded: string): string;
    /**
     * @deprecated Use b64StrToHumanStr instead
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
    decodeBase64UnsignedTransaction(txn: string): Transaction;
    /**
     * Describes an Algorand transaction, for display in Inkey
     * @param txn Transaction to describe
     */
    txnSummary(txn: Transaction): string;
    /**
     * Creates a wallet address + mnemonic from account's secret key.
     * Changed in 0.3: this does NOT set algonaut.account.
     * @returns AlgonautWallet Object containing `address` and `mnemonic`
     */
    createWallet(): AlgonautWallet;
    /**
     * Recovers account from mnemonic
     * Changed in 0.3: this does NOT set algonaut.account.
     * @param mnemonic Mnemonic associated with Algonaut account
     * @returns If mnemonic is valid, returns algosdk account (.addr, .sk). Otherwise, throws an error.
     */
    recoverAccount(mnemonic: string): AlgosdkAccount;
    /**
     * txn(b64) -> txnBuff (buffer)
     * @param txn base64-encoded unsigned transaction
     * @returns trransaction as buffer object
     */
    txnB64ToTxnBuff(txn: string): Buffer;
    /**
     * Converts between buff -> b64 (txns)
     * @param buff likely a algorand txn as a Uint8Array buffer
     * @returns string (like for inkey / base64 transmit use)
     */
    txnBuffToB64(buff: Uint8Array): string;
    /**
     * Does what it says on the tin.
     * @param txn algorand txn object
     * @returns string (like for inkey / base64 transmit use)
     */
    txnToStr(txn: algosdk.Transaction): string;
}
export default Algonaut;
export declare const buffer: BufferConstructor;
