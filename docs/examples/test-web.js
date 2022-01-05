
import AlgonautJS from '../dist/index.js'


const algonaut = new AlgonautJS({
    BASE_SERVER: 'https://testnet-algorand.api.purestake.io/ps2',
    LEDGER: 'TestNet',
    PORT: '',
    API_TOKEN: { 'X-API-Key': 'AsSjpC4Q8k5LXOsdJPsvN7Ee8auHi6DD2oubt1Ln' },
    SIGNING_MODE: 'wallet-connect'
  });

  // testnet account for testing.  PEOPLE, SERIOUSLY, DO NOT ACTUALLY USE THIS ACCOUNT for anything other than testing!
  // 7P7VKJDENG3S2WJZXBY776DYXDIACK7AH4QCXXST73TWCG2XGVIZGTKFVU
  // wine slice height claw science approve know egg task chase story boost lonely confirm purpose rack kite soldier proud opinion wish pencil hire abstract blade

  algonaut.recoverAccount('wine slice height claw science approve know egg task chase story boost lonely confirm purpose rack kite soldier proud opinion wish pencil hire abstract blade');

async function runTests() {
	console.log('starting tests');


  const escrow = algonaut.getAppEscrowAccount(49803676);

  console.log(escrow);
  // LSJOD5C26OTW5VZIG4KF43UTU4UZY7LGXTGWMW366ZDBSFND4MZDX66HHI


  const accountInfo = await algonaut.getAccountInfo('LSJOD5C26OTW5VZIG4KF43UTU4UZY7LGXTGWMW366ZDBSFND4MZDX66HHI');
  console.log("account info is", accountInfo);


  // call bricks oracle on test net: 49584323
  const bricksInfo = await algonaut.getAppInfo(49584323);

  bricksInfo.globals.forEach((kv) => {
    if (kv.key == 'bricks_per_algo')
    console.log(kv.value)
  });

}

let wcListner = {
  onSessionUpdate: function (payload) {
    console.log('on session update');
  },
	onConnect: function (payload) {
    console.log('on connect');
  },
	onDisconnect: function (payload) {
    console.log('on disconnct');
  }
};

function testWCConnect(event) {
  console.log('testing WC connect');
  console.log(event);

  algonaut.connectAlgoWallet(wcListner)

}

async function testWCTransaction() {

  console.log('testing WC Transaction');

  const txns = await algonaut.createWalletConnectTransactions([
    await algonaut.atomicOptInASA(49528267)
  ]);

  const res = await algonaut.sendWalletConnectTxns(txns);

}

document.addEventListener('DOMContentLoaded', () => {
	runTests();

  document.getElementById('wc-connect').addEventListener('click', (e) => {
    testWCConnect(e);
  });

  document.getElementById('wc-transact').addEventListener('click', async (e) => {
    console.log('transact');
    await testWCTransaction();
  });


  document.getElementById('example-1').addEventListener('click', async (e) => {
    setLog('example-1', '');
    const status = await algonaut.checkStatus();
    setLog('example-1', status);
  })

});

function setLog(id, content) {
  document.getElementById('log-' + id).innerHTML = content;
}