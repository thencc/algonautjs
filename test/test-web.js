import AlgonautJS from '../dist/index.js'

function runTests() {
	console.log('starting tests');
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
}



document.addEventListener('DOMContentLoaded', () => {
	runTests();
});