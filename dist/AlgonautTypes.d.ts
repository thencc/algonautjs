import algosdk from "algosdk";
export interface AlgonautConfig {
    BASE_SERVER: string;
    LEDGER: string;
    PORT: string;
    API_TOKEN: any;
}
export declare type AlgonautError = {
    message: string;
    rawError: Error;
};
export declare type AlgonautTransactionStatus = {
    status: 'success' | 'fail';
    message: string;
    error?: Error;
};
export declare type AlgonautWallet = {
    address: string;
    mnemonic: string;
};
export declare type AlgonautTransactionParams = {
    addresses?: string[];
    foreignApps?: number[];
    assets?: number[];
    reKeyTo?: string;
    note?: string;
    closeRemainderTo?: string;
    manager?: string;
    freeze?: string;
    clawback?: string;
    reserve?: string;
};
export declare type AlgonautAtomicTransaction = {
    transaction: algosdk.Transaction;
    signedTransaciton: Uint8Array;
};
