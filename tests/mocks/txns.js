const algosdk = require('algosdk');

const mockParams = {
    fee: 0,
    firstRound: 24477887,
    flatFee: false,
    genesisHash: "SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=",
    genesisID: "testnet-v1.0",
    lastRound: 24478887
}

const account = algosdk.generateAccount();

const bricksID = 106237109;
const accountAppID = 101088323;

module.exports = {
    bricksID: bricksID,
    accountAppID: accountAppID,
    txnPayment: algosdk.makePaymentTxnWithSuggestedParamsFromObject({ 
        from: account.addr, 
        to: algosdk.generateAccount().addr,
        amount: 111,
        suggestedParams: mockParams
    }),
    txnOptInAsset: algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        from: account.addr,
        to: account.addr,
        suggestedParams: mockParams,
        assetIndex: bricksID,
        amount: 0
    }),
    txnSendAsset: algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        from: account.addr,
        to: algosdk.generateAccount().addr,
        suggestedParams: mockParams,
        assetIndex: bricksID,
        amount: 1
    }),
    txnCreateAsset: algosdk.makeAssetCreateTxnWithSuggestedParams(
        account.addr,
        new Uint8Array(),
        1000,
        3,
        false,
        account.addr,
        account.addr,
        account.addr,
        account.addr,
        'TEST',
        'Test Asset',
        'https://asset.url',
        '',
        mockParams
    ),
    txnCallApp: algosdk.makeApplicationNoOpTxnFromObject({
        from: account.addr,
        suggestedParams: mockParams,
        appIndex: accountAppID,
        // appArgs: [new Uint8Array()]
    }),
    txnOptInApp: algosdk.makeApplicationOptInTxnFromObject({
        from: account.addr,
        appIndex: accountAppID,
        suggestedParams: mockParams
    }),
    txnCloseOutApp: algosdk.makeApplicationCloseOutTxnFromObject({
        from: account.addr,
        suggestedParams: mockParams,
        appIndex: accountAppID,
        // appArgs: [new Uint8Array()]
    }),
    txnDeleteApp: algosdk.makeApplicationDeleteTxn(account.addr, mockParams, accountAppID),
}