# Testing AlgonautJS


## setup
- install [`taskfile`](https://taskfile.dev/installation/)
	- `brew install go-task/tap/go-task`
- install `dotenv` globally
	- `npm i -g dotenv`
- configure `.env`
	- set NCC_BASE_SERVER, NCC_API_TOKEN, etc
	- FYI env vars need to have prefix `NCC_` to work w vite server


## run tests
1. `task prepare-algonautjs`
	- installs algonautjs deps + builds lib + links pkg locally
2. `task prepare-tests`
	- installs test dir deps + links to local instance of `@thencc/algonautjs`
3. `task tests`
	- runs task called "tests" which runs all tasks defined in yaml
	- FYI, there are many logs... but no errors in the console is a win
	- list all tasks: `task --list`
	- run 1 specific test: `task TASK_NAME`

## testing import/require
`algonautjs` should work in all js/ts contexts. but to be sure, we automate the various types of initializations such as:
- browser
	- esm
		- relative
			- [`./init-browser-esm-relative`](./init-browser-esm-relative)
		- skypack
			- [`./init-browser-esm-skypack`](./init-browser-esm-skypack)
		- vue (ts)
			- [`./init-browser-esm-vue`](./init-browser-esm-vue)
		- react (ts)
			- TODO
	- js cdn
		- TODO?
- node
	- javascript
		- `package.json` > type > `commonjs`
			- [`./init-node-js-cjs`](./init-node-js-cjs)
		- `package.json` > type > `module`
			- [`./init-node-js-esm`](./init-node-js-esm)
	- typescript
		- `package.json` > type > `commonjs`
			- [`./init-node-ts-cjs`](`./init-node-ts-cjs`)
		- `package.json` > type > `module`
			- [`./init-node-ts-esm`](`./init-node-ts-esm`)


## unit tests (TODO)
tests for algonautjs features include:
- `account-recover.js`
- `algo-bal.js`
- `algo-xfr.js`
- `asset-xfr.js`
- `asset-create.js`
- `app-call.js`
- `app-create.js`
- ...

TBD: use jest/mocha/chai for this


## notes
- ...
