import * as _thencc_any_wallet from '@thencc/any-wallet';
import { WalletInitParamsObj, WALLET_ID, Account as Account$1 } from '@thencc/any-wallet';
export * from '@thencc/any-wallet';
import { Buffer } from 'buffer';
import algosdk, { LogicSigAccount, SuggestedParams, Transaction, Account, MultisigMetadata, Algodv2 } from 'algosdk';
import { ApplicationStateSchema } from 'algosdk/dist/types/client/v2/algod/models/types';

type AlgonautConfig = {
    libConfig?: {
        disableLogs?: boolean;
    };
    nodeConfig?: {
        BASE_SERVER: string;
        INDEX_SERVER?: string;
        LEDGER: string;
        PORT: string;
        API_TOKEN: any;
    };
    initWallets?: WalletInitParamsObj;
};
interface AlgonautStateData {
    key: string;
    value: string | number | bigint;
    address: string;
}
interface AlgonautContractSchema {
    localInts: number;
    localBytes: number;
    globalInts: number;
    globalBytes: number;
}
interface AlgonautDeployArguments {
    tealApprovalCode: string;
    tealClearCode: string;
    appArgs: any[];
    schema: AlgonautContractSchema;
    optionalFields?: AlgonautTransactionFields;
}
interface AlgonautUpdateAppArguments {
    appIndex: number;
    tealApprovalCode: string;
    tealClearCode: string;
    appArgs: any[];
    optionalFields?: AlgonautTransactionFields;
}
interface AlgonautDeleteAppArguments {
    optionalFields?: AlgonautTransactionFields;
}
interface AlgonautLsigDeployArguments extends AlgonautDeployArguments {
    lsig: LogicSigAccount;
    noteText?: string;
}
interface AlgonautAppStateEncoded {
    key: string;
    value: {
        bytes: string;
        type: number;
        uint: number;
    };
}
interface AlgonautGetApplicationResponse {
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
interface AlgonautAppState {
    index: number;
    hasState: boolean;
    creatorAddress: string;
    globals: AlgonautStateData[];
    locals: AlgonautStateData[];
}
interface AlgonautCallAppArguments {
    from?: string;
    appIndex: number;
    appArgs: any[];
    optionalFields?: AlgonautTransactionFields;
}
interface AlgonautLsigCallAppArguments extends AlgonautCallAppArguments {
    lsig: LogicSigAccount;
}
interface AlgonautCreateAssetArguments {
    from?: string;
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
interface AlgonautDestroyAssetArguments {
    rekeyTo?: string;
    optionalFields?: AlgonautTransactionFields;
}
interface AlgonautSendAssetArguments {
    to: string;
    from?: string;
    assetIndex: number;
    amount: number | bigint;
    optionalFields?: AlgonautTransactionFields;
}
interface AlgonautLsigSendAssetArguments extends AlgonautSendAssetArguments {
    lsig: LogicSigAccount;
}
interface AlgonautPaymentArguments {
    amount: number | bigint;
    to: string;
    from?: string;
    optionalFields?: AlgonautTransactionFields;
}
interface AlgonautLsigPaymentArguments extends AlgonautPaymentArguments {
    lsig: LogicSigAccount;
}
interface AlgonautTxnCallbacks {
    onSign(payload: any): void;
    onSend(payload: any): void;
    onConfirm(payload: any): void;
}
type AlgonautError = {
    message: string;
    rawError?: any;
};
type AlgonautTransactionStatus = {
    status: 'success' | 'fail' | 'rejected';
    message: string;
    index?: number;
    txId: string;
    error?: Error;
    meta?: any;
    createdIndex?: number;
};
type AlgonautWallet = {
    address: string;
    mnemonic: string;
};
type AlgonautTransactionFields = {
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
    suggestedParams?: SuggestedParams;
};
type AlgonautAtomicTransaction = {
    transaction: Transaction;
    transactionSigner: undefined | Account | LogicSigAccount;
    isLogigSig: boolean;
};
type InkeySignTxnResponse$1 = {
    success: boolean;
    reject?: boolean;
    error?: any;
    signedTxns?: Uint8Array[] | Uint8Array;
};
type TxnForSigning$1 = {
    txn: string;
    txnDecoded?: Transaction;
    isLogicSig?: boolean;
    isMultisig?: boolean;
    multisigMeta?: MultisigMetadata;
};

type AlgoTxn = Transaction;

declare class Algonaut {
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
        disableLogs?: boolean | undefined;
    } | undefined;
    sdk: typeof algosdk;
    walletState: {
        allWallets: {
            pera?: {
                id: WALLET_ID;
                metadata: {
                    id: WALLET_ID;
                    name: string;
                    icon: string;
                    chain: string;
                    pkg: string;
                };
                client: {
                    sdk: any;
                    connect: (x: any) => Promise<_thencc_any_wallet.WalletAccounts>;
                    disconnect: () => Promise<void>;
                    reconnect: (onDisconnect: () => void) => Promise<_thencc_any_wallet.WalletAccounts | null>;
                    signTransactions: (connectedAccounts: Account$1[], transactions: Uint8Array[]) => Promise<Uint8Array[]>;
                } | null;
                initParams: boolean | {
                    config?: any;
                    sdk?: any;
                };
                inited: boolean;
                initing: boolean;
                signing: boolean;
                connecting: boolean;
                loadClient: () => Promise<true>;
                unloadClient: () => Promise<void>;
                connect: (p?: any) => Promise<Account$1[]>;
                disconnect: () => Promise<void>;
                reconnect: () => Promise<void>;
                setAsActiveWallet: () => void;
                removeAccounts: () => void;
                signTransactions: (transactions: Uint8Array[]) => Promise<Uint8Array[]>;
                readonly accounts: readonly {
                    readonly walletId: WALLET_ID;
                    readonly name: string;
                    readonly address: string;
                    readonly chain: string;
                    readonly active: boolean;
                }[];
                readonly isConnected: boolean;
                readonly isActive: boolean;
                readonly activeAccount: {
                    readonly walletId: WALLET_ID;
                    readonly name: string;
                    readonly address: string;
                    readonly chain: string;
                    readonly active: boolean;
                } | undefined;
            } | undefined;
            inkey?: {
                id: WALLET_ID;
                metadata: {
                    id: WALLET_ID;
                    name: string;
                    icon: string;
                    chain: string;
                    pkg: string;
                };
                client: {
                    sdk: any;
                    connect: (x: any) => Promise<_thencc_any_wallet.WalletAccounts>;
                    disconnect: () => Promise<void>;
                    reconnect: (onDisconnect: () => void) => Promise<_thencc_any_wallet.WalletAccounts | null>;
                    signTransactions: (connectedAccounts: Account$1[], transactions: Uint8Array[]) => Promise<Uint8Array[]>;
                } | null;
                initParams: boolean | {
                    config?: any;
                    sdk?: any;
                };
                inited: boolean;
                initing: boolean;
                signing: boolean;
                connecting: boolean;
                loadClient: () => Promise<true>;
                unloadClient: () => Promise<void>;
                connect: (p?: any) => Promise<Account$1[]>;
                disconnect: () => Promise<void>;
                reconnect: () => Promise<void>;
                setAsActiveWallet: () => void;
                removeAccounts: () => void;
                signTransactions: (transactions: Uint8Array[]) => Promise<Uint8Array[]>;
                readonly accounts: readonly {
                    readonly walletId: WALLET_ID;
                    readonly name: string;
                    readonly address: string;
                    readonly chain: string;
                    readonly active: boolean;
                }[];
                readonly isConnected: boolean;
                readonly isActive: boolean;
                readonly activeAccount: {
                    readonly walletId: WALLET_ID;
                    readonly name: string;
                    readonly address: string;
                    readonly chain: string;
                    readonly active: boolean;
                } | undefined;
            } | undefined;
            myalgo?: {
                id: WALLET_ID;
                metadata: {
                    id: WALLET_ID;
                    name: string;
                    icon: string;
                    chain: string;
                    pkg: string;
                };
                client: {
                    sdk: any;
                    connect: (x: any) => Promise<_thencc_any_wallet.WalletAccounts>;
                    disconnect: () => Promise<void>;
                    reconnect: (onDisconnect: () => void) => Promise<_thencc_any_wallet.WalletAccounts | null>;
                    signTransactions: (connectedAccounts: Account$1[], transactions: Uint8Array[]) => Promise<Uint8Array[]>;
                } | null;
                initParams: boolean | {
                    config?: any;
                    sdk?: any;
                };
                inited: boolean;
                initing: boolean;
                signing: boolean;
                connecting: boolean;
                loadClient: () => Promise<true>;
                unloadClient: () => Promise<void>;
                connect: (p?: any) => Promise<Account$1[]>;
                disconnect: () => Promise<void>;
                reconnect: () => Promise<void>;
                setAsActiveWallet: () => void;
                removeAccounts: () => void;
                signTransactions: (transactions: Uint8Array[]) => Promise<Uint8Array[]>;
                readonly accounts: readonly {
                    readonly walletId: WALLET_ID;
                    readonly name: string;
                    readonly address: string;
                    readonly chain: string;
                    readonly active: boolean;
                }[];
                readonly isConnected: boolean;
                readonly isActive: boolean;
                readonly activeAccount: {
                    readonly walletId: WALLET_ID;
                    readonly name: string;
                    readonly address: string;
                    readonly chain: string;
                    readonly active: boolean;
                } | undefined;
            } | undefined;
            algosigner?: {
                id: WALLET_ID;
                metadata: {
                    id: WALLET_ID;
                    name: string;
                    icon: string;
                    chain: string;
                    pkg: string;
                };
                client: {
                    sdk: any;
                    connect: (x: any) => Promise<_thencc_any_wallet.WalletAccounts>;
                    disconnect: () => Promise<void>;
                    reconnect: (onDisconnect: () => void) => Promise<_thencc_any_wallet.WalletAccounts | null>;
                    signTransactions: (connectedAccounts: Account$1[], transactions: Uint8Array[]) => Promise<Uint8Array[]>;
                } | null;
                initParams: boolean | {
                    config?: any;
                    sdk?: any;
                };
                inited: boolean;
                initing: boolean;
                signing: boolean;
                connecting: boolean;
                loadClient: () => Promise<true>;
                unloadClient: () => Promise<void>;
                connect: (p?: any) => Promise<Account$1[]>;
                disconnect: () => Promise<void>;
                reconnect: () => Promise<void>;
                setAsActiveWallet: () => void;
                removeAccounts: () => void;
                signTransactions: (transactions: Uint8Array[]) => Promise<Uint8Array[]>;
                readonly accounts: readonly {
                    readonly walletId: WALLET_ID;
                    readonly name: string;
                    readonly address: string;
                    readonly chain: string;
                    readonly active: boolean;
                }[];
                readonly isConnected: boolean;
                readonly isActive: boolean;
                readonly activeAccount: {
                    readonly walletId: WALLET_ID;
                    readonly name: string;
                    readonly address: string;
                    readonly chain: string;
                    readonly active: boolean;
                } | undefined;
            } | undefined;
            exodus?: {
                id: WALLET_ID;
                metadata: {
                    id: WALLET_ID;
                    name: string;
                    icon: string;
                    chain: string;
                    pkg: string;
                };
                client: {
                    sdk: any;
                    connect: (x: any) => Promise<_thencc_any_wallet.WalletAccounts>;
                    disconnect: () => Promise<void>;
                    reconnect: (onDisconnect: () => void) => Promise<_thencc_any_wallet.WalletAccounts | null>;
                    signTransactions: (connectedAccounts: Account$1[], transactions: Uint8Array[]) => Promise<Uint8Array[]>;
                } | null;
                initParams: boolean | {
                    config?: any;
                    sdk?: any;
                };
                inited: boolean;
                initing: boolean;
                signing: boolean;
                connecting: boolean;
                loadClient: () => Promise<true>;
                unloadClient: () => Promise<void>;
                connect: (p?: any) => Promise<Account$1[]>;
                disconnect: () => Promise<void>;
                reconnect: () => Promise<void>;
                setAsActiveWallet: () => void;
                removeAccounts: () => void;
                signTransactions: (transactions: Uint8Array[]) => Promise<Uint8Array[]>;
                readonly accounts: readonly {
                    readonly walletId: WALLET_ID;
                    readonly name: string;
                    readonly address: string;
                    readonly chain: string;
                    readonly active: boolean;
                }[];
                readonly isConnected: boolean;
                readonly isActive: boolean;
                readonly activeAccount: {
                    readonly walletId: WALLET_ID;
                    readonly name: string;
                    readonly address: string;
                    readonly chain: string;
                    readonly active: boolean;
                } | undefined;
            } | undefined;
            defly?: {
                id: WALLET_ID;
                metadata: {
                    id: WALLET_ID;
                    name: string;
                    icon: string;
                    chain: string;
                    pkg: string;
                };
                client: {
                    sdk: any;
                    connect: (x: any) => Promise<_thencc_any_wallet.WalletAccounts>;
                    disconnect: () => Promise<void>;
                    reconnect: (onDisconnect: () => void) => Promise<_thencc_any_wallet.WalletAccounts | null>;
                    signTransactions: (connectedAccounts: Account$1[], transactions: Uint8Array[]) => Promise<Uint8Array[]>;
                } | null;
                initParams: boolean | {
                    config?: any;
                    sdk?: any;
                };
                inited: boolean;
                initing: boolean;
                signing: boolean;
                connecting: boolean;
                loadClient: () => Promise<true>;
                unloadClient: () => Promise<void>;
                connect: (p?: any) => Promise<Account$1[]>;
                disconnect: () => Promise<void>;
                reconnect: () => Promise<void>;
                setAsActiveWallet: () => void;
                removeAccounts: () => void;
                signTransactions: (transactions: Uint8Array[]) => Promise<Uint8Array[]>;
                readonly accounts: readonly {
                    readonly walletId: WALLET_ID;
                    readonly name: string;
                    readonly address: string;
                    readonly chain: string;
                    readonly active: boolean;
                }[];
                readonly isConnected: boolean;
                readonly isActive: boolean;
                readonly activeAccount: {
                    readonly walletId: WALLET_ID;
                    readonly name: string;
                    readonly address: string;
                    readonly chain: string;
                    readonly active: boolean;
                } | undefined;
            } | undefined;
            mnemonic?: {
                id: WALLET_ID;
                metadata: {
                    id: WALLET_ID;
                    name: string;
                    icon: string;
                    chain: string;
                    pkg: string;
                };
                client: {
                    sdk: any;
                    connect: (x: any) => Promise<_thencc_any_wallet.WalletAccounts>;
                    disconnect: () => Promise<void>;
                    reconnect: (onDisconnect: () => void) => Promise<_thencc_any_wallet.WalletAccounts | null>;
                    signTransactions: (connectedAccounts: Account$1[], transactions: Uint8Array[]) => Promise<Uint8Array[]>;
                } | null;
                initParams: boolean | {
                    config?: any;
                    sdk?: any;
                };
                inited: boolean;
                initing: boolean;
                signing: boolean;
                connecting: boolean;
                loadClient: () => Promise<true>;
                unloadClient: () => Promise<void>;
                connect: (p?: any) => Promise<Account$1[]>;
                disconnect: () => Promise<void>;
                reconnect: () => Promise<void>;
                setAsActiveWallet: () => void;
                removeAccounts: () => void;
                signTransactions: (transactions: Uint8Array[]) => Promise<Uint8Array[]>;
                readonly accounts: readonly {
                    readonly walletId: WALLET_ID;
                    readonly name: string;
                    readonly address: string;
                    readonly chain: string;
                    readonly active: boolean;
                }[];
                readonly isConnected: boolean;
                readonly isActive: boolean;
                readonly activeAccount: {
                    readonly walletId: WALLET_ID;
                    readonly name: string;
                    readonly address: string;
                    readonly chain: string;
                    readonly active: boolean;
                } | undefined;
            } | undefined;
        };
        enabledWallets: {
            pera?: {
                id: WALLET_ID;
                metadata: {
                    id: WALLET_ID;
                    name: string;
                    icon: string;
                    chain: string;
                    pkg: string;
                };
                client: {
                    sdk: any;
                    connect: (x: any) => Promise<_thencc_any_wallet.WalletAccounts>;
                    disconnect: () => Promise<void>;
                    reconnect: (onDisconnect: () => void) => Promise<_thencc_any_wallet.WalletAccounts | null>;
                    signTransactions: (connectedAccounts: Account$1[], transactions: Uint8Array[]) => Promise<Uint8Array[]>;
                } | null;
                initParams: boolean | {
                    config?: any;
                    sdk?: any;
                };
                inited: boolean;
                initing: boolean;
                signing: boolean;
                connecting: boolean;
                loadClient: () => Promise<true>;
                unloadClient: () => Promise<void>;
                connect: (p?: any) => Promise<Account$1[]>;
                disconnect: () => Promise<void>;
                reconnect: () => Promise<void>;
                setAsActiveWallet: () => void;
                removeAccounts: () => void;
                signTransactions: (transactions: Uint8Array[]) => Promise<Uint8Array[]>;
                readonly accounts: readonly {
                    readonly walletId: WALLET_ID;
                    readonly name: string;
                    readonly address: string;
                    readonly chain: string;
                    readonly active: boolean;
                }[];
                readonly isConnected: boolean;
                readonly isActive: boolean;
                readonly activeAccount: {
                    readonly walletId: WALLET_ID;
                    readonly name: string;
                    readonly address: string;
                    readonly chain: string;
                    readonly active: boolean;
                } | undefined;
            } | undefined;
            inkey?: {
                id: WALLET_ID;
                metadata: {
                    id: WALLET_ID;
                    name: string;
                    icon: string;
                    chain: string;
                    pkg: string;
                };
                client: {
                    sdk: any;
                    connect: (x: any) => Promise<_thencc_any_wallet.WalletAccounts>;
                    disconnect: () => Promise<void>;
                    reconnect: (onDisconnect: () => void) => Promise<_thencc_any_wallet.WalletAccounts | null>;
                    signTransactions: (connectedAccounts: Account$1[], transactions: Uint8Array[]) => Promise<Uint8Array[]>;
                } | null;
                initParams: boolean | {
                    config?: any;
                    sdk?: any;
                };
                inited: boolean;
                initing: boolean;
                signing: boolean;
                connecting: boolean;
                loadClient: () => Promise<true>;
                unloadClient: () => Promise<void>;
                connect: (p?: any) => Promise<Account$1[]>;
                disconnect: () => Promise<void>;
                reconnect: () => Promise<void>;
                setAsActiveWallet: () => void;
                removeAccounts: () => void;
                signTransactions: (transactions: Uint8Array[]) => Promise<Uint8Array[]>;
                readonly accounts: readonly {
                    readonly walletId: WALLET_ID;
                    readonly name: string;
                    readonly address: string;
                    readonly chain: string;
                    readonly active: boolean;
                }[];
                readonly isConnected: boolean;
                readonly isActive: boolean;
                readonly activeAccount: {
                    readonly walletId: WALLET_ID;
                    readonly name: string;
                    readonly address: string;
                    readonly chain: string;
                    readonly active: boolean;
                } | undefined;
            } | undefined;
            myalgo?: {
                id: WALLET_ID;
                metadata: {
                    id: WALLET_ID;
                    name: string;
                    icon: string;
                    chain: string;
                    pkg: string;
                };
                client: {
                    sdk: any;
                    connect: (x: any) => Promise<_thencc_any_wallet.WalletAccounts>;
                    disconnect: () => Promise<void>;
                    reconnect: (onDisconnect: () => void) => Promise<_thencc_any_wallet.WalletAccounts | null>;
                    signTransactions: (connectedAccounts: Account$1[], transactions: Uint8Array[]) => Promise<Uint8Array[]>;
                } | null;
                initParams: boolean | {
                    config?: any;
                    sdk?: any;
                };
                inited: boolean;
                initing: boolean;
                signing: boolean;
                connecting: boolean;
                loadClient: () => Promise<true>;
                unloadClient: () => Promise<void>;
                connect: (p?: any) => Promise<Account$1[]>;
                disconnect: () => Promise<void>;
                reconnect: () => Promise<void>;
                setAsActiveWallet: () => void;
                removeAccounts: () => void;
                signTransactions: (transactions: Uint8Array[]) => Promise<Uint8Array[]>;
                readonly accounts: readonly {
                    readonly walletId: WALLET_ID;
                    readonly name: string;
                    readonly address: string;
                    readonly chain: string;
                    readonly active: boolean;
                }[];
                readonly isConnected: boolean;
                readonly isActive: boolean;
                readonly activeAccount: {
                    readonly walletId: WALLET_ID;
                    readonly name: string;
                    readonly address: string;
                    readonly chain: string;
                    readonly active: boolean;
                } | undefined;
            } | undefined;
            algosigner?: {
                id: WALLET_ID;
                metadata: {
                    id: WALLET_ID;
                    name: string;
                    icon: string;
                    chain: string;
                    pkg: string;
                };
                client: {
                    sdk: any;
                    connect: (x: any) => Promise<_thencc_any_wallet.WalletAccounts>;
                    disconnect: () => Promise<void>;
                    reconnect: (onDisconnect: () => void) => Promise<_thencc_any_wallet.WalletAccounts | null>;
                    signTransactions: (connectedAccounts: Account$1[], transactions: Uint8Array[]) => Promise<Uint8Array[]>;
                } | null;
                initParams: boolean | {
                    config?: any;
                    sdk?: any;
                };
                inited: boolean;
                initing: boolean;
                signing: boolean;
                connecting: boolean;
                loadClient: () => Promise<true>;
                unloadClient: () => Promise<void>;
                connect: (p?: any) => Promise<Account$1[]>;
                disconnect: () => Promise<void>;
                reconnect: () => Promise<void>;
                setAsActiveWallet: () => void;
                removeAccounts: () => void;
                signTransactions: (transactions: Uint8Array[]) => Promise<Uint8Array[]>;
                readonly accounts: readonly {
                    readonly walletId: WALLET_ID;
                    readonly name: string;
                    readonly address: string;
                    readonly chain: string;
                    readonly active: boolean;
                }[];
                readonly isConnected: boolean;
                readonly isActive: boolean;
                readonly activeAccount: {
                    readonly walletId: WALLET_ID;
                    readonly name: string;
                    readonly address: string;
                    readonly chain: string;
                    readonly active: boolean;
                } | undefined;
            } | undefined;
            exodus?: {
                id: WALLET_ID;
                metadata: {
                    id: WALLET_ID;
                    name: string;
                    icon: string;
                    chain: string;
                    pkg: string;
                };
                client: {
                    sdk: any;
                    connect: (x: any) => Promise<_thencc_any_wallet.WalletAccounts>;
                    disconnect: () => Promise<void>;
                    reconnect: (onDisconnect: () => void) => Promise<_thencc_any_wallet.WalletAccounts | null>;
                    signTransactions: (connectedAccounts: Account$1[], transactions: Uint8Array[]) => Promise<Uint8Array[]>;
                } | null;
                initParams: boolean | {
                    config?: any;
                    sdk?: any;
                };
                inited: boolean;
                initing: boolean;
                signing: boolean;
                connecting: boolean;
                loadClient: () => Promise<true>;
                unloadClient: () => Promise<void>;
                connect: (p?: any) => Promise<Account$1[]>;
                disconnect: () => Promise<void>;
                reconnect: () => Promise<void>;
                setAsActiveWallet: () => void;
                removeAccounts: () => void;
                signTransactions: (transactions: Uint8Array[]) => Promise<Uint8Array[]>;
                readonly accounts: readonly {
                    readonly walletId: WALLET_ID;
                    readonly name: string;
                    readonly address: string;
                    readonly chain: string;
                    readonly active: boolean;
                }[];
                readonly isConnected: boolean;
                readonly isActive: boolean;
                readonly activeAccount: {
                    readonly walletId: WALLET_ID;
                    readonly name: string;
                    readonly address: string;
                    readonly chain: string;
                    readonly active: boolean;
                } | undefined;
            } | undefined;
            defly?: {
                id: WALLET_ID;
                metadata: {
                    id: WALLET_ID;
                    name: string;
                    icon: string;
                    chain: string;
                    pkg: string;
                };
                client: {
                    sdk: any;
                    connect: (x: any) => Promise<_thencc_any_wallet.WalletAccounts>;
                    disconnect: () => Promise<void>;
                    reconnect: (onDisconnect: () => void) => Promise<_thencc_any_wallet.WalletAccounts | null>;
                    signTransactions: (connectedAccounts: Account$1[], transactions: Uint8Array[]) => Promise<Uint8Array[]>;
                } | null;
                initParams: boolean | {
                    config?: any;
                    sdk?: any;
                };
                inited: boolean;
                initing: boolean;
                signing: boolean;
                connecting: boolean;
                loadClient: () => Promise<true>;
                unloadClient: () => Promise<void>;
                connect: (p?: any) => Promise<Account$1[]>;
                disconnect: () => Promise<void>;
                reconnect: () => Promise<void>;
                setAsActiveWallet: () => void;
                removeAccounts: () => void;
                signTransactions: (transactions: Uint8Array[]) => Promise<Uint8Array[]>;
                readonly accounts: readonly {
                    readonly walletId: WALLET_ID;
                    readonly name: string;
                    readonly address: string;
                    readonly chain: string;
                    readonly active: boolean;
                }[];
                readonly isConnected: boolean;
                readonly isActive: boolean;
                readonly activeAccount: {
                    readonly walletId: WALLET_ID;
                    readonly name: string;
                    readonly address: string;
                    readonly chain: string;
                    readonly active: boolean;
                } | undefined;
            } | undefined;
            mnemonic?: {
                id: WALLET_ID;
                metadata: {
                    id: WALLET_ID;
                    name: string;
                    icon: string;
                    chain: string;
                    pkg: string;
                };
                client: {
                    sdk: any;
                    connect: (x: any) => Promise<_thencc_any_wallet.WalletAccounts>;
                    disconnect: () => Promise<void>;
                    reconnect: (onDisconnect: () => void) => Promise<_thencc_any_wallet.WalletAccounts | null>;
                    signTransactions: (connectedAccounts: Account$1[], transactions: Uint8Array[]) => Promise<Uint8Array[]>;
                } | null;
                initParams: boolean | {
                    config?: any;
                    sdk?: any;
                };
                inited: boolean;
                initing: boolean;
                signing: boolean;
                /**
                 * Signs a transaction or multiple w the correct wallet according to AW (does not send / submit txn(s) to network)
                 * @param txnOrTxns Either an array of atomic transactions or a single transaction to sign
                 * @param signedTxns array of
                 * @returns Promise resolving to AlgonautTransactionStatus
                 */
                connecting: boolean;
                loadClient: () => Promise<true>;
                unloadClient: () => Promise<void>;
                connect: (p?: any) => Promise<Account$1[]>;
                disconnect: () => Promise<void>;
                reconnect: () => Promise<void>;
                setAsActiveWallet: () => void;
                removeAccounts: () => void;
                signTransactions: (transactions: Uint8Array[]) => Promise<Uint8Array[]>;
                readonly accounts: readonly {
                    readonly walletId: WALLET_ID;
                    readonly name: string;
                    readonly address: string;
                    readonly chain: string;
                    readonly active: boolean;
                }[];
                readonly isConnected: boolean;
                readonly isActive: boolean;
                readonly activeAccount: {
                    readonly walletId: WALLET_ID;
                    readonly name: string;
                    readonly address: string;
                    readonly chain: string;
                    readonly active: boolean;
                } | undefined;
            } | undefined;
        } | null;
        stored: {
            version: number;
            connectedAccounts: {
                walletId: WALLET_ID;
                name: string;
                address: string;
                chain: string;
                active: boolean;
            }[];
            activeAccount: {
                walletId: WALLET_ID;
                name: string;
                address: string;
                chain: string;
                active: boolean;
            } | null;
        };
        activeAddress: string;
        activeAccount: {
            readonly walletId: WALLET_ID;
            readonly name: string;
            readonly address: string;
            readonly chain: string;
            readonly active: boolean;
        } | null;
        connectedAccounts: readonly {
            readonly walletId: WALLET_ID;
            readonly name: string;
            readonly address: string;
            readonly chain: string;
            readonly active: boolean;
        }[];
        activeWalletId: WALLET_ID | null;
        activeWallet: {
            id: WALLET_ID;
            metadata: {
                id: WALLET_ID;
                name: string;
                icon: string;
                chain: string;
                pkg: string;
            };
            client: {
                sdk: any;
                connect: (x: any) => Promise<_thencc_any_wallet.WalletAccounts>;
                disconnect: () => Promise<void>;
                reconnect: (onDisconnect: () => void) => Promise<_thencc_any_wallet.WalletAccounts | null>;
                signTransactions: (connectedAccounts: Account$1[], transactions: Uint8Array[]) => Promise<Uint8Array[]>;
            } | null;
            initParams: boolean | {
                config?: any;
                sdk?: any;
            };
            inited: boolean;
            initing: boolean;
            signing: boolean;
            connecting: boolean;
            loadClient: () => Promise<true>;
            unloadClient: () => Promise<void>;
            connect: (p?: any) => Promise<Account$1[]>;
            disconnect: () => Promise<void>;
            reconnect: () => Promise<void>;
            setAsActiveWallet: () => void;
            removeAccounts: () => void;
            signTransactions: (transactions: Uint8Array[]) => Promise<Uint8Array[]>;
            readonly accounts: readonly {
                readonly walletId: WALLET_ID;
                readonly name: string;
                readonly address: string;
                readonly chain: string;
                readonly active: boolean;
            }[];
            readonly isConnected: boolean;
            readonly isActive: boolean;
            readonly activeAccount: {
                readonly walletId: WALLET_ID;
                readonly name: string;
                /**
                 * Decodes a Base64-encoded Uint8 Algorand address and returns a string
                 * @param encoded An encoded Algorand address
                 * @returns Decoded address
                 */
                readonly address: string;
                readonly chain: string;
                readonly active: boolean;
            } | undefined;
        } | undefined;
        isSigning: boolean;
    };
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
            requests: FrameBusRequestsMap;
            initSrc(src?: string | undefined, align?: any): Promise<void>;
            showFrame(routepath?: string | undefined): void;
            hideFrame(): void;
            setHeight(height: number, unit?: string | undefined): void;
            destroy(): void;
            isReady(): Promise<boolean>;
            setOnDisconnect(f: any): void;
            onDisconnect(): void;
            onMessage(event: any): void;
            emit<T = undefined>(data: T extends InkeyTxMsgBase<string, any> ? T : InkeyTxPostMsgDefault): T extends InkeyTxMsgBase<string, any> ? T : InkeyTxPostMsgDefault;
            emitAsync<PromReturn, T_1 = undefined>(data: T_1 extends InkeyTxMsgBase<string, any> ? T_1 : InkeyTxPostMsgDefault): Promise<PromReturn>;
            insertStyles(css: string): void;
            removeStyles(): void;
        };
        connect(payload?: any): Promise<InkeyAccount[]>;
        disconnect(): Promise<InkeyResponseBase>;
        show(routepath?: string | undefined): void;
        hide(): void;
        ping<R = any, T_2 = undefined>(data: any, options?: {
            showFrame?: boolean | undefined;
        } | undefined): Promise<R>;
        signTxnsUint8Array(txns: Uint8Array[], connectedAccounts?: InkeyAccount[] | undefined): Promise<InkeySignTxnResponse>;
        signTxns(txns: string[] | TxnForSigning[], connectedAccounts?: InkeyAccount[] | undefined): Promise<InkeySignTxnResponse>;
    } | null;
    inkeyLoading: boolean;
    inkeyLoaded: boolean;
    account: {
        readonly walletId: WALLET_ID;
        readonly name: string;
        readonly address: string;
        readonly chain: string;
        readonly active: boolean;
    } | null;
    get connectedAccounts(): readonly {
        readonly walletId: WALLET_ID;
        readonly name: string;
        readonly address: string;
        readonly chain: string;
        readonly active: boolean;
    }[];
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
    setLibConfig(libConfig?: AlgonautConfig['libConfig']): void;
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
    setActiveAccount: (acct: Account$1) => void;
    enableWallets(walletInitParams?: AlgonautConfig['initWallets']): void;
    /**
     * @deprecated use .connect() with mnemonic arg
     * Recovers account from mnemonic
     *  (helpful for rapid development but overall very insecure unless on server-side)
     * @param mnemonic Mnemonic associated with Algonaut account
     * @returns If mnemonic is valid, it returns the account (address, chain). Otherwise, throws an error.
     */
    mnemonicConnect(mnemonic: string): Promise<Account$1[]>;
    /**
     * @deprecated use .connect or loop through enabled wallets' methods
     */
    inkeyConnect(): Promise<Account$1[]>;
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
    getInkeyClientSdk(): Promise<{
        frameBus: {
            ready: boolean;
            initing: boolean;
            destroying: boolean;
            __v_skip: boolean;
            walEl: HTMLIFrameElement | null;
            walElContainer: any;
            walWin: Window | null;
            onMsgHandler: ((event: any) => void) | null;
            requests: FrameBusRequestsMap;
            initSrc(src?: string | undefined, align?: any): Promise<void>;
            showFrame(routepath?: string | undefined): void;
            hideFrame(): void;
            setHeight(height: number, unit?: string | undefined): void;
            destroy(): void;
            isReady(): Promise<boolean>;
            setOnDisconnect(f: any): void;
            onDisconnect(): void;
            onMessage(event: any): void;
            emit<T = undefined>(data: T extends InkeyTxMsgBase<string, any> ? T : InkeyTxPostMsgDefault): T extends InkeyTxMsgBase<string, any> ? T : InkeyTxPostMsgDefault;
            emitAsync<PromReturn, T_1 = undefined>(data: T_1 extends InkeyTxMsgBase<string, any> ? T_1 : InkeyTxPostMsgDefault): Promise<PromReturn>;
            insertStyles(css: string): void;
            removeStyles(): void;
        };
        connect(payload?: any): Promise<InkeyAccount[]>;
        disconnect(): Promise<InkeyResponseBase>;
        show(routepath?: string | undefined): void;
        hide(): void;
        ping<R = any, T_2 = undefined>(data: any, options?: {
            showFrame?: boolean | undefined;
        } | undefined): Promise<R>;
        signTxnsUint8Array(txns: Uint8Array[], connectedAccounts?: InkeyAccount[] | undefined): Promise<InkeySignTxnResponse>;
        signTxns(txns: string[] | TxnForSigning[], connectedAccounts?: InkeyAccount[] | undefined): Promise<InkeySignTxnResponse>;
    }>;
    /**
     * Connects a wallet to be used as algonaut.account. uses:
     * 	- the SINGLE passed in init params for the specified wallet
     *  - or, the SINGLE enabled wallet IF 1 wallet is enabled (as is the default. just inkey)
     * FAILs and throws when multiple init params are passed in or multiple wallets are enabled when nothing is passed in (since it doesnt know which to connect up)
     */
    connect(initWallets?: WalletInitParamsObj): Promise<Account$1[]>;
    /**
     * disconnects
     * 	- the active wallet IF no arg passed in
     * 	- all the wallets IF "true" is passed in as an arg
     * 	- or, specific wallets if an array of wallet ids is passed in. (ex: ["inkey", "algosigner", "mnemonic"] )
     */
    disconnect(wIds?: WALLET_ID[] | true): Promise<void>;
    disconnectAll(): void;
    reconnect(): void;
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
    recoverAccount(mnemonic: string): Account;
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

declare const buffer: BufferConstructor;

export { AlgoTxn, Algonaut, AlgonautAppState, AlgonautAppStateEncoded, AlgonautAtomicTransaction, AlgonautCallAppArguments, AlgonautConfig, AlgonautContractSchema, AlgonautCreateAssetArguments, AlgonautDeleteAppArguments, AlgonautDeployArguments, AlgonautDestroyAssetArguments, AlgonautError, AlgonautGetApplicationResponse, AlgonautLsigCallAppArguments, AlgonautLsigDeployArguments, AlgonautLsigPaymentArguments, AlgonautLsigSendAssetArguments, AlgonautPaymentArguments, AlgonautSendAssetArguments, AlgonautStateData, AlgonautTransactionFields, AlgonautTransactionStatus, AlgonautTxnCallbacks, AlgonautUpdateAppArguments, AlgonautWallet, InkeySignTxnResponse$1 as InkeySignTxnResponse, TxnForSigning$1 as TxnForSigning, buffer, Algonaut as default };
