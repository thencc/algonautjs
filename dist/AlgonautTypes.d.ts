import algosdk from 'algosdk';
export declare type AlgonautConfig = {
    BASE_SERVER: string;
    LEDGER: string;
    PORT: string;
    API_TOKEN: any;
    SIGNING_MODE?: 'local' | 'wallet-connect' | 'algosigner';
};
export interface AlgonautStateData {
    key: string;
    value: string | number | bigint;
    address: string;
}
export interface AlgonautAppState {
    index: number;
    hasState: boolean;
    creatorAddress: string;
    globals: AlgonautStateData[];
    locals: AlgonautStateData[];
}
export interface WalletConnectListener {
    onSessionUpdate(payload: any): void;
    onConnect(payload: any): void;
    onDisconnect(payload: any): void;
}
export interface AlgonautTxnCallbacks {
    onSign(payload: any): void;
    onSend(payload: any): void;
    onConfirm(payload: any): void;
}
export declare type AlgonautError = {
    message: string;
    rawError: Error;
};
export declare type AlgonautTransactionStatus = {
    status: 'success' | 'fail';
    message: string;
    index?: number;
    error?: Error;
    meta?: any;
};
export declare type AlgonautWallet = {
    address: string;
    mnemonic: string;
};
export declare type AlgonautTransactionFields = {
    accounts?: string[];
    applications?: number[];
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
    transactionSigner: algosdk.Account | algosdk.LogicSigAccount;
    isLogigSig: boolean;
};
