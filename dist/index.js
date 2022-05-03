var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __markAsModule = (target) => __defProp(target, "__esModule", { value: true });
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __reExport = (target, module2, copyDefault, desc) => {
  if (module2 && typeof module2 === "object" || typeof module2 === "function") {
    for (let key of __getOwnPropNames(module2))
      if (!__hasOwnProp.call(target, key) && (copyDefault || key !== "default"))
        __defProp(target, key, { get: () => module2[key], enumerable: !(desc = __getOwnPropDesc(module2, key)) || desc.enumerable });
  }
  return target;
};
var __toESM = (module2, isNodeMode) => {
  return __reExport(__markAsModule(__defProp(module2 != null ? __create(__getProtoOf(module2)) : {}, "default", !isNodeMode && module2 && module2.__esModule ? { get: () => module2.default, enumerable: true } : { value: module2, enumerable: true })), module2);
};
var __toCommonJS = /* @__PURE__ */ ((cache) => {
  return (module2, temp) => {
    return cache && cache.get(module2) || (temp = __reExport(__markAsModule({}), module2, 1), cache && cache.set(module2, temp), temp);
  };
})(typeof WeakMap !== "undefined" ? /* @__PURE__ */ new WeakMap() : 0);
var src_exports = {};
__export(src_exports, {
  default: () => Algonaut
});
var import_buffer = require("buffer");
var import_algosdk = __toESM(require("algosdk"));
var import_index_min = __toESM(require("@walletconnect/client/dist/umd/index.min.js"));
var import_algorand_walletconnect_qrcode_modal = __toESM(require("algorand-walletconnect-qrcode-modal"));
var import_utils = require("@json-rpc-tools/utils");
var import_utils2 = require("@walletconnect/utils");
var import_lowtone = __toESM(require("./lowtone"));
var import_finished = __toESM(require("./finished"));
let wcReqAF = 0;
let wcS;
let wcSDone;
class Algonaut {
  algodClient;
  indexerClient = void 0;
  account = void 0;
  address = void 0;
  sKey = void 0;
  mnemonic = void 0;
  config = void 0;
  sdk = void 0;
  uiLoading = false;
  walletConnect = {
    connected: false,
    connector: void 0,
    accounts: [],
    address: "",
    assets: [],
    chain: void 0
  };
  constructor(config) {
    this.config = config;
    this.algodClient = new import_algosdk.default.Algodv2(config.API_TOKEN, config.BASE_SERVER, config.PORT);
    if (config.INDEX_SERVER) {
      this.indexerClient = new import_algosdk.default.Indexer(config.API_TOKEN, config.INDEX_SERVER, config.PORT);
    } else {
      console.warn("No indexer configured because INDEX_SERVER was not provided.");
    }
    this.sdk = import_algosdk.default;
  }
  getConfig() {
    if (this.config)
      return this.config;
    return false;
  }
  async checkStatus() {
    if (!this.getConfig()) {
      throw new Error("No node configuration set.");
    }
    const status = await this.algodClient.status().do();
    console.log("Algorand network status: %o", status);
    return status;
  }
  setAccount(account) {
    if (!account) {
      throw new Error("No account provided.");
    }
    this.account = account;
    this.address = account.addr;
    if (this.config)
      this.config.SIGNING_MODE = "local";
    this.mnemonic = import_algosdk.default.secretKeyToMnemonic(account.sk);
  }
  setWalletConnectAccount(address) {
    if (!address) {
      throw new Error("No address provided.");
    }
    this.account = {
      addr: address,
      sk: new Uint8Array([])
    };
    if (this.config)
      this.config.SIGNING_MODE = "walletconnect";
  }
  createWallet() {
    this.account = import_algosdk.default.generateAccount();
    if (this.account) {
      this.address = this.account.addr;
      this.mnemonic = import_algosdk.default.secretKeyToMnemonic(this.account.sk);
      return {
        address: this.account.addr,
        mnemonic: this.mnemonic || ""
      };
    } else {
      throw new Error("There was no account: could not create algonaut wallet!");
    }
  }
  recoverAccount(mnemonic) {
    if (!mnemonic)
      throw new Error("algonaut.recoverAccount: No mnemonic provided.");
    try {
      this.account = import_algosdk.default.mnemonicToSecretKey(mnemonic);
      if (import_algosdk.default.isValidAddress(this.account?.addr)) {
        if (this.config)
          this.config.SIGNING_MODE = "local";
        return this.account;
      } else {
        throw new Error("Not a valid mnemonic.");
      }
    } catch (error) {
      console.log(error);
      throw new Error("Could not recover account from mnemonic.");
    }
  }
  async waitForConfirmation(txId, limitDelta, log = false) {
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
          console.log("waiting for confirmation");
        }
      } catch (er) {
        console.error(er.response?.text);
      }
      if (pendingInfo["confirmed-round"] !== null && pendingInfo["confirmed-round"] > 0) {
        console.log("Transaction confirmed in round " + pendingInfo["confirmed-round"]);
        returnValue.txId = txId;
        returnValue.status = "success";
        returnValue.message = "Transaction confirmed in round " + pendingInfo["confirmed-round"];
        break;
      }
      lastround++;
    }
    return returnValue;
  }
  generateLogicSig(base64ProgramString) {
    if (!base64ProgramString)
      throw new Error("No program string provided.");
    const program = new Uint8Array(import_buffer.Buffer.from(base64ProgramString, "base64"));
    return new import_algosdk.default.LogicSigAccount(program);
  }
  async atomicOptInAsset(assetIndex) {
    if (!this.account)
      throw new Error("No account set in Algonaut.");
    if (!assetIndex)
      throw new Error("No asset index provided.");
    const params = await this.algodClient.getTransactionParams().do();
    const optInTransaction = import_algosdk.default.makeAssetTransferTxnWithSuggestedParamsFromObject({
      from: this.account.addr,
      to: this.account.addr,
      suggestedParams: params,
      assetIndex,
      amount: 0
    });
    return {
      transaction: optInTransaction,
      transactionSigner: this.account,
      isLogigSig: false
    };
  }
  async optInAsset(assetIndex, callbacks) {
    if (!this.account)
      throw new Error("There was no account!");
    if (!assetIndex)
      throw new Error("No asset index provided.");
    const { transaction } = await this.atomicOptInAsset(assetIndex);
    return await this.sendTransaction(transaction, callbacks);
  }
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
  encodeArguments(args) {
    const encodedArgs = [];
    args.forEach((arg) => {
      if (typeof arg == "number") {
        encodedArgs.push(import_algosdk.default.encodeUint64(arg));
      } else if (typeof arg == "bigint") {
        encodedArgs.push(import_algosdk.default.encodeUint64(arg));
      } else if (typeof arg == "string") {
        encodedArgs.push(new Uint8Array(import_buffer.Buffer.from(arg)));
      }
    });
    return encodedArgs;
  }
  async atomicCreateAsset(args) {
    if (!args.assetName)
      throw new Error("args.assetName not provided.");
    if (!args.symbol)
      throw new Error("args.symbol not provided");
    if (!args.decimals)
      throw new Error("args.decimals not provided.");
    if (!args.amount)
      throw new Error("args.amount not provided.");
    if (!this.account)
      throw new Error("There was no account set in Algonaut");
    if (!args.metaBlock) {
      args.metaBlock = " ";
    }
    if (!args.defaultFrozen)
      args.defaultFrozen = false;
    if (!args.assetURL)
      args.assetURL = void 0;
    const metaBlockLength = args.metaBlock.length;
    if (metaBlockLength > 511) {
      console.error("meta block is " + metaBlockLength);
      throw new Error("drat! this meta block is too long!");
    }
    const enc = new TextEncoder();
    const note = enc.encode(args.metaBlock);
    const addr = this.account.addr;
    const totalIssuance = args.amount;
    const manager = this.account.addr;
    const reserve = this.account.addr;
    const freeze = this.account.addr;
    const clawback = this.account.addr;
    const params = await this.algodClient.getTransactionParams().do();
    const txn = import_algosdk.default.makeAssetCreateTxnWithSuggestedParams(addr, note, totalIssuance, args.decimals, args.defaultFrozen, manager, reserve, freeze, clawback, args.symbol, args.assetName, args.assetURL, args.assetMetadataHash, params);
    return {
      transaction: txn,
      transactionSigner: this.account,
      isLogigSig: false
    };
  }
  async createAsset(args, callbacks) {
    const atomicTxn = await this.atomicCreateAsset(args);
    const txn = atomicTxn.transaction;
    try {
      const assetID = null;
      const txStatus = await this.sendTransaction(txn, callbacks);
      const ptx = await this.algodClient.pendingTransactionInformation(txn.txID().toString()).do();
      txStatus.createdIndex = ptx["asset-index"];
      return txStatus;
    } catch (er) {
      console.log("transaction error");
      console.log(er);
      throw new Error(er);
    }
  }
  async atomicDeleteAsset(assetId) {
    if (!this.account)
      throw new Error("there was no account!");
    if (!assetId)
      throw new Error("No assetId provided!");
    const enc = new TextEncoder();
    const transaction = import_algosdk.default.makeAssetDestroyTxnWithSuggestedParams(this.account.addr, enc.encode("doh!"), assetId, await this.algodClient.getTransactionParams().do());
    return {
      transaction,
      transactionSigner: this.account,
      isLogigSig: false
    };
  }
  async deleteAsset(assetId, callbacks) {
    if (!assetId)
      throw new Error("No asset ID provided!");
    const { transaction } = await this.atomicDeleteAsset(assetId);
    return await this.sendTransaction(transaction, callbacks);
  }
  async atomicSendAsset(args) {
    if (!args.to)
      throw new Error("No to address provided");
    if (!args.assetIndex)
      throw new Error("No asset index provided");
    if (!args.amount)
      throw new Error("No amount provided");
    if (!this.account)
      throw new Error("there is no account!");
    const transaction = import_algosdk.default.makeAssetTransferTxnWithSuggestedParamsFromObject({
      from: this.account.addr,
      to: args.to,
      amount: args.amount,
      assetIndex: args.assetIndex,
      suggestedParams: await this.algodClient.getTransactionParams().do()
    });
    return {
      transaction,
      transactionSigner: this.account,
      isLogigSig: false
    };
  }
  async sendAsset(args, callbacks) {
    if (!this.account)
      throw new Error("There was no account!");
    const { transaction } = await this.atomicSendAsset(args);
    return await this.sendTransaction(transaction, callbacks);
  }
  async getAssetInfo(assetIndex) {
    if (!assetIndex)
      throw new Error("No asset ID provided");
    const info = await this.algodClient.getAssetByID(assetIndex).do();
    return info;
  }
  async atomicOptInApp(args) {
    if (!args.appIndex)
      throw new Error("No app ID provided");
    if (!this.account)
      throw new Error("No account in algonaut");
    const sender = this.account.addr;
    const params = await this.algodClient.getTransactionParams().do();
    const optInTransaction = import_algosdk.default.makeApplicationOptInTxnFromObject({
      from: sender,
      appIndex: args.appIndex,
      suggestedParams: params,
      appArgs: args.appArgs ? this.encodeArguments(args.appArgs) : void 0,
      accounts: args.optionalFields?.accounts ? args.optionalFields?.accounts : void 0,
      foreignApps: args.optionalFields?.applications ? args.optionalFields?.applications : void 0,
      foreignAssets: args.optionalFields?.assets ? args.optionalFields?.assets : void 0
    });
    return {
      transaction: optInTransaction,
      transactionSigner: this.account,
      isLogigSig: false
    };
  }
  async optInApp(args, callbacks) {
    const { transaction } = await this.atomicOptInApp(args);
    return await this.sendTransaction(transaction, callbacks);
  }
  async atomicDeleteApplication(appIndex) {
    if (!this.account)
      throw new Error("No account set.");
    if (!appIndex)
      throw new Error("No app ID provided");
    const sender = this.account.addr;
    const params = await this.algodClient.getTransactionParams().do();
    const txn = import_algosdk.default.makeApplicationDeleteTxn(sender, params, appIndex);
    return {
      transaction: txn,
      transactionSigner: this.account,
      isLogigSig: false
    };
  }
  async deleteApplication(appIndex, callbacks) {
    if (!this.account)
      throw new Error("There was no account");
    try {
      const { transaction } = await this.atomicDeleteApplication(appIndex);
      const txId = transaction.txID().toString();
      const status = await this.sendTransaction(transaction, callbacks);
      const transactionResponse = await this.algodClient.pendingTransactionInformation(txId).do();
      const appId = transactionResponse["txn"]["txn"].apid;
      console.log("Deleted app-id: ", appId);
      return {
        status: "success",
        message: "deleted app index " + appId,
        txId
      };
    } catch (e) {
      console.log(e);
      throw new Error(e.response?.text);
    }
  }
  async atomicCallApp(args) {
    if (!this.account)
      throw new Error("There was no account!");
    if (!args.appIndex)
      throw new Error("Must provide appIndex");
    if (!args.appArgs.length)
      throw new Error("Must provide at least one appArgs");
    const processedArgs = this.encodeArguments(args.appArgs);
    const params = await this.algodClient.getTransactionParams().do();
    const callAppTransaction = import_algosdk.default.makeApplicationNoOpTxnFromObject({
      from: this.account.addr,
      suggestedParams: params,
      appIndex: args.appIndex,
      appArgs: processedArgs,
      accounts: args.optionalFields?.accounts || void 0,
      foreignApps: args.optionalFields?.applications || void 0,
      foreignAssets: args.optionalFields?.assets || void 0
    });
    return {
      transaction: callAppTransaction,
      transactionSigner: this.account,
      isLogigSig: false
    };
  }
  async callApp(args, callbacks) {
    const { transaction } = await this.atomicCallApp(args);
    return await this.sendTransaction(transaction, callbacks);
  }
  async atomicCallAppWithLSig(args) {
    if (!this.account)
      throw new Error("There was no account!");
    if (!args.appIndex)
      throw new Error("Must provide appIndex");
    if (!args.appArgs.length)
      throw new Error("Must provide at least one appArgs");
    const processedArgs = this.encodeArguments(args.appArgs);
    const params = await this.algodClient.getTransactionParams().do();
    const callAppTransaction = import_algosdk.default.makeApplicationNoOpTxnFromObject({
      from: args.lsig.address(),
      suggestedParams: params,
      appIndex: args.appIndex,
      appArgs: processedArgs,
      accounts: args.optionalFields?.accounts || void 0,
      foreignApps: args.optionalFields?.applications || void 0,
      foreignAssets: args.optionalFields?.assets || void 0
    });
    return {
      transaction: callAppTransaction,
      transactionSigner: args.lsig,
      isLogigSig: true
    };
  }
  async atomicCloseOutApp(args) {
    if (!this.account)
      throw new Error("There was no account!");
    if (!args.appIndex)
      throw new Error("Must provide appIndex");
    try {
      const params = await this.algodClient.getTransactionParams().do();
      const processedArgs = this.encodeArguments(args.appArgs);
      const closeOutTxn = import_algosdk.default.makeApplicationCloseOutTxnFromObject({
        from: this.account.addr,
        suggestedParams: params,
        appIndex: args.appIndex,
        appArgs: processedArgs,
        accounts: args.optionalFields?.accounts || void 0,
        foreignApps: args.optionalFields?.applications || void 0,
        foreignAssets: args.optionalFields?.assets || void 0
      });
      return {
        transaction: closeOutTxn,
        transactionSigner: this.account,
        isLogigSig: false
      };
    } catch (e) {
      throw new Error(e);
    }
  }
  async closeOutApp(args, callbacks) {
    const { transaction } = await this.atomicCloseOutApp(args);
    return await this.sendTransaction(transaction, callbacks);
  }
  getAppEscrowAccount(appId) {
    if (!appId)
      throw new Error("No appId provided");
    return import_algosdk.default.getApplicationAddress(appId);
  }
  async getAppInfo(appId) {
    if (!appId)
      throw new Error("No appId provided");
    const info = await this.algodClient.getApplicationByID(appId).do();
    const state = {
      hasState: true,
      globals: [],
      locals: [],
      creatorAddress: info.params.creator,
      index: appId
    };
    if (info.params["global-state"]) {
      state.globals = this.decodeStateArray(info.params["global-state"]);
    }
    return state;
  }
  async createApp(args, callbacks) {
    if (args.optionalFields && args.optionalFields.note && args.optionalFields.note.length > 1023) {
      console.warn("drat! your note is too long!");
      throw new Error("Your note is too long");
    }
    if (!this.account)
      throw new Error("There was no account!");
    if (!args.tealApprovalCode)
      throw new Error("No approval program provided");
    if (!args.tealClearCode)
      throw new Error("No clear program provided");
    if (!args.schema)
      throw new Error("No schema provided");
    try {
      const sender = this.account.addr;
      const params = await this.algodClient.getTransactionParams().do();
      let approvalProgram = new Uint8Array();
      let clearProgram = new Uint8Array();
      approvalProgram = await this.compileProgram(args.tealApprovalCode);
      clearProgram = await this.compileProgram(args.tealClearCode);
      console.log("approval", approvalProgram);
      console.log("clear", clearProgram);
      if (approvalProgram && clearProgram) {
        const txn = import_algosdk.default.makeApplicationCreateTxnFromObject({
          from: sender,
          suggestedParams: params,
          onComplete: import_algosdk.default.OnApplicationComplete.NoOpOC,
          approvalProgram,
          clearProgram,
          numLocalInts: args.schema.localInts,
          numLocalByteSlices: args.schema.localBytes,
          numGlobalInts: args.schema.globalInts,
          numGlobalByteSlices: args.schema.globalBytes,
          appArgs: this.encodeArguments(args.appArgs),
          accounts: args.optionalFields?.accounts ? args.optionalFields.accounts : void 0,
          foreignApps: args.optionalFields?.applications ? args.optionalFields.applications : void 0,
          foreignAssets: args.optionalFields?.assets ? args.optionalFields.assets : void 0,
          note: args.optionalFields?.note ? new Uint8Array(import_buffer.Buffer.from(args.optionalFields.note, "utf8")) : void 0
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
  async atomicCreateApp(args) {
    if (!this.account)
      throw new Error("There was no account!");
    if (!args.tealApprovalCode)
      throw new Error("No approval program provided");
    if (!args.tealClearCode)
      throw new Error("No clear program provided");
    if (!args.schema)
      throw new Error("No schema provided");
    if (args.optionalFields && args.optionalFields.note && args.optionalFields.note.length > 1023) {
      throw new Error("Your NOTE is too long, it must be less thatn 1024 Bytes");
    } else if (this.account) {
      try {
        const sender = this.account.addr;
        const onComplete = import_algosdk.default.OnApplicationComplete.NoOpOC;
        const params = await this.algodClient.getTransactionParams().do();
        let approvalProgram = new Uint8Array();
        let clearProgram = new Uint8Array();
        approvalProgram = await this.compileProgram(args.tealApprovalCode);
        clearProgram = await this.compileProgram(args.tealClearCode);
        if (!approvalProgram || !clearProgram) {
          throw new Error("Error: you must provide an approval program and a clear state program.");
        }
        const applicationCreateTransaction = import_algosdk.default.makeApplicationCreateTxn(sender, params, onComplete, approvalProgram, clearProgram, args.schema.localInts, args.schema.localBytes, args.schema.globalInts, args.schema.globalBytes, this.encodeArguments(args.appArgs), args.optionalFields?.accounts ? args.optionalFields.accounts : void 0, args.optionalFields?.applications ? args.optionalFields.applications : void 0, args.optionalFields?.assets ? args.optionalFields.assets : void 0, args.optionalFields?.note ? new Uint8Array(import_buffer.Buffer.from(args.optionalFields.note, "utf8")) : void 0);
        return {
          transaction: applicationCreateTransaction,
          transactionSigner: this.account,
          isLogigSig: false
        };
      } catch (er) {
        throw new Error("There was an error creating the transaction");
      }
    } else {
      throw new Error("Algonaut.js has no account loaded!");
    }
  }
  async deployTealWithLSig(args) {
    if (args.noteText && args.noteText.length > 511) {
      throw new Error("Your note is too long");
    }
    if (!this.account)
      throw new Error("there was no account");
    let encodedArgs = [];
    if (args.appArgs && args.appArgs.length) {
      encodedArgs = this.encodeArguments(args.appArgs);
    }
    const sender = args.lsig.address();
    const onComplete = import_algosdk.default.OnApplicationComplete.NoOpOC;
    const params = await this.algodClient.getTransactionParams().do();
    let approvalProgram = new Uint8Array();
    let clearProgram = new Uint8Array();
    try {
      approvalProgram = await this.compileProgram(args.tealApprovalCode);
      clearProgram = await this.compileProgram(args.tealClearCode);
      if (approvalProgram && clearProgram) {
        const txn = import_algosdk.default.makeApplicationCreateTxn(sender, params, onComplete, approvalProgram, clearProgram, args.schema.localInts, args.schema.localBytes, args.schema.globalInts, args.schema.globalBytes, encodedArgs, args.optionalFields?.accounts || void 0);
        const txId = txn.txID().toString();
        const signedTxn = import_algosdk.default.signLogicSigTransactionObject(txn, args.lsig);
        await this.algodClient.sendRawTransaction(signedTxn.blob).do();
        const txStatus = await this.waitForConfirmation(txId);
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
  async atomicUpdateApp(args) {
    if (!this.account)
      throw new Error("Algonaut.js has no account loaded!");
    if (!args.tealApprovalCode)
      throw new Error("No approval program provided");
    if (!args.tealClearCode)
      throw new Error("No clear program provided");
    if (args.optionalFields && args.optionalFields.note && args.optionalFields.note.length > 1023) {
      throw new Error("Your NOTE is too long, it must be less thatn 1024 Bytes");
    }
    try {
      const sender = this.account.addr;
      const onComplete = import_algosdk.default.OnApplicationComplete.NoOpOC;
      const params = await this.algodClient.getTransactionParams().do();
      let approvalProgram = new Uint8Array();
      let clearProgram = new Uint8Array();
      approvalProgram = await this.compileProgram(args.tealApprovalCode);
      clearProgram = await this.compileProgram(args.tealClearCode);
      if (!approvalProgram || !clearProgram) {
        throw new Error("Error: you must provide an approval program and a clear state program.");
      }
      const applicationCreateTransaction = import_algosdk.default.makeApplicationUpdateTxn(sender, params, args.appIndex, approvalProgram, clearProgram, this.encodeArguments(args.appArgs), args.optionalFields?.accounts ? args.optionalFields.accounts : void 0, args.optionalFields?.applications ? args.optionalFields.applications : void 0, args.optionalFields?.assets ? args.optionalFields.assets : void 0, args.optionalFields?.note ? new Uint8Array(import_buffer.Buffer.from(args.optionalFields.note, "utf8")) : void 0);
      return {
        transaction: applicationCreateTransaction,
        transactionSigner: this.account,
        isLogigSig: false
      };
    } catch (er) {
      throw new Error("There was an error creating the transaction");
    }
  }
  async updateApp(args, callbacks) {
    const { transaction } = await this.atomicUpdateApp(args);
    return await this.sendTransaction(transaction, callbacks);
  }
  async compileProgram(programSource) {
    const encoder = new TextEncoder();
    const programBytes = encoder.encode(programSource);
    const compileResponse = await this.algodClient.compile(programBytes).do();
    const compiledBytes = new Uint8Array(import_buffer.Buffer.from(compileResponse.result, "base64"));
    return compiledBytes;
  }
  async atomicPayment(args) {
    if (!args.amount)
      throw new Error("You did not specify an amount!");
    if (!args.to)
      throw new Error("You did not specify a to address");
    if (this.account) {
      const encodedNote = args.note ? new Uint8Array(import_buffer.Buffer.from(args.note, "utf8")) : new Uint8Array();
      const transaction = import_algosdk.default.makePaymentTxnWithSuggestedParamsFromObject({
        from: this.account.addr,
        to: args.to,
        amount: args.amount,
        note: encodedNote,
        suggestedParams: await this.algodClient.getTransactionParams().do()
      });
      return {
        transaction,
        transactionSigner: this.account,
        isLogigSig: false
      };
    } else {
      throw new Error("there is no account!");
    }
  }
  async sendAlgo(args, callbacks) {
    if (!this.account)
      throw new Error("there was no account!");
    const { transaction } = await this.atomicPayment(args);
    return await this.sendTransaction(transaction, callbacks);
  }
  async getAccountInfo(address) {
    if (!address)
      throw new Error("No address provided");
    const accountInfo = await this.algodClient.accountInformation(address).do();
    return accountInfo;
  }
  async getAlgoBalance(address) {
    if (!address)
      throw new Error("No address provided");
    const accountInfo = await this.algodClient.accountInformation(address).do();
    return accountInfo.amount;
  }
  async getTokenBalance(address, assetIndex) {
    if (!address)
      throw new Error("No address provided");
    if (!assetIndex)
      throw new Error("No asset index provided");
    const accountInfo = await this.algodClient.accountInformation(address).do();
    let stkBalance = 0;
    accountInfo.assets.forEach((asset) => {
      if (asset["asset-id"] == assetIndex) {
        stkBalance = asset.amount;
      }
    });
    return stkBalance;
  }
  async accountHasTokens(address, assetIndex) {
    return "this is not done yet";
  }
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
  async getAppLocalState(applicationIndex) {
    if (!applicationIndex)
      throw new Error("No application ID provided");
    if (this.account) {
      const state = {
        hasState: false,
        globals: [],
        locals: [],
        creatorAddress: "",
        index: applicationIndex
      };
      const accountInfoResponse = await this.algodClient.accountInformation(this.account?.addr).do();
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
              valueAsAddr = import_algosdk.default.encodeAddress(import_buffer.Buffer.from(stateItem.value.bytes, "base64"));
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
      throw new Error("there is no account");
    }
  }
  async atomicAssetTransferWithLSig(args) {
    if (args.lsig) {
      const transaction = import_algosdk.default.makeAssetTransferTxnWithSuggestedParamsFromObject({
        from: args.lsig.address(),
        to: args.to,
        amount: args.amount,
        assetIndex: args.assetIndex,
        suggestedParams: await this.algodClient.getTransactionParams().do()
      });
      return {
        transaction,
        transactionSigner: args.lsig,
        isLogigSig: true
      };
    } else {
      throw new Error("there is no logic sig object!");
    }
  }
  async atomicPaymentWithLSig(args) {
    if (args.lsig) {
      const transaction = import_algosdk.default.makePaymentTxnWithSuggestedParamsFromObject({
        from: args.lsig.address(),
        to: args.to,
        amount: args.amount,
        suggestedParams: await this.algodClient.getTransactionParams().do()
      });
      return {
        transaction,
        transactionSigner: args.lsig,
        isLogigSig: true
      };
    } else {
      throw new Error("there is no account!");
    }
  }
  async sendTransaction(txnOrTxns, callbacks) {
    if (!this.account)
      throw new Error("There is no account");
    if (this.config && this.config.SIGNING_MODE && this.config.SIGNING_MODE === "walletconnect") {
      if (Array.isArray(txnOrTxns)) {
        return await this.sendWalletConnectTxns(txnOrTxns, callbacks);
      } else {
        if (txnOrTxns.transaction) {
          return await this.sendWalletConnectTxns([txnOrTxns], callbacks);
        } else {
          return await this.sendWalletConnectTxns([{
            transaction: txnOrTxns,
            transactionSigner: this.account,
            isLogigSig: false
          }], callbacks);
        }
      }
    } else {
      if (Array.isArray(txnOrTxns)) {
        return await this.sendAtomicTransaction(txnOrTxns, callbacks);
      } else {
        let txn;
        if (txnOrTxns && txnOrTxns.transaction) {
          txn = txnOrTxns.transaction;
        } else {
          txn = txnOrTxns;
        }
        if (!this.account || !this.account.sk)
          throw new Error("");
        const signedTxn = txn.signTxn(this.account.sk);
        if (callbacks?.onSign)
          callbacks.onSign(signedTxn);
        const tx = await this.algodClient.sendRawTransaction(signedTxn).do();
        if (callbacks?.onSend)
          callbacks.onSend(signedTxn);
        const txId = tx.txId || tx.id || tx.txId().toString();
        console.log("Transaction ID: " + txId);
        const txStatus = await this.waitForConfirmation(txId);
        if (callbacks?.onConfirm)
          callbacks.onConfirm(signedTxn);
        return txStatus;
      }
    }
  }
  async sendAtomicTransaction(transactions, callbacks) {
    try {
      const txns = [];
      const signed = [];
      transactions.forEach((txn) => {
        txns.push(txn.transaction);
      });
      const txnGroup = import_algosdk.default.assignGroupID(txns);
      transactions.forEach((txn, i) => {
        let signedTx;
        if (txn.isLogigSig) {
          signedTx = import_algosdk.default.signLogicSigTransaction(txnGroup[i], txn.transactionSigner);
        } else {
          signedTx = import_algosdk.default.signTransaction(txnGroup[i], txn.transactionSigner.sk);
        }
        signed.push(signedTx.blob);
      });
      if (callbacks?.onSign)
        callbacks.onSign(signed);
      const tx = await this.algodClient.sendRawTransaction(signed).do();
      if (callbacks?.onSend)
        callbacks.onSend(tx);
      const txStatus = await this.waitForConfirmation(tx.txId);
      const transactionResponse = await this.algodClient.pendingTransactionInformation(tx.txId).do();
      txStatus.meta = transactionResponse;
      if (callbacks?.onConfirm)
        callbacks.onConfirm(txStatus);
      return txStatus;
    } catch (e) {
      console.error("Error sending atomic transaction:");
      throw new Error(e);
    }
  }
  async sendWalletConnectTxns(walletTxns, callbacks) {
    if (this.walletConnect.connected) {
      this.startReqAF();
      let txns = walletTxns.map((txn) => txn.transaction);
      if (walletTxns.length > 1) {
        txns = import_algosdk.default.assignGroupID(txns);
      }
      const txnsToSign = txns.map((txn) => {
        const encodedTxn = import_buffer.Buffer.from(import_algosdk.default.encodeUnsignedTransaction(txn)).toString("base64");
        return {
          txn: encodedTxn,
          message: "txn description"
        };
      });
      const requestParams = [txnsToSign];
      const request = (0, import_utils.formatJsonRpcRequest)("algo_signTxn", requestParams);
      let result;
      try {
        result = await this.walletConnect.connector?.sendCustomRequest(request);
      } catch (er) {
        throw new Error("You canceled the transaction");
      }
      const signedPartialTxns = result.map((r, i) => {
        if (r == null) {
          throw new Error(`Transaction at index ${i}: was not signed when it should have been`);
        }
        const rawSignedTxn = import_buffer.Buffer.from(r, "base64");
        return new Uint8Array(rawSignedTxn);
      });
      if (callbacks?.onSign)
        callbacks.onSign(signedPartialTxns);
      if (signedPartialTxns) {
        let tx;
        try {
          tx = await this.algodClient.sendRawTransaction(signedPartialTxns).do();
        } catch (er) {
          tx = er;
          console.error("Error sending raw transaction");
          throw new Error(er);
        }
        if (callbacks?.onSend)
          callbacks.onSend(tx);
        const txStatus = await this.waitForConfirmation(tx.txId);
        const transactionResponse = await this.algodClient.pendingTransactionInformation(tx.txId).do();
        txStatus.meta = transactionResponse;
        if (callbacks?.onConfirm)
          callbacks.onConfirm(txStatus);
        this.stopReqAF(true);
        return txStatus;
      } else {
        throw new Error("there were no signed transactions returned");
        this.stopReqAF();
      }
    } else {
      throw new Error("There is no wallet connect session");
    }
  }
  usingWalletConnect() {
    if (this.config && this.config.SIGNING_MODE && this.config.SIGNING_MODE === "walletconnect") {
      return true;
    }
    return false;
  }
  async createWalletConnectTransactions(transactions) {
    const txns = [];
    transactions.forEach((txn) => {
      txns.push(txn.transaction);
    });
    return txns;
  }
  async sendTxWithAlgoSigner(params) {
    try {
      await this.connectToAlgoSigner();
      const txParams = await window.AlgoSigner.algod({
        ledger: params.LEDGER,
        path: "/v2/transactions/params"
      });
      const signedTx = await window.AlgoSigner.sign({
        assetIndex: params.assetIndex || null,
        from: params.from,
        to: params.to,
        amount: +params.amount,
        note: params.note || "",
        type: params.type,
        fee: txParams["min-fee"],
        firstRound: txParams["last-round"],
        lastRound: txParams["last-round"] + 1e3,
        genesisID: txParams["genesis-id"],
        genesisHash: txParams["genesis-hash"],
        flatFee: true
      });
      const tx = window.AlgoSigner.send({
        ledger: params.LEDGER,
        tx: signedTx.blob
      });
      return this.waitForAlgoSignerConfirmation(tx);
    } catch (error) {
      console.log(error);
      throw new Error("Error sending transaction: " + JSON.stringify(error));
    }
  }
  async waitForAlgoSignerConfirmation(tx) {
    console.log(`Transaction ${tx.txId} waiting for confirmation...`);
    let status = await window.AlgoSigner.algod({
      ledger: "TestNet",
      path: "/v2/transactions/pending/" + tx.txId
    });
    while (true) {
      if (status["confirmed-round"] !== null && status["confirmed-round"] > 0) {
        console.log(`Transaction confirmed in round ${status["confirmed-round"]}.`);
        break;
      }
      status = await window.AlgoSigner.algod({
        ledger: "TestNet",
        path: "/v2/transactions/pending/" + tx.txId
      });
    }
    return tx;
  }
  async disconnectAlgoWallet() {
    if (this.walletConnect.connected) {
      this.walletConnect.connector?.killSession();
    }
  }
  async connectAlgoWallet(clientListener) {
    if ((0, import_utils2.isNode)()) {
      console.warn("NOTE: this lib isnt made for using wallet connect in node yet...");
      return;
    }
    if (!clientListener)
      clientListener = void 0;
    const bridge = "https://bridge.walletconnect.org";
    const wcConnector = new import_index_min.default({
      bridge,
      qrcodeModal: import_algorand_walletconnect_qrcode_modal.default
    });
    wcConnector.on("disconnect", () => {
      console.log("session update");
    });
    this.walletConnect.connector = wcConnector;
    if (!this.walletConnect.connector.connected) {
      this.walletConnect.connector.createSession();
      this.startReqAF();
    }
    this.subscribeToEvents(clientListener);
  }
  subscribeToEvents(clientListener) {
    if (!this.walletConnect.connector) {
      return;
    }
    this.walletConnect.connector.on("session_update", async (error, payload) => {
      console.log('connector.on("session_update")');
      if (error) {
        throw error;
      }
      const { accounts } = payload.params[0];
      if (clientListener)
        clientListener.onSessionUpdate(payload);
      this.onSessionUpdate(accounts);
    });
    this.walletConnect.connector.on("connect", (error, payload) => {
      console.log('connector.on("connect")');
      if (error) {
        throw error;
      }
      if (clientListener)
        clientListener.onConnect(payload);
      this.onConnect(payload);
    });
    this.walletConnect.connector.on("disconnect", (error, payload) => {
      console.log('connector.on("disconnect")');
      if (error) {
        console.log(payload);
        throw error;
      }
      if (clientListener)
        clientListener.onDisconnect(payload);
      this.onDisconnect();
    });
    if (this.walletConnect.connector.connected) {
      const { accounts } = this.walletConnect.connector;
      const address = accounts[0];
      this.walletConnect.connected = true;
      this.walletConnect.accounts = accounts;
      this.walletConnect.address = address;
      this.onSessionUpdate(accounts);
    }
  }
  async killSession() {
    if (this.walletConnect.connector) {
      this.walletConnect.connector.killSession();
    }
    this.resetApp();
  }
  async chainUpdate(newChain) {
    this.walletConnect.chain = newChain;
  }
  async resetApp() {
    console.log("reset app called");
    console.log("TBD!");
  }
  startReqAF() {
    if ((0, import_utils2.isBrowser)()) {
      const keepAlive = () => {
        const qrIsOpen = document.querySelector("#walletconnect-qrcode-modal");
        if (!qrIsOpen) {
          this.stopReqAF();
          return;
        }
        wcReqAF = requestAnimationFrame(keepAlive);
      };
      requestAnimationFrame(keepAlive);
      wcReqAF = 1;
      wcS = new Audio();
      wcS.src = import_lowtone.default;
      wcS.autoplay = true;
      wcS.volume = 0.6;
      wcS.loop = true;
      wcS.play();
      wcSDone = new Audio();
      wcSDone.src = import_finished.default;
      wcSDone.volume = 0.1;
      wcSDone.play();
      wcSDone.pause();
    }
  }
  stopReqAF(playSound) {
    if (wcReqAF) {
      cancelAnimationFrame(wcReqAF);
      wcReqAF = 0;
      wcS.pause();
      if (playSound) {
        wcSDone.play();
      }
    } else {
      console.log("no wcReqAF to cancel");
    }
  }
  pauseWaitSound() {
    wcS.pause();
  }
  async onConnect(payload) {
    const { accounts } = payload.params[0];
    const address = accounts[0];
    this.setWalletConnectAccount(address);
    this.walletConnect.connected = true;
    this.walletConnect.accounts = accounts;
    this.walletConnect.address = address;
    this.stopReqAF(true);
  }
  onDisconnect() {
    this.walletConnect.connected = false;
    this.walletConnect.accounts = [];
    this.walletConnect.address = "";
    this.account = void 0;
    this.stopReqAF();
  }
  async onSessionUpdate(accounts) {
    this.walletConnect.address = accounts[0];
    this.walletConnect.accounts = accounts;
    this.setWalletConnectAccount(accounts[0]);
  }
  stateArrayToObject(stateArray) {
    const stateObj = {};
    stateArray.forEach((value) => {
      if (value.key)
        stateObj[value.key] = value.value || null;
    });
    return stateObj;
  }
  fromBase64(encoded) {
    return import_buffer.Buffer.from(encoded, "base64").toString();
  }
  valueAsAddr(encoded) {
    return import_algosdk.default.encodeAddress(import_buffer.Buffer.from(encoded, "base64"));
  }
  decodeStateArray(stateArray) {
    const result = [];
    for (let n = 0; n < stateArray.length; n++) {
      const stateItem = stateArray[n];
      const key = this.fromBase64(stateItem.key);
      const type = stateItem.value.type;
      let value = void 0;
      let valueAsAddr = "";
      if (type == 1) {
        value = this.fromBase64(stateItem.value.bytes);
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
  isAlgoSignerInstalled() {
    return typeof window.AlgoSigner !== "undefined";
  }
  async connectToAlgoSigner() {
    return await window.AlgoSigner.connect();
  }
  async getAccounts(ledger) {
    await this.connectToAlgoSigner();
    const accounts = await window.AlgoSigner.accounts({ ledger });
    return accounts;
  }
}
module.exports = __toCommonJS(src_exports);
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {});
//# sourceMappingURL=index.js.map
