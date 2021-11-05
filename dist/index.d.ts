import algosdk from 'algosdk';
import algosdkNpm from 'algosdk';
import { AlgonautConfig, AlgonautWallet, AlgonautTransactionStatus, AlgonautAtomicTransaction } from './AlgonautTypes';
declare global {
    interface Window {
        AlgoSigner: any;
        algosdk: typeof algosdkNpm;
    }
}
export default class Algonaut {
    algodClient: algosdk.Algodv2;
    indexerClient: algosdk.Indexer;
    account: algosdk.Account | undefined;
    address: string | undefined;
    sKey: Uint8Array | undefined;
    mnemonic: string | undefined;
    constructor(config: AlgonautConfig);
    checkStatus(): Promise<any>;
    /** if you already have an account, set it here
     * @param account an algosdk account already created
     *
     */
    setAccount(account: algosdk.Account): void;
    createWallet(): AlgonautWallet;
    recoverAccount(mnemonic: string): any;
    /**
     * General purpose method to await transaction confirmation
     * @param txId a string id of the transacion you want to watch
     * @param limitDelta how many rounds to wait, defaults to
     */
    waitForConfirmation(txId: string, limitDelta?: number): Promise<AlgonautTransactionStatus>;
    /**
     * Opt-in for the Stacks token ASA
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
    processArgs(args: any[]): Uint8Array[];
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
    sendASA(receiverAddress: string, assetIndex: number, amount: number | bigint): Promise<AlgonautTransactionStatus>;
    /**
     * Call a "method" on a stateful contract.  In TEAL, you're really giving
     * an argument which branches to a specific place and reads the other args
     * @param contractIndex
     * @param args an array of arguments for the call
     * @param accounts an array of addresses to send with the app call
     * @param apps an array of "foreign apps" to send with the app call
     */
    callStatefulApp(appIndex: number, args: any[], accounts?: string[], apps?: number[], assets?: number[]): Promise<AlgonautTransactionStatus>;
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
    deployTealWithLSig(lsig: algosdkNpm.LogicSigAccount, tealApprovalCode: string, tealClearCode: string, noteText: string, createArgs: string[], accounts: string[], localInts: number, localBytes: number, globalInts: number, globalBytes: number): Promise<AlgonautTransactionStatus>;
    compileProgram(programSource: string): Promise<Uint8Array>;
    sendAlgo(toAddress: string, amount: number, note?: string): Promise<AlgonautTransactionStatus>;
    /**
     * Function to determine if the AlgoSigner extension is installed.
     * @returns Boolean
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
    /**
     * Checks Algo balance of account
     * @param address Wallet of balance to check
     * @returns Promise resolving to Algo balance
     */
    getAlgoBalance(address: string): Promise<any>;
    /**
     * Checks token balance of account
     * @param address Wallet of balance to check
     * @param assetIndex the ASA index
     * @returns Promise resolving to token balance
     */
    getTokenBalance(address: string, assetIndex: number): Promise<number>;
    /**
     * Checks if account has at least one token (before playback)
     * Keeping this here in case this is a faster/less expensive operation than checking actual balance
     * @param address Address to check
     * @param assetIndex the index of the ASA
     */
    accountHasTokens(address: string, assetIndex: number): Promise<any>;
    atomicAssetTransfer(toAddress: string, amount: number | bigint, asset: number): Promise<AlgonautAtomicTransaction>;
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
}
