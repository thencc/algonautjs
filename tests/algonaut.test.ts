import {describe, expect, test, beforeAll, beforeEach, afterEach} from '@jest/globals';

import Algonaut from '../src/index';
import { utils } from '../src/index';

import { accountAppID, bricksID, txnCallApp, txnCloseOutApp, txnCreateAsset, txnDeleteApp, txnOptInApp, txnOptInAsset, txnPayment, txnSendAsset } from './mocks/txns';

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
describe('getConfig()', () => {
    test('getConfig returns config object', () => {
        const algonaut = new Algonaut(validConfig);
        expect(algonaut.getConfig()).toEqual(validConfig);
    });

    test('getConfig returns false if Algonaut is not configured', () => {
        expect(Algonaut.prototype.getConfig()).toBeFalsy();
    });
});

// setConfig
describe('setConfig()', () => {
    test('setConfig tests are covered by constructor tests', () => {
        expect(true).toBeTruthy();
    });
});

// ======= algonaut core ========
describe('Algonaut core: offline sync methods', () => {
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

    test('utils.createAccount also works', () => {
        var wallet = utils.createWallet();
        expect(wallet).toBeDefined();
        expect(typeof wallet.address).toBe('string');
        expect(typeof wallet.mnemonic).toBe('string');
    });

    // recoverAccount
    test('recoverAccount works with a newly created wallet', () => {
        let account = algonaut.createWallet();
        let recoveredAccount: any = algonaut.recoverAccount(account.mnemonic);
        expect(recoveredAccount.addr).toBeDefined();
        expect(recoveredAccount.sk).toBeDefined();
    })

    test('utils.recoverAccount also works', () => {
        const wallet = utils.createWallet();
        let recoveredAccount: any = utils.recoverAccount(wallet.mnemonic);
        expect(recoveredAccount.addr).toBeDefined();
        expect(recoveredAccount.sk).toBeDefined();
    })

    // decodeBase64UnsignedTransaction
    // decodeStateArray
    // encodeArguments
    // fromBase64
    test('fromBase64 decodes base64-encoded text', () => {
        expect(algonaut.fromBase64('SGVsbG8gV29ybGQ=')).toBe('Hello World');
    })

    test('utils.fromBase64 decodes base64-encoded text', () => {
        expect(utils.fromBase64('SGVsbG8gV29ybGQ=')).toBe('Hello World');
    })
    // signBase64Transactions
    // signTransactionGroup
    // stateArrayToObject
    // setAccount
    // to8Arr
    test('to8Arr returns Uint8Array', () => {
        expect(algonaut.to8Arr('test note')).toBeInstanceOf(Uint8Array);
    })

    test('utils.to8Arr returns Uint8Array', () => {
        expect(utils.to8Arr('test note')).toBeInstanceOf(Uint8Array);
    })

    // txnSummary
    describe('txnSummary tests', () => {
        test('txnSummary takes in a txn and returns a string', () => {
            const summary = utils.txnSummary(txnPayment);
            expect(typeof summary).toBe('string');
        })

        test('identifies payment txn', () => {
            const summary = utils.txnSummary(txnPayment);
            expect(summary.includes('Send')).toBeTruthy();
        })

        test('identifies opt in asset txn', () => {
            const summary = utils.txnSummary(txnOptInAsset);
            expect (summary.includes(`Opt-in to asset ID ${bricksID}`)).toBeTruthy();
        })

        test('identifies asset xfer', () => {
            const summary = utils.txnSummary(txnSendAsset);
            expect(summary.includes(`Transfer 1 of asset ID ${bricksID}`)).toBeTruthy();
        })

        test('identifies create asset', () => {
            const summary = utils.txnSummary(txnCreateAsset);
            expect(summary.includes(`Create asset Test Asset, symbol TEST`)).toBeTruthy();
        })

        test('identifies call app', () => {
            const summary = utils.txnSummary(txnCallApp);
            expect(summary.includes(`Call to application ID ${accountAppID}`)).toBeTruthy();
        })

        test('identifies opt in app', () => {
            const summary = utils.txnSummary(txnOptInApp);
            expect(summary.includes(`Opt-in to application ID ${accountAppID}`)).toBeTruthy();
        })

        test('identifies close out app', () => {
            const summary = utils.txnSummary(txnCloseOutApp);
            expect(summary.includes(`Close out application ID ${accountAppID}`)).toBeTruthy();
        })

        test('identifies delete app', () => {
            const summary = utils.txnSummary(txnDeleteApp);
            expect(summary.includes(`Delete application ID ${accountAppID}`)).toBeTruthy();
        })

        // test('identifies update app', () => {
        //     const summary = utils.txnSummary(txnUpdateApp);
        //     expect(summary.includes(`Update application ID ${accountAppID}`)).toBeTruthy();
        // })
    })

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