const JSDOM = require('jsdom');
const dom = new JSDOM.JSDOM();
global.document = dom.window.document;
global.window = dom.window;

// localStorage shim
const localStorageMock = {
	getItem: jest.fn(),
	setItem: jest.fn(),
	clear: jest.fn()
};
global.localStorage = localStorageMock;