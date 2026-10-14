"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __reExport = (target, mod, secondTarget) => (__copyProps(target, mod, "default"), secondTarget && __copyProps(secondTarget, mod, "default"));
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  Algonaut: () => Algonaut,
  buffer: () => buffer,
  default: () => src_default
});
module.exports = __toCommonJS(src_exports);
var import_buffer = require("buffer");
var import_algosdk = __toESM(require("algosdk"), 1);
var import_any_wallet = require("@thencc/any-wallet");
__reExport(src_exports, require("@thencc/any-wallet"), module.exports);

// src/algo-config.ts
var testnetConfig = {
  LEDGER: "testnet",
  BASE_SERVER: "https://testnet-api.algonode.cloud",
  INDEX_SERVER: "https://testnet-idx.algonode.cloud",
  API_TOKEN: "",
  PORT: ""
  // 443
};
var mainnetConfig = {
  LEDGER: "mainnet",
  BASE_SERVER: "https://mainnet-api.algonode.cloud",
  INDEX_SERVER: "https://mainnet-idx.algonode.cloud",
  API_TOKEN: "",
  PORT: ""
};
var defaultNodeConfig = testnetConfig;

// src/constants.ts
var defaultLibConfig = {
  disableLogs: true
};

// src/utils.ts
var logger = {
  enabled: false,
  log(...args) {
    if (!this.enabled)
      return;
    console.log(...args);
  },
  debug(...args) {
    if (!this.enabled)
      return;
    console.debug(...args);
  }
};

// src/index.ts
var unsAcctSync = null;
var Algonaut = class {
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
  constructor(config) {
    // it will be set or it throws an Error
    this.indexerClient = void 0;
    this.nodeConfig = defaultNodeConfig;
    this.libConfig = defaultLibConfig;
    // expose entire algosdk in case the dapp needs more
    this.sdk = import_algosdk.default;
    this.inkeyClientSdk = null;
    this.inkeyLoading = false;
    this.inkeyLoaded = false;
    this.account = null;
    this.setNodeConfig(config == null ? void 0 : config.nodeConfig);
    this.setLibConfig(config);
    this.initAwState(config);
  }
  get connectedAccounts() {
    return this.walletState.connectedAccounts;
  }
  // initAwState(awConfig?: AnyWalletStateConfig) {
  initAwState(config) {
    logger.log("initAwState", config);
    const awConfig = config ? {
      storageKey: config.storageKey,
      storageController: config.storageController
    } : void 0;
    this.walletState = new import_any_wallet.AnyWalletState(awConfig);
    this.initWallets(config == null ? void 0 : config.initWallets);
    this.initAcctSync();
    this.subscribeToAccountChanges = this.walletState.subscribeToAccountChanges;
    this.setActiveAccount = this.walletState.setAsActiveAccount;
    this.connect = this.walletState.connectWallet;
    this.disconnect = this.walletState.disconnectWallet;
    this.disconnectAll = this.walletState.disconnectAllWallets;
  }
  setLibConfig(config) {
    let libConfig;
    if (config == void 0) {
      libConfig = defaultLibConfig;
    } else {
      if ("disableLogs" in config && typeof config.disableLogs == "boolean") {
        logger.enabled = !config.disableLogs;
        (0, import_any_wallet.setLogsEnabled)(!config.disableLogs);
      }
    }
  }
  /**
   * checks if config obj is valid for use
   * @param config algonaut config for network + signing mode
   * @returns boolean. true is good.
   */
  isValidNodeConfig(nodeConfig) {
    let isValid = true;
    if (nodeConfig == void 0 || !nodeConfig.BASE_SERVER) {
      isValid = false;
    }
    return isValid;
  }
  /**
   * sets config for use (new algod, indexerClient, etc)
   * @param config algonaut config for network + signing mode
   * 		- will throw Error if config is lousy
   */
  setNodeConfig(nodeConfig) {
    logger.log("setNodeConfig", nodeConfig);
    if (nodeConfig == void 0) {
      nodeConfig = defaultNodeConfig;
    }
    if (typeof nodeConfig == "string") {
      if (nodeConfig == "mainnet") {
        nodeConfig = mainnetConfig;
      } else if (nodeConfig == "testnet") {
        nodeConfig = testnetConfig;
      } else {
        throw new Error("bad node config string.");
      }
    }
    if (!this.isValidNodeConfig(nodeConfig)) {
      throw new Error("bad node config!");
    }
    if (typeof nodeConfig == "undefined") {
      throw new Error("node config undefined");
    }
    this.nodeConfig = nodeConfig;
    this.algodClient = new import_algosdk.Algodv2(nodeConfig.API_TOKEN, nodeConfig.BASE_SERVER, nodeConfig.PORT);
    if (nodeConfig.INDEX_SERVER) {
      this.indexerClient = new import_algosdk.Indexer(nodeConfig.API_TOKEN, nodeConfig.INDEX_SERVER, nodeConfig.PORT);
    } else {
      console.warn("No indexer configured because INDEX_SERVER was not provided.");
    }
  }
  /**
   * @returns nodeConfig object or `false` if no nodeConfig is set
   */
  getNodeConfig() {
    if (this.nodeConfig)
      return this.nodeConfig;
    return false;
  }
  /**
   * Checks status of Algorand network
   * @returns Promise resolving to status of Algorand network
   */
  async checkStatus() {
    if (!this.getNodeConfig()) {
      throw new Error("No node configuration set.");
    }
    const status = await this.algodClient.status().do();
    logger.log("Algorand network status: %o", status);
    return status;
  }
  initAcctSync() {
    unsAcctSync = this.walletState.subscribeToAccountChanges(
      (acct) => {
        logger.log("acct changed", acct);
        this.account = acct;
      }
    );
  }
  stopAcctSync() {
    if (unsAcctSync)
      unsAcctSync();
  }
  initWallets(walletInitParams) {
    if (walletInitParams == void 0) {
      logger.debug(".enableWallets called without any init params.");
    }
    const defaultWip = {
      // inkey: true, // not even inkey
    };
    const wip = walletInitParams || defaultWip;
    this.walletState.initWallets(wip);
  }
  /**
   * @deprecated use .connect() with mnemonic arg
   * Recovers account from mnemonic
   *  (helpful for rapid development but overall very insecure unless on server-side)
   * @param mnemonic Mnemonic associated with Algonaut account
   * @returns If mnemonic is valid, it returns the account (address, chain). Otherwise, throws an error.
   */
  async mnemonicConnect(mnemonic) {
    if (!mnemonic)
      throw new Error("algonaut.mnemonicConnect: No mnemonic provided.");
    return await this.connect("mnemonic", mnemonic);
  }
  /**
   * @deprecated use .connect or loop through enabled wallets' methods
   */
  async inkeyConnect() {
    console.warn(".inkeyConnect is deprecated. please use .connect");
    return await this.connect("inkey");
  }
  /**
   * @deprecated use .disconnect or loop through enabled wallets' methods
   */
  async inkeyDisconnect() {
    console.warn(".inkeyDisconnect is deprecated. please use .disconnect");
    return await this.disconnect(import_any_wallet.WALLET_ID.INKEY);
  }
  /**
   * Shows the inkey-wallet modal
   * @returns
   */
  async inkeyShow(route) {
    const ic = await this.getInkeyClientSdk();
    ic.show(route);
  }
  /**
   * Hides the inkey-wallet modal
   * @returns
   */
  async inkeyHide() {
    const ic = await this.getInkeyClientSdk();
    ic.hide();
  }
  /**
   * Loads and/or returns the inkey-wallet client sdk for whatever use. see inkey-client-js docs for more.
   * @returns
   */
  async getInkeyClientSdk() {
    logger.log("getInkeyClientSdk");
    if (this.inkeyClientSdk !== null) {
      this.inkeyLoaded = true;
      return this.inkeyClientSdk;
    } else {
      const inkeyW = this.walletState.allWallets.inkey;
      if (!inkeyW) {
        console.warn("Inkey wallet not enabled by dev");
        throw new Error("Inkey wallet not enabled by dev");
      }
      this.inkeyLoading = true;
      await inkeyW.loadClient();
      this.inkeyLoading = false;
      const inkeyClientSdk = inkeyW.client.sdk;
      if (inkeyClientSdk.frameBus.ready == false) {
        logger.debug("inkeySdk FrameBus not yet ready...");
        await inkeyClientSdk.frameBus.isReady();
        logger.debug("inkeySdk FrameBus IS ready.");
      }
      this.inkeyLoaded = true;
      this.inkeyClientSdk = inkeyClientSdk;
      return this.inkeyClientSdk;
    }
  }
  /**
   * General purpose method to await transaction confirmation
   * @param txId a string id of the transacion you want to watch
   * @param limitDelta how many rounds to wait, defaults to 50
   * @param log set to true if you'd like to see "waiting for confirmation" log messages
   */
  async waitForConfirmation(txId, limitDelta, log = false) {
    var _a;
    if (!txId)
      throw new Error("waitForConfirmation: No transaction ID provided.");
    let lastround = (await this.algodClient.status().do())["last-round"];
    const limit = lastround + (limitDelta ? limitDelta : 50);
    const returnValue = {
      status: "fail",
      message: ""
    };
    while (lastround < limit) {
      let pendingInfo = "";
      try {
        pendingInfo = await this.algodClient.pendingTransactionInformation(txId).do();
        if (log) {
          logger.log("waiting for confirmation");
        }
      } catch (er) {
        console.error((_a = er.response) == null ? void 0 : _a.text);
      }
      if (pendingInfo["confirmed-round"] !== null && pendingInfo["confirmed-round"] > 0) {
        if (log) {
          logger.log("Transaction confirmed in round " + pendingInfo["confirmed-round"]);
        }
        returnValue.txId = txId;
        returnValue.status = "success";
        returnValue.message = "Transaction confirmed in round " + pendingInfo["confirmed-round"];
        break;
      }
      lastround = (await this.algodClient.status().do())["last-round"];
    }
    return returnValue;
  }
  /**
   * Creates a LogicSig from a base64 program string.  Note that this method does not COMPILE
   * the program, just builds an LSig from an already compiled base64 result!
   * @param base64ProgramString
   * @returns an algosdk LogicSigAccount
   */
  generateLogicSig(base64ProgramString) {
    if (!base64ProgramString)
      throw new Error("No program string provided.");
    const program = new Uint8Array(
      import_buffer.Buffer.from(base64ProgramString, "base64")
    );
    return new import_algosdk.LogicSigAccount(program);
  }
  async atomicOptInAsset(assetIndex, optionalTxnArgs) {
    if (!this.walletState.activeAddress)
      throw new Error("No account set in Algonaut.");
    if (!assetIndex)
      throw new Error("No asset index provided.");
    const suggestedParams = (optionalTxnArgs == null ? void 0 : optionalTxnArgs.suggestedParams) || await this.algodClient.getTransactionParams().do();
    const optInTransaction = (0, import_algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject)({
      from: this.walletState.activeAddress,
      to: this.walletState.activeAddress,
      assetIndex,
      amount: 0,
      suggestedParams
    });
    return {
      transaction: optInTransaction,
      isLogigSig: false
    };
  }
  /**
   * Opt-in the current account for the a token or NFT Asset.
   * @param assetIndex number of asset to opt-in to
   * @param callbacks `AlgonautTxnCallbacks`, passed to {@link sendTransaction}
   * @returns Promise resolving to confirmed transaction or error
   */
  async optInAsset(assetIndex, callbacks, optionalTxnArgs) {
    if (!this.walletState.activeAddress)
      throw new Error("There was no account!");
    if (!assetIndex)
      throw new Error("No asset index provided.");
    const { transaction } = await this.atomicOptInAsset(assetIndex, optionalTxnArgs);
    return await this.sendTransaction(transaction, callbacks);
  }
  // this is a bit harder with the algosdk api
  // what we may want to do be more opinionated and have a standard local
  // field we always set on apps when opted in
  // OR maybe we check for HAS STATE which might check for local state
  // of any kind on that app id?
  // async isOptedIntoApp(account: string, appId: number): boolean {
  // 	let optInState = false;
  // 	const accountInfo = await this.getAccountInfo(account);
  // 	accountInfo.assets.forEach((asset: any) => {
  // 		if (asset['asset-id'] == assetId) {
  // 			optInState = true;
  // 		}
  // 	});
  // 	return optInState;
  // }
  /**
   * You can be opted into an asset but still have a zero balance. Use this call
   * for cases where you just need to know the address's opt-in state
   * @param args object containing `account` and `assetId` properties
   * @returns boolean true if account holds asset
   */
  async isOptedIntoAsset(args) {
    if (!args.account)
      throw new Error("No account provided.");
    if (!args.assetId)
      throw new Error("No asset ID provided.");
    let optInState = false;
    const accountInfo = await this.getAccountInfo(args.account);
    accountInfo.assets.forEach((asset) => {
      if (asset["asset-id"] == args.assetId) {
        optInState = true;
      }
    });
    return optInState;
  }
  /**
   * Sync function that returns a correctly-encoded argument array for
   * an algo transaction
   * @param args must be an any[] array, as it will often need to be
   * a mix of strings and numbers. Valid types are: string, number, and bigint
   * @returns a Uint8Array of encoded arguments
   */
  encodeArguments(args) {
    const encodedArgs = [];
    args.forEach((arg) => {
      if (typeof arg == "number") {
        encodedArgs.push((0, import_algosdk.encodeUint64)(arg));
      } else if (typeof arg == "bigint") {
        encodedArgs.push((0, import_algosdk.encodeUint64)(arg));
      } else if (typeof arg == "string") {
        encodedArgs.push(new Uint8Array(import_buffer.Buffer.from(arg)));
      }
    });
    return encodedArgs;
  }
  /**
   * Create asset transaction
   * @param args : AlgonautCreateAssetArguments obj must contain: `assetName`, `symbol`, `decimals`, `amount`.
   * @returns atomic txn to create asset
  */
  async atomicCreateAsset(args) {
    var _a;
    if (!args.assetName)
      throw new Error("args.assetName not provided.");
    if (!args.symbol)
      throw new Error("args.symbol not provided");
    if (typeof args.decimals == "undefined")
      throw new Error("args.decimals not provided.");
    if (!args.amount)
      throw new Error("args.amount not provided.");
    const fromAddr = args.from || this.walletState.activeAddress;
    if (!fromAddr)
      throw new Error("there is no fromAddr");
    if (!args.metaBlock) {
      args.metaBlock = " ";
    }
    if (!args.defaultFrozen)
      args.defaultFrozen = false;
    if (!args.assetURL)
      args.assetURL = void 0;
    const metaBlockLength = args.metaBlock.length;
    if (metaBlockLength > 1023) {
      console.error("meta block is " + metaBlockLength);
      throw new Error("drat! this meta block is too long!");
    }
    const enc = new TextEncoder();
    const note = enc.encode(args.metaBlock);
    const totalIssuance = args.amount;
    const manager = args.manager && args.manager.length > 0 ? args.manager : fromAddr;
    const reserve = args.reserve && args.reserve.length > 0 ? args.reserve : fromAddr;
    const freeze = args.freeze && args.freeze.length > 0 ? args.freeze : fromAddr;
    const clawback = args.clawback && args.clawback.length > 0 ? args.clawback : fromAddr;
    const suggestedParams = ((_a = args.optionalFields) == null ? void 0 : _a.suggestedParams) || await this.algodClient.getTransactionParams().do();
    const txn = (0, import_algosdk.makeAssetCreateTxnWithSuggestedParams)(
      fromAddr,
      note,
      totalIssuance,
      args.decimals,
      args.defaultFrozen,
      manager,
      reserve,
      freeze,
      clawback,
      args.symbol,
      args.assetName,
      args.assetURL,
      args.assetMetadataHash,
      suggestedParams
    );
    return {
      transaction: txn,
      isLogigSig: false
    };
  }
  /**
   * Create asset
   * @param args AlgonautCreateAssetArguments. Must pass `assetName`, `symbol`, `decimals`, `amount`.
   * @param callbacks AlgonautTxnCallbacks
   * @returns asset index
  */
  async createAsset(args, callbacks) {
    const atomicTxn = await this.atomicCreateAsset(args);
    const txn = atomicTxn.transaction;
    try {
      const txStatus = await this.sendTransaction(txn, callbacks);
      const ptx = await this.algodClient.pendingTransactionInformation(txn.txID().toString()).do();
      txStatus.createdIndex = ptx["asset-index"];
      return txStatus;
    } catch (er) {
      logger.log("transaction error");
      logger.log(er);
      throw new Error(er);
    }
  }
  async atomicDeleteAsset(assetId, optionalTxnArgs) {
    if (!this.walletState.activeAddress)
      throw new Error("there was no account!");
    if (!assetId)
      throw new Error("No assetId provided!");
    const enc = new TextEncoder();
    const suggestedParams = (optionalTxnArgs == null ? void 0 : optionalTxnArgs.suggestedParams) || await this.algodClient.getTransactionParams().do();
    const transaction = (0, import_algosdk.makeAssetDestroyTxnWithSuggestedParams)(
      this.walletState.activeAddress,
      enc.encode("doh!"),
      // what is this?
      assetId,
      suggestedParams
    );
    return {
      transaction,
      isLogigSig: false
    };
  }
  /**
   * Deletes asset
   * @param assetId Index of the ASA to delete
   * @param callbacks optional AlgonautTxnCallbacks
   * @returns Promise resolving to confirmed transaction or error
   */
  async deleteAsset(assetId, callbacks, optionalTxnArgs) {
    if (!assetId)
      throw new Error("No asset ID provided!");
    const { transaction } = await this.atomicDeleteAsset(assetId, optionalTxnArgs);
    return await this.sendTransaction(transaction, callbacks);
  }
  /**
   * Creates send asset transaction.
   *
   * IMPORTANT: Before you can call this, the target account has to "opt-in"
   * to the ASA index.  You can't just send ASAs to people blind!
   *
   * @param args - object containing `to`, `assetIndex`, and `amount` properties
   * @returns Promise resolving to `AlgonautAtomicTransaction`
   */
  async atomicSendAsset(args) {
    var _a;
    if (!args.to)
      throw new Error("No to address provided");
    if (!(0, import_algosdk.isValidAddress)(args.to))
      throw new Error("Invalid to address");
    if (!args.assetIndex)
      throw new Error("No asset index provided");
    if (!(typeof args.amount == "bigint" || typeof args.amount == "number")) {
      throw new Error("Amount has to be a number.");
    }
    const fromAddr = args.from || this.walletState.activeAddress;
    if (!fromAddr)
      throw new Error("there is no fromAddr");
    const suggestedParams = ((_a = args.optionalFields) == null ? void 0 : _a.suggestedParams) || await this.algodClient.getTransactionParams().do();
    const transaction = (0, import_algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject)({
      from: fromAddr,
      to: args.to,
      amount: args.amount,
      assetIndex: args.assetIndex,
      suggestedParams
    });
    return {
      transaction,
      isLogigSig: false
    };
  }
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
  async sendAsset(args, callbacks) {
    const fromAddr = args.from || this.walletState.activeAddress;
    if (!fromAddr)
      throw new Error("there is no fromAddr");
    const { transaction } = await this.atomicSendAsset(args);
    return await this.sendTransaction(transaction, callbacks);
  }
  /**
   * Get info about an asset
   * @param assetIndex
   * @returns
   */
  async getAssetInfo(assetIndex) {
    if (!assetIndex)
      throw new Error("No asset ID provided");
    const info = await this.algodClient.getAssetByID(assetIndex).do();
    return info;
  }
  /**
   * Creates transaction to opt into an app
   * @param args AlgonautCallAppArgs
   * @returns AlgonautAtomicTransaction
   */
  async atomicOptInApp(args) {
    var _a, _b, _c, _d, _e, _f, _g;
    if (!args.appIndex)
      throw new Error("No app ID provided");
    const fromAddr = this.walletState.activeAddress;
    if (!fromAddr)
      throw new Error("there is no fromAddr");
    const suggestedParams = ((_a = args.optionalFields) == null ? void 0 : _a.suggestedParams) || await this.algodClient.getTransactionParams().do();
    const optInTransaction = (0, import_algosdk.makeApplicationOptInTxnFromObject)({
      from: fromAddr,
      appIndex: args.appIndex,
      suggestedParams,
      appArgs: args.appArgs ? this.encodeArguments(args.appArgs) : void 0,
      accounts: ((_b = args.optionalFields) == null ? void 0 : _b.accounts) ? (_c = args.optionalFields) == null ? void 0 : _c.accounts : void 0,
      foreignApps: ((_d = args.optionalFields) == null ? void 0 : _d.applications) ? (_e = args.optionalFields) == null ? void 0 : _e.applications : void 0,
      foreignAssets: ((_f = args.optionalFields) == null ? void 0 : _f.assets) ? (_g = args.optionalFields) == null ? void 0 : _g.assets : void 0
    });
    return {
      transaction: optInTransaction,
      isLogigSig: false
    };
  }
  /**
   * Opt-in the current account for an app.
   * @param args Object containing `appIndex`, `appArgs`, and `optionalFields`
   * @param callbacks optional AlgonautTxnCallbacks
   * @returns Promise resolving to confirmed transaction or error
   */
  async optInApp(args, callbacks) {
    const { transaction } = await this.atomicOptInApp(args);
    return await this.sendTransaction(transaction, callbacks);
  }
  /**
   * Returns atomic transaction that deletes application
   * @param appIndex - ID of application
   * @returns Promise resolving to atomic transaction that deletes application
   */
  async atomicDeleteApp(appIndex, optionalTxnArgs) {
    if (!appIndex)
      throw new Error("No app ID provided");
    const fromAddr = this.walletState.activeAddress;
    if (!fromAddr)
      throw new Error("there is no fromAddr");
    const suggestedParams = (optionalTxnArgs == null ? void 0 : optionalTxnArgs.suggestedParams) || await this.algodClient.getTransactionParams().do();
    const txn = (0, import_algosdk.makeApplicationDeleteTxn)(fromAddr, suggestedParams, appIndex);
    return {
      transaction: txn,
      isLogigSig: false
    };
  }
  /**
   * Deletes an application from the blockchain
   * @param appIndex - ID of application
   * @param callbacks optional AlgonautTxnCallbacks
   * @returns Promise resolving to confirmed transaction or error
   */
  async deleteApp(appIndex, callbacks, optionalTxnArgs) {
    var _a;
    try {
      const { transaction } = await this.atomicDeleteApp(appIndex, optionalTxnArgs);
      const txId = transaction.txID().toString();
      const transactionResponse = await this.algodClient.pendingTransactionInformation(txId).do();
      const appId = transactionResponse["txn"]["txn"].apid;
      return {
        status: "success",
        message: "deleted app index " + appId,
        txId
      };
    } catch (e) {
      logger.log(e);
      throw new Error((_a = e.response) == null ? void 0 : _a.text);
    }
  }
  async atomicCallApp(args) {
    var _a, _b, _c, _d, _e;
    const fromAddr = (args == null ? void 0 : args.from) || this.walletState.activeAddress;
    if (!fromAddr)
      throw new Error("there is no fromAddr");
    if (!args.appIndex)
      throw new Error("Must provide appIndex");
    if (!args.appArgs.length)
      throw new Error("Must provide at least one appArgs");
    const processedArgs = this.encodeArguments(args.appArgs);
    const suggestedParams = ((_a = args.optionalFields) == null ? void 0 : _a.suggestedParams) || await this.algodClient.getTransactionParams().do();
    const callAppTransaction = (0, import_algosdk.makeApplicationNoOpTxnFromObject)({
      from: fromAddr,
      suggestedParams,
      appIndex: args.appIndex,
      appArgs: processedArgs,
      accounts: ((_b = args.optionalFields) == null ? void 0 : _b.accounts) || void 0,
      foreignApps: ((_c = args.optionalFields) == null ? void 0 : _c.applications) || void 0,
      foreignAssets: ((_d = args.optionalFields) == null ? void 0 : _d.assets) || void 0,
      note: ((_e = args.optionalFields) == null ? void 0 : _e.note) ? this.toUint8Array(args.optionalFields.note) : void 0
    });
    return {
      transaction: callAppTransaction,
      isLogigSig: false
    };
  }
  /**
   * Call a "method" on a stateful contract.  In TEAL, you're really giving
   * an argument which branches to a specific place and reads the other args
   * @param args Object containing `appIndex`, `appArgs`, and `optionalFields` properties
   */
  async callApp(args, callbacks) {
    const { transaction } = await this.atomicCallApp(args);
    return await this.sendTransaction(transaction, callbacks);
  }
  async atomicCallAppWithLSig(args) {
    var _a, _b, _c, _d;
    if (!args.appIndex)
      throw new Error("Must provide appIndex");
    if (!args.appArgs.length)
      throw new Error("Must provide at least one appArgs");
    const processedArgs = this.encodeArguments(args.appArgs);
    const suggestedParams = ((_a = args.optionalFields) == null ? void 0 : _a.suggestedParams) || await this.algodClient.getTransactionParams().do();
    const callAppTransaction = (0, import_algosdk.makeApplicationNoOpTxnFromObject)({
      from: args.lsig.address(),
      suggestedParams,
      appIndex: args.appIndex,
      appArgs: processedArgs,
      accounts: ((_b = args.optionalFields) == null ? void 0 : _b.accounts) || void 0,
      foreignApps: ((_c = args.optionalFields) == null ? void 0 : _c.applications) || void 0,
      foreignAssets: ((_d = args.optionalFields) == null ? void 0 : _d.assets) || void 0
    });
    return {
      transaction: callAppTransaction,
      isLogigSig: true,
      lSig: args.lsig
    };
  }
  /**
   * Returns an atomic transaction that closes out the user's local state in an application.
   * The opposite of {@link atomicOptInApp}.
   * @param args Object containing `appIndex`, `appArgs`, and `optionalFields` properties
   * @returns Promise resolving to atomic transaction
   */
  async atomicCloseOutApp(args) {
    var _a, _b, _c, _d;
    const fromAddr = (args == null ? void 0 : args.from) || this.walletState.activeAddress;
    if (!fromAddr)
      throw new Error("there is no fromAddr");
    if (!args.appIndex)
      throw new Error("Must provide appIndex");
    try {
      const suggestedParams = ((_a = args.optionalFields) == null ? void 0 : _a.suggestedParams) || await this.algodClient.getTransactionParams().do();
      const processedArgs = this.encodeArguments(args.appArgs);
      const closeOutTxn = (0, import_algosdk.makeApplicationCloseOutTxnFromObject)({
        from: fromAddr,
        suggestedParams,
        appIndex: args.appIndex,
        appArgs: processedArgs,
        accounts: ((_b = args.optionalFields) == null ? void 0 : _b.accounts) || void 0,
        foreignApps: ((_c = args.optionalFields) == null ? void 0 : _c.applications) || void 0,
        foreignAssets: ((_d = args.optionalFields) == null ? void 0 : _d.assets) || void 0
      });
      return {
        transaction: closeOutTxn,
        isLogigSig: false
      };
    } catch (e) {
      throw new Error(e);
    }
  }
  /**
   * Closes out the user's local state in an application.
   * The opposite of {@link optInApp}.
   * @param args Object containing `appIndex`, `appArgs`, and `optionalFields` properties
   * @param callbacks optional AlgonautTxnCallbacks
   * @returns Promise resolving to atomic transaction
   */
  async closeOutApp(args, callbacks) {
    const { transaction } = await this.atomicCloseOutApp(args);
    return await this.sendTransaction(transaction, callbacks);
  }
  /**
   * Get an application's escrow account
   * @param appId - ID of application
   * @returns Escrow account address as string
   */
  getAppEscrowAccount(appId) {
    if (!appId)
      throw new Error("No appId provided");
    return (0, import_algosdk.getApplicationAddress)(appId);
  }
  /**
   * Get info about an application (globals, locals, creator address, index)
   *
   * @param appId - ID of application
   * @returns Promise resolving to application state
   */
  async getAppInfo(appId) {
    if (!appId)
      throw new Error("No appId provided");
    const proms = [
      this.algodClient.getApplicationByID(appId).do()
    ];
    const addr = this.walletState.activeAddress;
    if (addr) {
      proms.push(this.getAppLocalState(appId));
    }
    const promsRes = await Promise.all(proms);
    const info = promsRes[0];
    const localState = promsRes[1];
    const state = {
      hasState: true,
      globals: [],
      locals: (localState == null ? void 0 : localState.locals) || [],
      creatorAddress: info.params.creator,
      index: appId
    };
    if (info.params["global-state"]) {
      state.globals = this.decodeStateArray(info.params["global-state"]);
    }
    return state;
  }
  /**
   * Create and deploy a new Smart Contract from TEAL code
   *
   * @param args AlgonautDeployArguments
   * @param callbacks optional AlgonautTxnCallbacks
   * @returns AlgonautTransactionStatus
   */
  async createApp(args, callbacks) {
    var _a, _b, _c, _d, _e;
    if (args.optionalFields && args.optionalFields.note && args.optionalFields.note.length > 1023) {
      console.warn("drat! your note is too long!");
      throw new Error("Your note is too long");
    }
    const fromAddr = this.walletState.activeAddress;
    if (!fromAddr)
      throw new Error("there is no fromAddr");
    if (!args.tealApprovalCode)
      throw new Error("No approval program provided");
    if (!args.tealClearCode)
      throw new Error("No clear program provided");
    if (!args.schema)
      throw new Error("No schema provided");
    try {
      const suggestedParams = ((_a = args.optionalFields) == null ? void 0 : _a.suggestedParams) || await this.algodClient.getTransactionParams().do();
      let approvalProgram = new Uint8Array();
      let clearProgram = new Uint8Array();
      approvalProgram = await this.compileProgram(args.tealApprovalCode);
      clearProgram = await this.compileProgram(args.tealClearCode);
      if (approvalProgram && clearProgram) {
        const txn = (0, import_algosdk.makeApplicationCreateTxnFromObject)({
          from: fromAddr,
          suggestedParams,
          onComplete: import_algosdk.OnApplicationComplete.NoOpOC,
          approvalProgram,
          clearProgram,
          numLocalInts: args.schema.localInts,
          numLocalByteSlices: args.schema.localBytes,
          numGlobalInts: args.schema.globalInts,
          numGlobalByteSlices: args.schema.globalBytes,
          appArgs: this.encodeArguments(args.appArgs),
          accounts: ((_b = args.optionalFields) == null ? void 0 : _b.accounts) ? args.optionalFields.accounts : void 0,
          foreignApps: ((_c = args.optionalFields) == null ? void 0 : _c.applications) ? args.optionalFields.applications : void 0,
          foreignAssets: ((_d = args.optionalFields) == null ? void 0 : _d.assets) ? args.optionalFields.assets : void 0,
          note: ((_e = args.optionalFields) == null ? void 0 : _e.note) ? this.toUint8Array(args.optionalFields.note) : void 0
        });
        const txId = txn.txID().toString();
        const result = await this.sendTransaction(txn, callbacks);
        const transactionResponse = await this.algodClient.pendingTransactionInformation(txId).do();
        result.message = "Created App ID: " + transactionResponse["application-index"];
        result.createdIndex = transactionResponse["application-index"];
        result.meta = transactionResponse;
        result.txId = txId;
        return result;
      } else {
        throw new Error("could not compile teal code");
      }
    } catch (er) {
      throw new Error(er.message);
    }
  }
  /**
   * Create an atomic transaction to deploy a
   * new Smart Contract from TEAL code
   *
   * @param args AlgonautDeployArguments
   * @returns AlgonautAtomicTransaction
   */
  async atomicCreateApp(args) {
    var _a, _b, _c, _d, _e;
    const fromAddr = this.walletState.activeAddress;
    if (!fromAddr)
      throw new Error("there is no fromAddr");
    if (!args.tealApprovalCode)
      throw new Error("No approval program provided");
    if (!args.tealClearCode)
      throw new Error("No clear program provided");
    if (!args.schema)
      throw new Error("No schema provided");
    if (args.optionalFields && args.optionalFields.note && args.optionalFields.note.length > 1023) {
      throw new Error("Your NOTE is too long, it must be less thatn 1024 Bytes");
    } else if (fromAddr) {
      try {
        const onComplete = import_algosdk.OnApplicationComplete.NoOpOC;
        const suggestedParams = ((_a = args.optionalFields) == null ? void 0 : _a.suggestedParams) || await this.algodClient.getTransactionParams().do();
        let approvalProgram = new Uint8Array();
        let clearProgram = new Uint8Array();
        approvalProgram = await this.compileProgram(args.tealApprovalCode);
        clearProgram = await this.compileProgram(args.tealClearCode);
        if (!approvalProgram || !clearProgram) {
          throw new Error("Error: you must provide an approval program and a clear state program.");
        }
        const applicationCreateTransaction = (0, import_algosdk.makeApplicationCreateTxn)(
          fromAddr,
          suggestedParams,
          onComplete,
          approvalProgram,
          clearProgram,
          args.schema.localInts,
          args.schema.localBytes,
          args.schema.globalInts,
          args.schema.globalBytes,
          this.encodeArguments(args.appArgs),
          ((_b = args.optionalFields) == null ? void 0 : _b.accounts) ? args.optionalFields.accounts : void 0,
          ((_c = args.optionalFields) == null ? void 0 : _c.applications) ? args.optionalFields.applications : void 0,
          ((_d = args.optionalFields) == null ? void 0 : _d.assets) ? args.optionalFields.assets : void 0,
          ((_e = args.optionalFields) == null ? void 0 : _e.note) ? this.toUint8Array(args.optionalFields.note) : void 0
        );
        return {
          transaction: applicationCreateTransaction,
          isLogigSig: false
        };
      } catch (er) {
        throw new Error("There was an error creating the transaction");
      }
    } else {
      throw new Error("Algonaut.js has no account loaded!");
    }
  }
  /**
   * deploys a contract from an lsig account
   * keep in mind that the local and global byte and int values have caps,
   * 16 for local and 32 for global and that the cost of deploying the
   * app goes up based on how many of these slots you want to allocate
   *
   * @param args AlgonautLsigDeployArguments
   * @returns
   */
  async deployTealWithLSig(args) {
    var _a, _b;
    if (args.noteText && args.noteText.length > 511) {
      throw new Error("Your note is too long");
    }
    let encodedArgs = [];
    if (args.appArgs && args.appArgs.length) {
      encodedArgs = this.encodeArguments(args.appArgs);
    }
    const sender = args.lsig.address();
    const onComplete = import_algosdk.OnApplicationComplete.NoOpOC;
    const suggestedParams = ((_a = args.optionalFields) == null ? void 0 : _a.suggestedParams) || await this.algodClient.getTransactionParams().do();
    let approvalProgram = new Uint8Array();
    let clearProgram = new Uint8Array();
    try {
      approvalProgram = await this.compileProgram(args.tealApprovalCode);
      clearProgram = await this.compileProgram(args.tealClearCode);
      if (approvalProgram && clearProgram) {
        const txn = (0, import_algosdk.makeApplicationCreateTxn)(
          sender,
          suggestedParams,
          onComplete,
          approvalProgram,
          clearProgram,
          args.schema.localInts,
          args.schema.localBytes,
          args.schema.globalInts,
          args.schema.globalBytes,
          encodedArgs,
          ((_b = args.optionalFields) == null ? void 0 : _b.accounts) || void 0
        );
        const txId = txn.txID().toString();
        const signedTxn = (0, import_algosdk.signLogicSigTransactionObject)(txn, args.lsig);
        await this.algodClient.sendRawTransaction(signedTxn.blob).do();
        const transactionResponse = await this.algodClient.pendingTransactionInformation(txId).do();
        const appId = transactionResponse["application-index"];
        return {
          status: "success",
          message: "created new app with id: " + appId,
          txId
        };
      } else {
        throw new Error("Error compiling programs.");
      }
    } catch (er) {
      console.error("Error deploying contract:");
      throw new Error(er);
    }
  }
  /**
   * Updates an application with `makeApplicationUpdateTxn`
   * @param args AlgonautUpdateAppArguments
   * @returns atomic transaction that updates the app
   */
  async atomicUpdateApp(args) {
    var _a, _b, _c, _d, _e;
    const fromAddr = this.walletState.activeAddress;
    if (!fromAddr)
      throw new Error("there is no fromAddr");
    if (!args.tealApprovalCode)
      throw new Error("No approval program provided");
    if (!args.tealClearCode)
      throw new Error("No clear program provided");
    if (args.optionalFields && args.optionalFields.note && args.optionalFields.note.length > 1023) {
      throw new Error("Your NOTE is too long, it must be less thatn 1024 Bytes");
    }
    try {
      const suggestedParams = ((_a = args.optionalFields) == null ? void 0 : _a.suggestedParams) || await this.algodClient.getTransactionParams().do();
      let approvalProgram = new Uint8Array();
      let clearProgram = new Uint8Array();
      approvalProgram = await this.compileProgram(args.tealApprovalCode);
      clearProgram = await this.compileProgram(args.tealClearCode);
      if (!approvalProgram || !clearProgram) {
        throw new Error("Error: you must provide an approval program and a clear state program.");
      }
      const applicationCreateTransaction = (0, import_algosdk.makeApplicationUpdateTxn)(
        fromAddr,
        suggestedParams,
        args.appIndex,
        approvalProgram,
        clearProgram,
        this.encodeArguments(args.appArgs),
        ((_b = args.optionalFields) == null ? void 0 : _b.accounts) ? args.optionalFields.accounts : void 0,
        ((_c = args.optionalFields) == null ? void 0 : _c.applications) ? args.optionalFields.applications : void 0,
        ((_d = args.optionalFields) == null ? void 0 : _d.assets) ? args.optionalFields.assets : void 0,
        ((_e = args.optionalFields) == null ? void 0 : _e.note) ? this.toUint8Array(args.optionalFields.note) : void 0
      );
      return {
        transaction: applicationCreateTransaction,
        isLogigSig: false
      };
    } catch (er) {
      throw new Error("There was an error creating the transaction");
    }
  }
  /**
   * Sends an update app transaction
   * @param args AlgonautUpdateAppArguments
   * @param callbacks optional callbacks: `onSign`, `onSend`, `onConfirm`
   * @returns transaction status
   */
  async updateApp(args, callbacks) {
    const { transaction } = await this.atomicUpdateApp(args);
    return await this.sendTransaction(transaction, callbacks);
  }
  /**
   * Compiles TEAL source via [algodClient.compile](https://py-algorand-sdk.readthedocs.io/en/latest/algosdk/v2client/algod.html#v2client.algod.AlgodClient.compile)
   * @param programSource source to compile
   * @returns Promise resolving to Buffer of compiled bytes
   */
  async compileProgram(programSource) {
    const encoder = new TextEncoder();
    const programBytes = encoder.encode(programSource);
    const compileResponse = await this.algodClient.compile(programBytes).do();
    const compiledBytes = new Uint8Array(
      import_buffer.Buffer.from(compileResponse.result, "base64")
    );
    return compiledBytes;
  }
  async atomicSendAlgo(args) {
    var _a, _b;
    if (!(typeof args.amount == "bigint" || typeof args.amount == "number")) {
      throw new Error("Amount has to be a number.");
    }
    if (!args.to)
      throw new Error("You did not specify a to address");
    if (!(0, import_algosdk.isValidAddress)(args.to))
      throw new Error("Invalid to address");
    const fromAddr = args.from || this.walletState.activeAddress;
    if (!fromAddr)
      throw new Error("there is no fromAddr");
    if (fromAddr) {
      const encodedNote = ((_a = args.optionalFields) == null ? void 0 : _a.note) ? this.toUint8Array(args.optionalFields.note) : new Uint8Array();
      const suggestedParams = ((_b = args.optionalFields) == null ? void 0 : _b.suggestedParams) || await this.algodClient.getTransactionParams().do();
      const transaction = (0, import_algosdk.makePaymentTxnWithSuggestedParamsFromObject)({
        from: fromAddr,
        to: args.to,
        amount: args.amount,
        note: encodedNote,
        suggestedParams
      });
      return {
        transaction,
        isLogigSig: false
      };
    } else {
      throw new Error("there is no fromAddr");
    }
  }
  /**
   * Sends ALGO from own account to `args.to`
   *
   * @param args `AlgonautPaymentArgs` object containing `to`, `amount`, and optional `note`
   * @param callbacks optional AlgonautTxnCallbacks
   * @returns Promise resolving to transaction status
   */
  async sendAlgo(args, callbacks) {
    const { transaction } = await this.atomicSendAlgo(args);
    return await this.sendTransaction(transaction, callbacks);
  }
  /**
   * Fetch full account info for an account
   * @param address the accress to read info for
   * @returns Promise of type AccountInfo
   */
  async getAccountInfo(address) {
    if (!address)
      throw new Error("No address provided");
    const accountInfo = await this.algodClient.accountInformation(address).do();
    return accountInfo;
  }
  /**
   * Checks Algo balance of account
   * @param address - Wallet of balance to check
   * @returns Promise resolving to Algo balance
   */
  async getAlgoBalance(address) {
    if (!address)
      throw new Error("No address provided");
    const accountInfo = await this.algodClient.accountInformation(address).do();
    return accountInfo.amount;
  }
  /**
   * Checks token balance of account
   * @param address - Wallet of balance to check
   * @param assetIndex - the ASA index
   * @returns Promise resolving to token balance
   */
  async getTokenBalance(address, assetIndex) {
    if (!address)
      throw new Error("No address provided");
    if (!assetIndex)
      throw new Error("No asset index provided");
    const accountInfo = await this.algodClient.accountInformation(address).do();
    let bal = 0;
    accountInfo.assets.forEach((asset) => {
      if (asset["asset-id"] == assetIndex) {
        bal = asset.amount;
      }
    });
    return bal;
  }
  /**
   * Checks if account has at least one token (before playback)
   * Keeping this here in case this is a faster/less expensive operation than checking actual balance
   * @param address - Address to check
   * @param assetIndex - the index of the ASA
   */
  async accountHasTokens(address, assetIndex) {
    const bal = await this.getTokenBalance(address, assetIndex);
    if (bal > 0) {
      return true;
    } else {
      return false;
    }
  }
  /**
   * Gets global state for an application.
   * @param applicationIndex - the applications index
   * @returns {object} object representing global state
   */
  async getAppGlobalState(applicationIndex) {
    if (!applicationIndex)
      throw new Error("No application ID provided");
    const info = await this.getAppInfo(applicationIndex);
    if (info.hasState) {
      return this.stateArrayToObject(info.globals);
    } else {
      return {};
    }
  }
  /**
   * Gets account local state for an app. Defaults to AnyWallets.activeAddress unless
   * an address is provided.
   * @param applicationIndex the applications index
   */
  async getAppLocalState(applicationIndex, address) {
    if (!applicationIndex)
      throw new Error("No application ID provided");
    const state = {
      hasState: false,
      globals: [],
      locals: [],
      creatorAddress: "",
      index: applicationIndex
    };
    if (this.walletState.activeAddress && !address) {
      address = this.walletState.activeAddress;
    }
    if (address) {
      const accountInfoResponse = await this.algodClient.accountInformation(address).do();
      for (let i = 0; i < accountInfoResponse["apps-local-state"].length; i++) {
        if (accountInfoResponse["apps-local-state"][i].id == applicationIndex) {
          state.hasState = true;
          for (let n = 0; n < accountInfoResponse["apps-local-state"][i]["key-value"].length; n++) {
            const stateItem = accountInfoResponse["apps-local-state"][i]["key-value"][n];
            const key = import_buffer.Buffer.from(stateItem.key, "base64").toString();
            const type = stateItem.value.type;
            let value = void 0;
            let valueAsAddr = "";
            if (type == 1) {
              value = import_buffer.Buffer.from(stateItem.value.bytes, "base64").toString();
              valueAsAddr = (0, import_algosdk.encodeAddress)(import_buffer.Buffer.from(stateItem.value.bytes, "base64"));
            } else if (stateItem.value.type == 2) {
              value = stateItem.value.uint;
            }
            state.locals.push({
              key,
              value: value || "",
              address: valueAsAddr
            });
          }
        }
      }
      return state;
    } else {
      console.warn("Algonaut used in non-authd state, not getting local vars");
    }
  }
  async atomicAssetTransferWithLSig(args) {
    var _a;
    if (args.lsig) {
      const suggestedParams = ((_a = args.optionalFields) == null ? void 0 : _a.suggestedParams) || await this.algodClient.getTransactionParams().do();
      const transaction = (0, import_algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject)({
        from: args.lsig.address(),
        to: args.to,
        amount: args.amount,
        assetIndex: args.assetIndex,
        suggestedParams
      });
      return {
        transaction,
        isLogigSig: true,
        lSig: args.lsig
      };
    } else {
      throw new Error("there is no logic sig object!");
    }
  }
  async atomicPaymentWithLSig(args) {
    var _a;
    if (args.lsig) {
      const suggestedParams = ((_a = args.optionalFields) == null ? void 0 : _a.suggestedParams) || await this.algodClient.getTransactionParams().do();
      const transaction = (0, import_algosdk.makePaymentTxnWithSuggestedParamsFromObject)({
        from: args.lsig.address(),
        to: args.to,
        amount: args.amount,
        suggestedParams
      });
      return {
        transaction,
        isLogigSig: true,
        lSig: args.lsig
      };
    } else {
      throw new Error("there is no account!");
    }
  }
  normalizeTxns(txnOrTxns) {
    logger.log("normalizeTxns", txnOrTxns);
    let txnArr = [];
    if (!Array.isArray(txnOrTxns)) {
      txnArr = [txnOrTxns];
    } else {
      txnArr = txnOrTxns;
    }
    let algoTxnArr = [];
    algoTxnArr = txnArr.map((t) => {
      let nativeT = t.transaction;
      if (nativeT == void 0) {
        nativeT = t;
      }
      return nativeT;
    });
    logger.log("algoTxnArr", [...algoTxnArr]);
    if (algoTxnArr.length > 1) {
      algoTxnArr = import_algosdk.default.assignGroupID(algoTxnArr);
      logger.log("added group id to txn array");
      if (algoTxnArr[0].group) {
        const gId = this.txnBuffToB64(algoTxnArr[0].group);
        logger.log("gId", gId);
      }
    }
    const txnBuffArr = algoTxnArr.map((t) => t.toByte());
    logger.log("txnBuffArr", txnBuffArr);
    return txnBuffArr;
  }
  /**
   * Signs a transaction or multiple w the correct wallet according to AW (does not send / submit txn(s) to network)
   * @param txnOrTxns Either an array of atomic transactions or a single transaction to sign
   * @param signedTxns array of
   * @returns Promise resolving to AlgonautTransactionStatus
   */
  async signTransaction(txnOrTxns) {
    const awTxnsToSign = this.normalizeTxns(txnOrTxns);
    logger.log("awTxnsToSign", awTxnsToSign);
    let awTxnsSigned;
    try {
      awTxnsSigned = await this.walletState.signTransactions(awTxnsToSign);
      logger.log("awTxnsSigned", awTxnsSigned);
    } catch (e) {
      console.warn("err signing txns...");
      logger.log(e);
      throw new Error("Error signing transactions");
    }
    return awTxnsSigned;
  }
  /**
   * Sends a transaction or multiple w the correct wallet according to AW
   * @param txnOrTxns Either an array of atomic transactions or a single transaction to sign
   * @param callbacks Optional object with callbacks - `onSign`, `onSend`, and `onConfirm`
   * @returns Promise resolving to AlgonautTransactionStatus
   */
  async sendTransaction(txnOrTxns, callbacks) {
    const awTxnsSigned = await this.signTransaction(txnOrTxns);
    if (callbacks == null ? void 0 : callbacks.onSign)
      callbacks.onSign(awTxnsSigned);
    const tx = await this.algodClient.sendRawTransaction(awTxnsSigned).do();
    if (callbacks == null ? void 0 : callbacks.onSend)
      callbacks.onSend(tx);
    const txStatus = await this.waitForConfirmation(tx.txId);
    const transactionResponse = await this.algodClient.pendingTransactionInformation(tx.txId).do();
    txStatus.meta = transactionResponse;
    if (callbacks == null ? void 0 : callbacks.onConfirm)
      callbacks.onConfirm(txStatus);
    return txStatus;
  }
  /**
   *
   * @param str string
   * @param enc the encoding type of the string (defaults to utf8)
   * @returns string encoded as Uint8Array
   */
  toUint8Array(str, enc = "utf8") {
    return new Uint8Array(import_buffer.Buffer.from(str, enc));
  }
  /**
   * @deprecated use toUint8Array instead.
   * @param str string
   * @param enc the encoding type of the string (defaults to utf8)
   * @returns string encoded as Uint8Array
   */
  to8Arr(str, enc = "utf8") {
    return this.toUint8Array(str, enc);
  }
  /**
   * Helper function to turn `globals` and `locals` array into more useful objects
   *
   * @param stateArray State array returned from functions like {@link getAppInfo}
   * @returns A more useful object: `{ array[0].key: array[0].value, array[1].key: array[1].value, ... }`
   * TODO add correct typing for this method
   */
  stateArrayToObject(stateArray) {
    const stateObj = {};
    stateArray.forEach((value) => {
      if (value.key)
        stateObj[value.key] = value.value || null;
    });
    return stateObj;
  }
  /**
   * Used for decoding state
   * @param encoded Base64 string
   * @returns Human-readable string
   */
  b64StrToHumanStr(encoded) {
    return import_buffer.Buffer.from(encoded, "base64").toString();
  }
  /**
   * @deprecated Use b64StrToHumanStr instead
   * @param encoded Base64 string
   * @returns Human-readable string
   */
  fromBase64(encoded) {
    return this.b64StrToHumanStr(encoded);
  }
  /**
   * Decodes a Base64-encoded Uint8 Algorand address and returns a string
   * @param encoded An encoded Algorand address
   * @returns Decoded address
   */
  valueAsAddr(encoded) {
    return (0, import_algosdk.encodeAddress)(import_buffer.Buffer.from(encoded, "base64"));
  }
  /**
   * Decodes app state into a human-readable format
   * @param stateArray Encoded app state
   * @returns Array of objects with key, value, and address properties
   */
  decodeStateArray(stateArray) {
    const result = [];
    for (let n = 0; n < stateArray.length; n++) {
      const stateItem = stateArray[n];
      const key = this.b64StrToHumanStr(stateItem.key);
      const type = stateItem.value.type;
      let value = void 0;
      let valueAsAddr = "";
      if (type == 1) {
        value = this.b64StrToHumanStr(stateItem.value.bytes);
        valueAsAddr = this.valueAsAddr(stateItem.value.bytes);
      } else if (stateItem.value.type == 2) {
        value = stateItem.value.uint;
      }
      result.push({
        key,
        value: value || "",
        address: valueAsAddr
      });
    }
    return result;
  }
  /**
   * Does what it says on the tin.
   * @param txn base64-encoded unsigned transaction
   * @returns transaction object
   */
  decodeBase64UnsignedTransaction(txn) {
    return (0, import_algosdk.decodeUnsignedTransaction)(import_buffer.Buffer.from(txn, "base64"));
  }
  /**
   * Describes an Algorand transaction, for display in Inkey
   * @param txn Transaction to describe
   */
  txnSummary(txn) {
    if (txn.type) {
      const to = txn.to ? (0, import_algosdk.encodeAddress)(txn.to.publicKey) : "";
      const from = txn.from ? (0, import_algosdk.encodeAddress)(txn.from.publicKey) : "";
      if (txn.type === "pay") {
        if (txn.amount) {
          return `Send ${(0, import_algosdk.microalgosToAlgos)(txn.amount)} ALGO to ${to}`;
        } else {
          return `Send 0 ALGO to ${to}`;
        }
      } else if (txn.type === "axfer") {
        if (!txn.amount && to === from) {
          return `Opt-in to asset ID ${txn.assetIndex}`;
        } else {
          const amount = txn.amount ? txn.amount : 0;
          return `Transfer ${amount} of asset ID ${txn.assetIndex} to ${to}`;
        }
      } else if (txn.type === "acfg") {
        if (txn.assetUnitName) {
          return `Create asset ${txn.assetName}, symbol ${txn.assetUnitName}`;
        }
        return `Configure asset ${txn.assetIndex}`;
      } else if (txn.type === "afrz") {
        return `Freeze asset ${txn.assetIndex}`;
      } else if (txn.type === "appl") {
        switch (txn.appOnComplete) {
          case 0:
            return `Call to application ID ${txn.appIndex}`;
          case 1:
            return `Opt-in to application ID ${txn.appIndex}`;
          case 2:
            return `Close out application ID ${txn.appIndex}`;
          case 3:
            return `Execute clear state program of application ID ${txn.appIndex}`;
          case 4:
            return `Update application ID ${txn.appIndex}`;
          case 5:
            return `Delete application ID ${txn.appIndex}`;
          default:
            if (txn.appIndex == void 0) {
              return "Create an application";
            } else {
              return `Call to application ID ${txn.appIndex}`;
            }
        }
      } else {
        return `Transaction of type ${txn.type} to ${to}`;
      }
    } else {
      return txn.toString();
    }
  }
  /**
   * Creates a wallet address + mnemonic from account's secret key.
   * Changed in 0.3: this does NOT set algonaut.account.
   * @returns AlgonautWallet Object containing `address` and `mnemonic`
   */
  createWallet() {
    const account = (0, import_algosdk.generateAccount)();
    if (account) {
      const mnemonic = (0, import_algosdk.secretKeyToMnemonic)(account.sk);
      return {
        address: account.addr,
        mnemonic
      };
    } else {
      throw new Error("There was no account: could not create algonaut wallet!");
    }
  }
  /**
   * Recovers account from mnemonic
   * Changed in 0.3: this does NOT set algonaut.account.
   * @param mnemonic Mnemonic associated with Algonaut account
   * @returns If mnemonic is valid, returns algosdk account (.addr, .sk). Otherwise, throws an error.
   */
  recoverAccount(mnemonic) {
    if (!mnemonic)
      throw new Error("No mnemonic provided.");
    try {
      const account = (0, import_algosdk.mnemonicToSecretKey)(mnemonic);
      if ((0, import_algosdk.isValidAddress)(account == null ? void 0 : account.addr)) {
        return account;
      } else {
        throw new Error("Not a valid mnemonic.");
      }
    } catch (error) {
      console.error(error);
      throw new Error("Could not recover account from mnemonic.");
    }
  }
  /**
   * txn(b64) -> txnBuff (buffer)
   * @param txn base64-encoded unsigned transaction
   * @returns trransaction as buffer object
   */
  txnB64ToTxnBuff(txn) {
    return import_buffer.Buffer.from(txn, "base64");
  }
  /**
   * Converts between buff -> b64 (txns)
   * @param buff likely a algorand txn as a Uint8Array buffer
   * @returns string (like for inkey / base64 transmit use)
   */
  txnBuffToB64(buff) {
    return import_buffer.Buffer.from(buff).toString("base64");
  }
  /**
   * Does what it says on the tin.
   * @param txn algorand txn object
   * @returns string (like for inkey / base64 transmit use)
   */
  txnToStr(txn) {
    const buff = txn.toByte();
    return this.txnBuffToB64(buff);
  }
};
var src_default = Algonaut;
var buffer = import_buffer.Buffer;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Algonaut,
  buffer,
  ...require("@thencc/any-wallet")
});
