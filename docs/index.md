---
layout: default
title: Algonaut.js - Front-end library for Algorand
---

**Algonaut.js** is designed to be a front end developer friendly and browser friendly library to fascilitate intuitive transactions on the Algorand network. Algorand is incredibly fast, powerful and secure, but it's early days and the tooling is still a little intense.

The goal of this library is simplicity and ease of use for the front end crew. This library aims to bring you closer to key concepts behind the mature transactional fiesta that is Algorand though ease of use. If you need a robust contract creation and debugging environment, please take the wonderful Algo Builder for a spin!

## Get Started

Install via NPM:

```npm install algonaut.js --save```

Usage:

<pre><code class="hljs language-javascript">import Algonaut from 'algonaut.js';
const algonaut = new Algonaut({
	BASE_SERVER: 'https://testnet-algorand.api.purestake.io/ps2',
	LEDGER: 'TestNet',
	PORT: '',
	API_TOKEN: { 'X-API-Key': 'YOUR_API_TOKEN' }
});

const account = algonaut.recoverAccount("a mnemonic phrase");
algonaut.setAccount(account);

const txnStatus = await algonaut.sendAlgo("toAddress", 1000, "a note for the transaction");
console.log(txnStatus);</code></pre>

Check out our [examples page](./test/) for much more!