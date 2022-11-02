import type algosdk from 'algosdk';
import type { ApplicationStateSchema } from 'algosdk/dist/types/src/client/v2/algod/models/types';
export declare type AlgonautConfig = {
    BASE_SERVER: string;
    INDEX_SERVER?: string;
    LEDGER: string;
    PORT: string;
    API_TOKEN: any;
    SIGNING_MODE?: 'local' | 'walletconnect' | 'algosigner' | 'inkey';
    INKEY_SRC?: string;
    INKEY_ALIGN?: 'center' | 'left' | 'right';
};
export interface AlgonautStateData {
    key: string;
    value: string | number | bigint;
    address: string;
}
export interface AlgonautContractSchema {
    localInts: number;
    localBytes: number;
    globalInts: number;
    globalBytes: number;
}
export interface AlgonautDeployArguments {
    tealApprovalCode: string;
    tealClearCode: string;
    appArgs: any[];
    schema: AlgonautContractSchema;
    optionalFields?: AlgonautTransactionFields;
}
export interface AlgonautUpdateAppArguments {
    appIndex: number;
    tealApprovalCode: string;
    tealClearCode: string;
    appArgs: any[];
    optionalFields?: AlgonautTransactionFields;
}
export interface AlgonautDeleteAppArguments {
    optionalFields?: AlgonautTransactionFields;
}
export interface AlgonautLsigDeployArguments extends AlgonautDeployArguments {
    lsig: algosdk.LogicSigAccount;
    noteText?: string;
}
export interface AlgonautAppStateEncoded {
    key: string;
    value: {
        bytes: string;
        type: number;
        uint: number;
    };
}
export interface AlgonautGetApplicationResponse {
    id: number;
    params: {
        'approval-program': string;
        'clear-state-program': string;
        creator: string;
        extraProgramPages?: number;
        'global-state'?: AlgonautAppStateEncoded[];
        'global-state-schema'?: ApplicationStateSchema;
        'local-state-schema'?: ApplicationStateSchema;
    };
}
export interface AlgonautAppState {
    index: number;
    hasState: boolean;
    creatorAddress: string;
    globals: AlgonautStateData[];
    locals: AlgonautStateData[];
}
export interface AlgonautCallAppArguments {
    appIndex: number;
    appArgs: any[];
    optionalFields?: AlgonautTransactionFields;
}
export interface AlgonautLsigCallAppArguments extends AlgonautCallAppArguments {
    lsig: algosdk.LogicSigAccount;
}
export interface AlgonautCreateAssetArguments {
    assetName: string;
    symbol: string;
    metaBlock: string;
    decimals: number;
    amount: number;
    assetURL?: string;
    defaultFrozen?: boolean;
    assetMetadataHash?: string;
    clawback?: string;
    manager?: string;
    reserve?: string;
    freeze?: string;
    rekeyTo?: string;
    optionalFields?: AlgonautTransactionFields;
}
export interface AlgonautDestroyAssetArguments {
    rekeyTo?: string;
    optionalFields?: AlgonautTransactionFields;
}
export interface AlgonautSendAssetArguments {
    to: string;
    assetIndex: number;
    amount: number | bigint;
    optionalFields?: AlgonautTransactionFields;
}
export interface AlgonautLsigSendAssetArguments extends AlgonautSendAssetArguments {
    lsig: algosdk.LogicSigAccount;
}
export interface AlgonautPaymentArguments {
    to: string;
    amount: number | bigint;
    note?: string;
    optionalFields?: AlgonautTransactionFields;
}
export interface AlgonautLsigPaymentArguments extends AlgonautPaymentArguments {
    lsig: algosdk.LogicSigAccount;
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
    rawError?: any;
};
export declare type AlgonautTransactionStatus = {
    status: 'success' | 'fail' | 'rejected';
    message: string;
    index?: number;
    txId: string;
    error?: Error;
    meta?: any;
    createdIndex?: number;
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
    suggestedParams?: algosdk.SuggestedParams;
};
export declare type AlgonautAtomicTransaction = {
    transaction: algosdk.Transaction;
    transactionSigner: algosdk.Account | algosdk.LogicSigAccount;
    isLogigSig: boolean;
};
export declare type InkeySignTxnResponse = {
    success: boolean;
    reject?: boolean;
    error?: any;
    signedTxns?: Uint8Array[] | Uint8Array;
};
