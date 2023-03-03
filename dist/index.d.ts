/// <reference types="node" />
import algosdk, { Account as AlgosdkAccount, Algodv2, LogicSigAccount, Transaction } from 'algosdk';
import type { AlgonautConfig, AlgonautWallet, AlgonautTransactionStatus, AlgonautAtomicTransaction, AlgonautTransactionFields, AlgonautAppState, AlgonautStateData, AlgonautError, AlgonautTxnCallbacks, AlgonautCreateAssetArguments, AlgonautSendAssetArguments, AlgonautCallAppArguments, AlgonautDeployArguments, AlgonautLsigDeployArguments, AlgonautLsigCallAppArguments, AlgonautLsigSendAssetArguments, AlgonautPaymentArguments, AlgonautLsigPaymentArguments, AlgonautUpdateAppArguments, AlgonautAppStateEncoded, TxnForSigning } from './AlgonautTypes';
export * from './AlgonautTypes';
export * from '@thencc/web3-wallet-handler';
export declare class Algonaut {
    algodClient: Algodv2;
    indexerClient: algosdk.Indexer | undefined;
    config: AlgonautConfig | undefined;
    sdk: typeof algosdk;
    account: algosdk.Account | undefined;
    address: string | undefined;
    mnemonic: string | undefined;
    uiLoading: boolean;
    AnyWalletState: {
        allWallets: {
            pera?: {
                id: import("@thencc/web3-wallet-handler").WALLET_ID;
                metadata: {
                    id: import("@thencc/web3-wallet-handler").WALLET_ID;
                    name: string;
                    icon: string;
                    chain: string;
                    pkg: string;
                };
                client: {
                    connect: (onDisconnect: () => void) => Promise<import("@thencc/web3-wallet-handler").Wallet>;
                    disconnect: () => Promise<void>;
                    reconnect: (onDisconnect: () => void) => Promise<import("@thencc/web3-wallet-handler").Wallet | null>;
                    signTransactions: (connectedAccounts: string[], transactions: Uint8Array[]) => Promise<Uint8Array[]>;
                } | null;
                initParams: boolean | {
                    config?: any;
                    sdk?: any;
                };
                inited: boolean;
                initing: boolean;
                signing: boolean;
                connecting: boolean;
                isReady: () => Promise<true>;
                connect: () => Promise<import("@thencc/web3-wallet-handler").Account[]>;
                disconnect: () => Promise<void>;
                reconnect: () => Promise<void>;
                setAsActiveWallet: () => void;
                removeAccounts: () => void;
                readonly accounts: readonly {
                    readonly walletId: import("@thencc/web3-wallet-handler").WALLET_ID;
                    readonly name: string;
                    readonly address: string;
                }[];
                readonly isActive: boolean;
                readonly isConnected: boolean;
            } | undefined;
            inkey?: {
                id: import("@thencc/web3-wallet-handler").WALLET_ID;
                metadata: {
                    id: import("@thencc/web3-wallet-handler").WALLET_ID;
                    name: string;
                    icon: string;
                    chain: string;
                    pkg: string;
                };
                client: {
                    connect: (onDisconnect: () => void) => Promise<import("@thencc/web3-wallet-handler").Wallet>;
                    disconnect: () => Promise<void>;
                    reconnect: (onDisconnect: () => void) => Promise<import("@thencc/web3-wallet-handler").Wallet | null>;
                    signTransactions: (connectedAccounts: string[], transactions: Uint8Array[]) => Promise<Uint8Array[]>;
                } | null;
                initParams: boolean | {
                    config?: any;
                    sdk?: any;
                };
                inited: boolean;
                initing: boolean;
                signing: boolean;
                connecting: boolean;
                isReady: () => Promise<true>;
                connect: () => Promise<import("@thencc/web3-wallet-handler").Account[]>;
                disconnect: () => Promise<void>;
                reconnect: () => Promise<void>;
                setAsActiveWallet: () => void;
                removeAccounts: () => void;
                readonly accounts: readonly {
                    readonly walletId: import("@thencc/web3-wallet-handler").WALLET_ID;
                    readonly name: string;
                    readonly address: string;
                }[];
                readonly isActive: boolean;
                readonly isConnected: boolean;
            } | undefined;
            myalgo?: {
                id: import("@thencc/web3-wallet-handler").WALLET_ID;
                metadata: {
                    id: import("@thencc/web3-wallet-handler").WALLET_ID;
                    name: string;
                    icon: string;
                    chain: string;
                    pkg: string;
                };
                client: {
                    connect: (onDisconnect: () => void) => Promise<import("@thencc/web3-wallet-handler").Wallet>;
                    disconnect: () => Promise<void>;
                    reconnect: (onDisconnect: () => void) => Promise<import("@thencc/web3-wallet-handler").Wallet | null>;
                    signTransactions: (connectedAccounts: string[], transactions: Uint8Array[]) => Promise<Uint8Array[]>;
                } | null;
                initParams: boolean | {
                    config?: any;
                    sdk?: any;
                };
                inited: boolean;
                initing: boolean;
                signing: boolean;
                connecting: boolean;
                isReady: () => Promise<true>;
                connect: () => Promise<import("@thencc/web3-wallet-handler").Account[]>;
                disconnect: () => Promise<void>;
                reconnect: () => Promise<void>;
                setAsActiveWallet: () => void;
                removeAccounts: () => void;
                readonly accounts: readonly {
                    readonly walletId: import("@thencc/web3-wallet-handler").WALLET_ID;
                    readonly name: string;
                    readonly address: string;
                }[];
                readonly isActive: boolean;
                readonly isConnected: boolean;
            } | undefined;
            algosigner?: {
                id: import("@thencc/web3-wallet-handler").WALLET_ID;
                metadata: {
                    id: import("@thencc/web3-wallet-handler").WALLET_ID;
                    name: string;
                    icon: string;
                    chain: string;
                    pkg: string;
                };
                client: {
                    connect: (onDisconnect: () => void) => Promise<import("@thencc/web3-wallet-handler").Wallet>;
                    disconnect: () => Promise<void>;
                    reconnect: (onDisconnect: () => void) => Promise<import("@thencc/web3-wallet-handler").Wallet | null>;
                    signTransactions: (connectedAccounts: string[], transactions: Uint8Array[]) => Promise<Uint8Array[]>;
                } | null;
                initParams: boolean | {
                    config?: any;
                    sdk?: any;
                };
                inited: boolean;
                initing: boolean;
                signing: boolean;
                connecting: boolean;
                isReady: () => Promise<true>;
                connect: () => Promise<import("@thencc/web3-wallet-handler").Account[]>;
                disconnect: () => Promise<void>;
                reconnect: () => Promise<void>;
                setAsActiveWallet: () => void;
                removeAccounts: () => void;
                readonly accounts: readonly {
                    readonly walletId: import("@thencc/web3-wallet-handler").WALLET_ID;
                    readonly name: string;
                    readonly address: string;
                }[];
                readonly isActive: boolean;
                readonly isConnected: boolean;
            } | undefined;
            exodus?: {
                id: import("@thencc/web3-wallet-handler").WALLET_ID;
                metadata: {
                    id: import("@thencc/web3-wallet-handler").WALLET_ID;
                    name: string;
                    icon: string;
                    chain: string;
                    pkg: string;
                };
                client: {
                    connect: (onDisconnect: () => void) => Promise<import("@thencc/web3-wallet-handler").Wallet>;
                    disconnect: () => Promise<void>;
                    reconnect: (onDisconnect: () => void) => Promise<import("@thencc/web3-wallet-handler").Wallet | null>;
                    signTransactions: (connectedAccounts: string[], transactions: Uint8Array[]) => Promise<Uint8Array[]>;
                } | null;
                initParams: boolean | {
                    config?: any;
                    sdk?: any;
                };
                inited: boolean;
                initing: boolean;
                signing: boolean;
                connecting: boolean;
                isReady: () => Promise<true>;
                connect: () => Promise<import("@thencc/web3-wallet-handler").Account[]>;
                disconnect: () => Promise<void>;
                reconnect: () => Promise<void>;
                setAsActiveWallet: () => void;
                removeAccounts: () => void;
                readonly accounts: readonly {
                    readonly walletId: import("@thencc/web3-wallet-handler").WALLET_ID;
                    readonly name: string;
                    readonly address: string;
                }[];
                readonly isActive: boolean;
                readonly isConnected: boolean;
            } | undefined;
            defly?: {
                id: import("@thencc/web3-wallet-handler").WALLET_ID;
                metadata: {
                    id: import("@thencc/web3-wallet-handler").WALLET_ID;
                    name: string;
                    icon: string;
                    chain: string;
                    pkg: string;
                };
                client: {
                    connect: (onDisconnect: () => void) => Promise<import("@thencc/web3-wallet-handler").Wallet>;
                    disconnect: () => Promise<void>;
                    reconnect: (onDisconnect: () => void) => Promise<import("@thencc/web3-wallet-handler").Wallet | null>;
                    signTransactions: (connectedAccounts: string[], transactions: Uint8Array[]) => Promise<Uint8Array[]>;
                } | null;
                initParams: boolean | {
                    config?: any;
                    sdk?: any;
                };
                inited: boolean;
                initing: boolean;
                signing: boolean;
                connecting: boolean;
                isReady: () => Promise<true>;
                connect: () => Promise<import("@thencc/web3-wallet-handler").Account[]>;
                disconnect: () => Promise<void>;
                reconnect: () => Promise<void>;
                setAsActiveWallet: () => void;
                removeAccounts: () => void;
                readonly accounts: readonly {
                    readonly walletId: import("@thencc/web3-wallet-handler").WALLET_ID;
                    readonly name: string;
                    readonly address: string;
                }[];
                readonly isActive: boolean;
                readonly isConnected: boolean;
            } | undefined;
            mnemonic?: {
                id: import("@thencc/web3-wallet-handler").WALLET_ID;
                metadata: {
                    id: import("@thencc/web3-wallet-handler").WALLET_ID;
                    name: string;
                    icon: string;
                    chain: string;
                    pkg: string;
                };
                client: {
                    connect: (onDisconnect: () => void) => Promise<import("@thencc/web3-wallet-handler").Wallet>;
                    disconnect: () => Promise<void>;
                    reconnect: (onDisconnect: () => void) => Promise<import("@thencc/web3-wallet-handler").Wallet | null>;
                    signTransactions: (connectedAccounts: string[], transactions: Uint8Array[]) => Promise<Uint8Array[]>;
                } | null;
                initParams: boolean | {
                    config?: any;
                    sdk?: any;
                };
                inited: boolean;
                initing: boolean;
                signing: boolean;
                connecting: boolean;
                isReady: () => Promise<true>;
                connect: () => Promise<import("@thencc/web3-wallet-handler").Account[]>;
                disconnect: () => Promise<void>;
                reconnect: () => Promise<void>;
                setAsActiveWallet: () => void;
                removeAccounts: () => void;
                readonly accounts: readonly {
                    readonly walletId: import("@thencc/web3-wallet-handler").WALLET_ID;
                    readonly name: string;
                    readonly address: string;
                }[];
                readonly isActive: boolean;
                readonly isConnected: boolean;
            } | undefined;
        };
        enabledWallets: {
            pera?: {
                id: import("@thencc/web3-wallet-handler").WALLET_ID;
                metadata: {
                    id: import("@thencc/web3-wallet-handler").WALLET_ID;
                    name: string;
                    icon: string;
                    chain: string;
                    pkg: string;
                };
                client: {
                    connect: (onDisconnect: () => void) => Promise<import("@thencc/web3-wallet-handler").Wallet>;
                    disconnect: () => Promise<void>;
                    reconnect: (onDisconnect: () => void) => Promise<import("@thencc/web3-wallet-handler").Wallet | null>;
                    signTransactions: (connectedAccounts: string[], transactions: Uint8Array[]) => Promise<Uint8Array[]>;
                } | null;
                initParams: boolean | {
                    config?: any;
                    sdk?: any;
                };
                inited: boolean;
                initing: boolean;
                signing: boolean;
                connecting: boolean;
                isReady: () => Promise<true>;
                connect: () => Promise<import("@thencc/web3-wallet-handler").Account[]>;
                disconnect: () => Promise<void>;
                reconnect: () => Promise<void>;
                setAsActiveWallet: () => void;
                removeAccounts: () => void;
                readonly accounts: readonly {
                    readonly walletId: import("@thencc/web3-wallet-handler").WALLET_ID;
                    readonly name: string;
                    readonly address: string;
                }[];
                readonly isActive: boolean;
                readonly isConnected: boolean;
            } | undefined;
            inkey?: {
                id: import("@thencc/web3-wallet-handler").WALLET_ID;
                metadata: {
                    id: import("@thencc/web3-wallet-handler").WALLET_ID;
                    name: string;
                    icon: string;
                    chain: string;
                    pkg: string;
                };
                client: {
                    connect: (onDisconnect: () => void) => Promise<import("@thencc/web3-wallet-handler").Wallet>;
                    disconnect: () => Promise<void>;
                    reconnect: (onDisconnect: () => void) => Promise<import("@thencc/web3-wallet-handler").Wallet | null>;
                    signTransactions: (connectedAccounts: string[], transactions: Uint8Array[]) => Promise<Uint8Array[]>;
                } | null;
                initParams: boolean | {
                    config?: any;
                    sdk?: any;
                };
                inited: boolean;
                initing: boolean;
                signing: boolean;
                connecting: boolean;
                isReady: () => Promise<true>;
                connect: () => Promise<import("@thencc/web3-wallet-handler").Account[]>;
                disconnect: () => Promise<void>;
                reconnect: () => Promise<void>;
                setAsActiveWallet: () => void;
                removeAccounts: () => void;
                readonly accounts: readonly {
                    readonly walletId: import("@thencc/web3-wallet-handler").WALLET_ID;
                    readonly name: string;
                    readonly address: string;
                }[];
                readonly isActive: boolean;
                readonly isConnected: boolean;
            } | undefined;
            myalgo?: {
                id: import("@thencc/web3-wallet-handler").WALLET_ID;
                metadata: {
                    id: import("@thencc/web3-wallet-handler").WALLET_ID;
                    name: string;
                    icon: string;
                    chain: string;
                    pkg: string;
                };
                client: {
                    connect: (onDisconnect: () => void) => Promise<import("@thencc/web3-wallet-handler").Wallet>;
                    disconnect: () => Promise<void>;
                    reconnect: (onDisconnect: () => void) => Promise<import("@thencc/web3-wallet-handler").Wallet | null>;
                    signTransactions: (connectedAccounts: string[], transactions: Uint8Array[]) => Promise<Uint8Array[]>;
                } | null;
                initParams: boolean | {
                    config?: any;
                    sdk?: any;
                };
                inited: boolean;
                initing: boolean;
                signing: boolean;
                connecting: boolean;
                isReady: () => Promise<true>;
                connect: () => Promise<import("@thencc/web3-wallet-handler").Account[]>;
                disconnect: () => Promise<void>;
                reconnect: () => Promise<void>;
                setAsActiveWallet: () => void;
                removeAccounts: () => void;
                readonly accounts: readonly {
                    readonly walletId: import("@thencc/web3-wallet-handler").WALLET_ID;
                    readonly name: string;
                    readonly address: string;
                }[];
                readonly isActive: boolean;
                readonly isConnected: boolean;
            } | undefined;
            algosigner?: {
                id: import("@thencc/web3-wallet-handler").WALLET_ID;
                metadata: {
                    id: import("@thencc/web3-wallet-handler").WALLET_ID;
                    name: string;
                    icon: string;
                    chain: string;
                    pkg: string;
                };
                client: {
                    connect: (onDisconnect: () => void) => Promise<import("@thencc/web3-wallet-handler").Wallet>;
                    disconnect: () => Promise<void>;
                    reconnect: (onDisconnect: () => void) => Promise<import("@thencc/web3-wallet-handler").Wallet | null>;
                    signTransactions: (connectedAccounts: string[], transactions: Uint8Array[]) => Promise<Uint8Array[]>;
                } | null;
                initParams: boolean | {
                    config?: any;
                    sdk?: any;
                };
                inited: boolean;
                initing: boolean;
                signing: boolean;
                connecting: boolean;
                isReady: () => Promise<true>;
                connect: () => Promise<import("@thencc/web3-wallet-handler").Account[]>;
                disconnect: () => Promise<void>;
                reconnect: () => Promise<void>;
                setAsActiveWallet: () => void;
                removeAccounts: () => void;
                readonly accounts: readonly {
                    readonly walletId: import("@thencc/web3-wallet-handler").WALLET_ID;
                    readonly name: string;
                    readonly address: string;
                }[];
                readonly isActive: boolean;
                readonly isConnected: boolean;
            } | undefined;
            exodus?: {
                id: import("@thencc/web3-wallet-handler").WALLET_ID;
                metadata: {
                    id: import("@thencc/web3-wallet-handler").WALLET_ID;
                    name: string;
                    icon: string;
                    chain: string;
                    pkg: string;
                };
                client: {
                    connect: (onDisconnect: () => void) => Promise<import("@thencc/web3-wallet-handler").Wallet>;
                    disconnect: () => Promise<void>;
                    reconnect: (onDisconnect: () => void) => Promise<import("@thencc/web3-wallet-handler").Wallet | null>;
                    signTransactions: (connectedAccounts: string[], transactions: Uint8Array[]) => Promise<Uint8Array[]>;
                } | null;
                initParams: boolean | {
                    config?: any;
                    sdk?: any;
                };
                inited: boolean;
                initing: boolean;
                signing: boolean;
                connecting: boolean;
                isReady: () => Promise<true>;
                connect: () => Promise<import("@thencc/web3-wallet-handler").Account[]>;
                disconnect: () => Promise<void>;
                reconnect: () => Promise<void>;
                setAsActiveWallet: () => void;
                removeAccounts: () => void;
                readonly accounts: readonly {
                    readonly walletId: import("@thencc/web3-wallet-handler").WALLET_ID;
                    readonly name: string;
                    readonly address: string;
                }[];
                readonly isActive: boolean;
                readonly isConnected: boolean;
            } | undefined;
            defly?: {
                id: import("@thencc/web3-wallet-handler").WALLET_ID;
                metadata: {
                    id: import("@thencc/web3-wallet-handler").WALLET_ID;
                    name: string;
                    icon: string;
                    chain: string;
                    pkg: string;
                };
                client: {
                    connect: (onDisconnect: () => void) => Promise<import("@thencc/web3-wallet-handler").Wallet>;
                    disconnect: () => Promise<void>;
                    reconnect: (onDisconnect: () => void) => Promise<import("@thencc/web3-wallet-handler").Wallet | null>;
                    signTransactions: (connectedAccounts: string[], transactions: Uint8Array[]) => Promise<Uint8Array[]>;
                } | null;
                initParams: boolean | {
                    config?: any;
                    sdk?: any;
                };
                inited: boolean;
                initing: boolean;
                signing: boolean;
                connecting: boolean;
                isReady: () => Promise<true>;
                connect: () => Promise<import("@thencc/web3-wallet-handler").Account[]>;
                disconnect: () => Promise<void>;
                reconnect: () => Promise<void>;
                setAsActiveWallet: () => void;
                removeAccounts: () => void;
                readonly accounts: readonly {
                    readonly walletId: import("@thencc/web3-wallet-handler").WALLET_ID;
                    readonly name: string;
                    readonly address: string;
                }[];
                readonly isActive: boolean;
                readonly isConnected: boolean;
            } | undefined;
            mnemonic?: {
                id: import("@thencc/web3-wallet-handler").WALLET_ID;
                metadata: {
                    id: import("@thencc/web3-wallet-handler").WALLET_ID;
                    name: string;
                    icon: string;
                    chain: string;
                    pkg: string;
                };
                client: {
                    connect: (onDisconnect: () => void) => Promise<import("@thencc/web3-wallet-handler").Wallet>;
                    disconnect: () => Promise<void>;
                    reconnect: (onDisconnect: () => void) => Promise<import("@thencc/web3-wallet-handler").Wallet | null>;
                    signTransactions: (connectedAccounts: string[], transactions: Uint8Array[]) => Promise<Uint8Array[]>;
                } | null;
                initParams: boolean | {
                    config?: any;
                    sdk?: any;
                };
                inited: boolean;
                initing: boolean;
                signing: boolean;
                connecting: boolean;
                isReady: () => Promise<true>;
                connect: () => Promise<import("@thencc/web3-wallet-handler").Account[]>;
                disconnect: () => Promise<void>;
                reconnect: () => Promise<void>;
                setAsActiveWallet: () => void;
                removeAccounts: () => void;
                readonly accounts: readonly {
                    readonly walletId: import("@thencc/web3-wallet-handler").WALLET_ID;
                    readonly name: string;
                    readonly address: string;
                }[];
                readonly isActive: boolean;
                readonly isConnected: boolean;
            } | undefined;
        } | null;
        stored: {
            version: number;
            connectedAccounts: {
                walletId: import("@thencc/web3-wallet-handler").WALLET_ID;
                name: string;
                address: string;
            }[];
            activeAccount: {
                walletId: import("@thencc/web3-wallet-handler").WALLET_ID;
                name: string;
                address: string;
            } | null;
        };
        activeAddress: string;
        activeWalletId: import("@thencc/web3-wallet-handler").WALLET_ID | null;
        activeWallet: {
            id: import("@thencc/web3-wallet-handler").WALLET_ID;
            metadata: {
                id: import("@thencc/web3-wallet-handler").WALLET_ID;
                name: string;
                icon: string;
                chain: string;
                pkg: string;
            };
            client: {
                connect: (onDisconnect: () => void) => Promise<import("@thencc/web3-wallet-handler").Wallet>;
                disconnect: () => Promise<void>;
                reconnect: (onDisconnect: () => void) => Promise<import("@thencc/web3-wallet-handler").Wallet | null>;
                signTransactions: (connectedAccounts: string[], transactions: Uint8Array[]) => Promise<Uint8Array[]>;
            } | null;
            initParams: boolean | {
                config?: any;
                sdk?: any;
            };
            inited: boolean;
            initing: boolean;
            signing: boolean;
            connecting: boolean;
            isReady: () => Promise<true>;
            connect: () => Promise<import("@thencc/web3-wallet-handler").Account[]>;
            disconnect: () => Promise<void>;
            reconnect: () => Promise<void>;
            setAsActiveWallet: () => void;
            removeAccounts: () => void;
            readonly accounts: readonly {
                readonly walletId: import("@thencc/web3-wallet-handler").WALLET_ID;
                readonly name: string;
                readonly address: string;
            }[];
            readonly isActive: boolean;
            readonly isConnected: boolean;
        } | undefined;
        isSigning: boolean;
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
     * ```
     *
     * @param config config object
     */
    constructor(config: AlgonautConfig);
    initAnyWallet(config?: AlgonautConfig): void;
    /**
     * checks if config obj is valid for use
     * @param config algonaut config for network + signing mode
     * @returns boolean. true is good.
     */
    isValidNodeConfig(config: AlgonautConfig): boolean;
    /**
     * sets config for use (new algod, indexerClient, etc)
     * @param config algonaut config for network + signing mode
     * 		- will throw Error if config is lousy
     */
    setNodeConfig(config: AlgonautConfig): void;
    /**
     * @returns config object or `false` if no config is set
     */
    getNodeConfig(): AlgonautConfig | boolean;
    /**
     * Checks status of Algorand network
     * @returns Promise resolving to status of Algorand network
     */
    checkStatus(): Promise<any | AlgonautError>;
    /**
     * if you already have an account, set it here
     * @param account an algosdk account already created
     */
    setAccount(account: AlgosdkAccount): void | AlgonautError;
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
    recoverAccount(mnemonic: string): AlgosdkAccount;
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
     * @param args { AlgonautCreateAssetArguments }  Must pass `assetName`, `symbol`, `decimals`, `amount`.
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
     * DEPRECATED! Use `atomicDeleteApp` instead. Returns atomic transaction that deletes application
     * @deprecated
     * @param appIndex - ID of application
     * @returns Promise resolving to atomic transaction that deletes application
     */
    atomicDeleteApplication(appIndex: number, optionalTxnArgs?: AlgonautTransactionFields): Promise<AlgonautAtomicTransaction>;
    /**
     * Deletes an application from the blockchain
     * @param appIndex - ID of application
     * @param callbacks optional AlgonautTxnCallbacks
     * @returns Promise resolving to confirmed transaction or error
     */
    deleteApp(appIndex: number, callbacks?: AlgonautTxnCallbacks, optionalTxnArgs?: AlgonautTransactionFields): Promise<AlgonautTransactionStatus>;
    /**
     * DEPRECATED! Use `deleteApp` instead. This will be removed in future versions.
     * @deprecated
     * @param appIndex - ID of application
     * @param callbacks optional AlgonautTxnCallbacks
     * @returns Promise resolving to confirmed transaction or error
     */
    deleteApplication(appIndex: number, callbacks?: AlgonautTxnCallbacks, optionalTxnArgs?: AlgonautTransactionFields): Promise<AlgonautTransactionStatus>;
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
    normalizeTxns(txnOrTxns: Transaction | AlgonautAtomicTransaction | AlgonautAtomicTransaction[]): Uint8Array[];
    /**
     * Sends a transaction or multiple through the correct channels, depending on signing mode.
     * If no signing mode is set, we assume local signing.
     * @param txnOrTxns Either an array of atomic transactions or a single transaction to sign
     * @param callbacks Optional object with callbacks - `onSign`, `onSend`, and `onConfirm`
     * @returns Promise resolving to AlgonautTransactionStatus
     */
    sendTransaction(txnOrTxns: AlgonautAtomicTransaction[] | Transaction | AlgonautAtomicTransaction, callbacks?: AlgonautTxnCallbacks): Promise<AlgonautTransactionStatus>;
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
     * Signs an array of Transactions with the currently authenticated account (used in inkey-wallet)
     * @param txns Array of Transaction
     * @returns Uint8Array[] of signed transactions
     */
    signTransactionGroup(txns: Transaction[]): Uint8Array | Uint8Array[];
    /**
     * Signs base64-encoded transactions with the currently authenticated account
     * @param txns Array of Base64-encoded unsigned transactions
     * @returns Uint8Array signed transactions
     */
    signBase64Transactions(txns: string[]): Uint8Array[] | Uint8Array;
    /**
     * Signs base64-encoded transactions in the object format with the currently authenticated account
     * @param txnsForSigning Array of objects containing Base64-encoded unsigned transactions + info about how they need to be signed
     * @returns Uint8Array signed transactions
     */
    signBase64TxnObjects(txnsForSigning: TxnForSigning[]): Uint8Array[] | Uint8Array;
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
    decodeBase64UnsignedTransaction(txn: string): Transaction;
    /**
     * Describes an Algorand transaction, for display in Inkey
     * @param txn Transaction to describe
     */
    txnSummary(txn: Transaction): string;
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
    recoverAccount(mnemonic: string): AlgosdkAccount;
    /**
     * Creates a LogicSig from a base64 program string.  Note that this method does not COMPILE
     * the program, just builds an LSig from an already compiled base64 result!
     * @param base64ProgramString
     * @returns an algosdk LogicSigAccount
     */
    generateLogicSig(base64ProgramString: string): LogicSigAccount;
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
     * @param stateArray State array returned from functions like {@link Algonaut.getAppInfo}
     * @returns A more useful object: `{ array[0].key: array[0].value, array[1].key: array[1].value, ... }`
     */
    stateArrayToObject(stateArray: object[]): any;
    fromBase64(encoded: string): string;
    valueAsAddr(encoded: string): string;
    decodeStateArray(stateArray: AlgonautAppStateEncoded[]): AlgonautStateData[];
    /**
     * Signs an array of Transactions (used in Inkey)
     * @param txns Array of Transaction
     * @param account AlgosdkAccount object with `sk`, that signs the transactions
     * @returns Uint8Array[] of signed transactions
     */
    signTransactionGroup(txns: Transaction[], account: AlgosdkAccount): Uint8Array[] | Uint8Array;
    /**
     * Signs an array of Transactions Objects (used in Inkey)
     * @param txnsForSigning Array of unsigned Transaction Objects (txn + signing method needed)
     * @param account AlgosdkAccount object with `sk`, that signs the transactions
     * @returns Uint8Array[] of signed transactions
     */
    signTxnObjectGroup(txnsForSigning: TxnForSigning[], account: AlgosdkAccount): Uint8Array[] | Uint8Array;
    /**
     * Used by Inkey to sign base64-encoded transactions sent to the iframe
     * @param txns Array of Base64-encoded unsigned transactions
     * @param account AlgosdkAccount object with `sk`, that signs the transactions
     * @returns Uint8Array signed transactions
     */
    signBase64Transactions(txns: string[], account: AlgosdkAccount): Uint8Array[] | Uint8Array;
    /**
     * Used by Inkey to sign base64-encoded transactions (objects) sent to the iframe
     * @param txnsForSigning Array of objects containing a Base64-encoded unsigned transaction + info re how they need to be signed (multisig, logicsig, normal...)
     * @param account AlgosdkAccount object with `sk`, that signs the transactions
     * @returns Uint8Array signed transactions
     */
    signBase64TxnObjects(txnsForSigning: TxnForSigning[], account: AlgosdkAccount): Uint8Array[] | Uint8Array;
    /**
     * Does what it says on the tin.
     * @param txn base64-encoded unsigned transaction
     * @returns transaction object
     */
    decodeBase64UnsignedTransaction(txn: string): Transaction;
    /**
     * Does what it says on the tin.
     * @param txn algorand txn object
     * @returns string (like for inkey / base64 transmit use)
     */
    txnToStr(txn: algosdk.Transaction): string;
    /**
     * Describes an Algorand transaction, for display in Inkey
     * @param txn Transaction to describe
     */
    txnSummary(txn: Transaction): string;
};
export declare const buffer: BufferConstructor;
