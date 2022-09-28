import {describe, expect, test, beforeAll, beforeEach, afterEach} from '@jest/globals';
import Algonaut from '../src/index';
import { AlgonautConfig, AlgonautWallet } from '../src/AlgonautTypes';

const validConfig: AlgonautConfig = {
    BASE_SERVER: 'https://testnet-algorand.api.purestake.io/ps2',
    INDEX_SERVER: 'https://testnet-algorand.api.purestake.io/idx2',
    LEDGER: 'TestNet',
    PORT: '',
    API_TOKEN: { 'X-API-Key': 'FAKE_API_TOKEN' }
}

const validConfigInkey: AlgonautConfig = {
    BASE_SERVER: 'https://testnet-algorand.api.purestake.io/ps2',
    INDEX_SERVER: 'https://testnet-algorand.api.purestake.io/idx2',
    LEDGER: 'TestNet',
    PORT: '',
    API_TOKEN: { 'X-API-Key': 'FAKE_API_TOKEN' },
    SIGNING_MODE: 'inkey'
}

// constructor
describe('instantiate Algonau w/o inkey', () => {
    let algonaut: Algonaut;

    beforeEach(() => {
        algonaut = new Algonaut(validConfig);
    });


    test('valid config instantiates algonaut', () => {
        expect(algonaut.config).toBeDefined();
        expect(algonaut.algodClient).toBeDefined();
        expect(algonaut.isValidConfig(validConfig)).toBeTruthy();
    })

    test('inkey should not be used by default', () => {
        expect(algonaut.usingInkeyWallet()).toBeFalsy();
    })

    test('frame bus should not exist by default', () => {
        expect(algonaut.inkeyWallet.frameBus).toBeUndefined();
    });
});

describe('instantiate Algonaut w/ inkey', () => {
    let algonaut: Algonaut;

    beforeEach(() => {
        algonaut = new Algonaut(validConfigInkey);
    });

    test('frame bus should exist when inkey is used', () => {
        expect(algonaut.inkeyWallet.frameBus).toBeDefined();
    })

    test('usingInkeyWallet should return true if INKEY_SRC is set', () => {
        expect(algonaut.usingInkeyWallet()).toBeTruthy();
    })
})

// isValidConfig
describe('isValidConfig tests', () => {
    const invalidConfig = {
        BASE_SERVER: '',
        LEDGER: '',
        PORT: '',
        API_TOKEN: ''
    }
    test('require BASE_SERVER', () => {
        expect(new Algonaut(validConfig).isValidConfig(invalidConfig)).toBeFalsy();
    })
});

// getConfig
// setConfig

// ======= algonaut core ========
describe('offline sync functions', () => {
    var algonaut: Algonaut;

    beforeEach(() => {
        algonaut = new Algonaut(validConfig);
    })

    test('expect account to be undefined by default', () => {
        expect(algonaut.account).toBeUndefined();
    })

    // createWallet
    test('createWallet sets account with a valid wallet with addr and sk params', () => {
        algonaut.createWallet();
        expect(algonaut.account).toBeDefined();
        expect((algonaut.account as any).addr).toBeDefined();
        expect((algonaut.account as any).sk).toBeDefined();
    })

    // recoverAccount
    test('recoverAccount works with a newly created wallet', () => {
        let account = algonaut.createWallet();
        let recoveredAccount: any = algonaut.recoverAccount(account.mnemonic);
        expect(recoveredAccount.addr).toBeDefined();
        expect(recoveredAccount.sk).toBeDefined();
    })

    // decodeBase64UnsignedTransaction
    // decodeStateArray
    // encodeArguments
    // fromBase64
    // signBase64Transactions
    // signTransactionGroup
    // stateArrayToObject
    // setAccount
    // to8Arr
    // txnSummary
    // getAppEscrowAccount
    // valueAsAddr
})

// compileProgram
// accountHasTokens
// atomicAssetTransferWithLSig
// atomicCallApp
// callApp
// atomicCallAppWithLSig
// atomicCloseOutApp
// closeOutApp
// atomicCreateApp
// createApp
// atomicCreateAsset
// createAsset
// atomicDeleteApplication
// deleteApplication
// atomicDeleteAsset
// deleteAsset
// atomicOptInApp
// atomicOptInAsset
// atomicPayment
// atomicPaymentWithLSig
// atomicSendAsset
// atomicUpdateApp
// deployTealWithLSig
// checkStatus
// generateLogicSig
// getAccountInfo
// getAccounts
// getAlgoBalance
// getAppGlobalState
// getAppInfo
// getAppLocalState
// getAssetInfo
// getTokenBalance
// isOptedIntoAsset
// optInApp
// optInAsset
// updateApp
// waitForConfirmation
// sendAlgo
// sendAsset
// sendAtomicTransaction
// sendTransaction

// ========= inkey tests =========
// initInkey
// inkeyConnect
// inkeyDisconnect
// inkeyHide
// inkeyMessageAsync
// inkeySetApp
// inkeyShow
// inkeySignTxns
// setInkeyAccount
// usingInkeyWallet

// ========= other signing methods ======
// createWalletConnectTransactions
// connectToAlgoSigner
// disconnectAlgoWallet
// chainUpdate
// connectAlgoWallet
// killSession
// onConnect
// onDisconnect
// onSessionUpdate
// isAlgoSignerInstalled
// resetApp
// setWalletConnectAccount
// startReqAF
// stopReqAF
// waitForAlgoSignerConfirmation
// usingWalletConnect
// pauseWaitSound
// subscribeToEvents
// sendTxWithAlgoSigner
// sendWalletConnectTxns