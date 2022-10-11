const JSDOM = require('jsdom');
const dom = new JSDOM.JSDOM()
global.document = dom.window.document
global.window = dom.window