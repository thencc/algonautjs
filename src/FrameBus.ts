/* eslint-disable @typescript-eslint/indent */

import type { AlgonautConfig } from './AlgonautTypes';

// [parent-window]<->[iframe] communications class
export class FrameBus {
	ready = false;
	initing = false; // for async init w initSrc
	destroying = false;

	// this iframe
	walEl: null | any = null; // should be HTMLIFrameElement but that breaks in a Node env
	// container for iframe 3d persp
	walElContainer: null | any = null; // should be HTMLIFrameElement but that breaks in a Node env
	walWin: null | Window = null;
	// need a reference to onMsgHandler since .bind(this) makes a new instance of that method and removeEventListener needs the real thing
	onMsgHandler: null | ((event: any) => void) = null; // `event` param should be MessageEvent<any> type, but that breaks in Node env

	requests = new Map<
		string,
		{
			req: Record<string, any>,
			resolve: (value: any) => void
		}
	>();

	constructor(config?:
		string | // existing wallElId
		{
			id?: string, // existing wallElId
			src?: string; //
			align?: AlgonautConfig['INKEY_ALIGN']
		}
	) {
		if (!config) {
			this.initSrc(); // aka INSERT into DOM
		} else {
			if (typeof config == 'string') {
				this.initId(config);
			} else if (typeof config == 'object') {
				if (config.id) {
					this.initId(config.id);
				} else if (config.src) {
					this.initSrc(config.src, config.align);
				} else {
					console.error('err constructing FrameBus');
				}
			} else {
				console.error('err constructing FrameBus');
			}
		}

		// catch case where user/script deletes el from DOM, close/reset properly
		document.body.addEventListener('DOMNodeRemoved', (evt) => {
			if (!this.destroying) {
				const removedNode = evt.target;
				if (removedNode == this.walElContainer) {
					console.log('iframe container removed from DOM');
					this.destroy();
				}
			}
		}, false);
	}

	initId(walElId: string) {
		console.log('initId');
		console.warn('WARNING: initId is less tested + supported than initSrc...');

		this.destroy(); // reset

		const walEl = document.getElementById(walElId) as null | HTMLIFrameElement;
		// console.log('walEl', walEl);
		if (!walEl) {
			console.error('no walEl');
			return;
		}
		this.walEl = walEl;

		const walWin = walEl.contentWindow;
		walEl.classList.add('inkey-frame');
		// console.log('walWin', walWin);
		if (!walWin) {
			console.error('no walWin');
			return;
		}
		this.walWin = walWin;

		// success
		this.ready = true;
		this.onMsgHandler = this.onMessage.bind(this);
		window.addEventListener('message', this.onMsgHandler, false);
	}

	// aka INSERT into DOM
	async initSrc(src = 'http://default-src.com', align?: AlgonautConfig['INKEY_ALIGN']) {
		console.log('initSrc', src);

		const exEl = document.querySelector('iframe#inkey-frame');
		if (exEl) {
			console.warn('dont mount frame to DOM again');
			return;
		}

		this.destroy(); // reset

		this.initing = true;

		// make container el (positioning + 3d transform wrapper)
		const walElContainer = document.createElement('div');
		walElContainer.setAttribute('id', 'inkey-frame-container');
		if (align == 'left') walElContainer.classList.add('align-left');
		if (align == 'right') walElContainer.classList.add('align-right');

		// make iframe el
		const walEl = document.createElement('iframe');
		walEl.src = src;
		walEl.classList.add('inkey-frame');
		walEl.setAttribute('id', 'inkey-frame');
		walEl.setAttribute('name', 'walFrame');
		walEl.setAttribute('title', 'Algorand Microwallet');
		walEl.setAttribute('frameborder', '0');
		walEl.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-modals allow-popups allow-downloads');
		walEl.setAttribute('allow', 'publickey-credentials-get; clipboard-write');
		// walEl.setAttribute('allow', 'publickey-credentials-create'); // gah, wish this existed...
		walEl.style.visibility = 'hidden'; // mount as invisible, real css added later

		// settings locals for easy access for later (should this happen on event listener load? might be safer in case init get caught in strange halfway mounted state)
		this.walEl = walEl;
		this.walElContainer = walElContainer;
		// mount el
		walElContainer.appendChild(walEl);
		document.body.append(walElContainer);

		// get iframe window
		const walWin = walEl.contentWindow;
		if (!walWin) {
			console.error('no walWin');
			return;
		}
		this.walWin = walWin;

		walEl.addEventListener('load', () => {
			// console.log('iframe loaded');

			// 100ms delay needed for no glitch on first load
			setTimeout(() => {
				this.walEl.style.visibility = 'initial';
			}, 100);

			// success
			this.ready = true;
			this.initing = false;
			this.onMsgHandler = this.onMessage.bind(this);
			window.addEventListener('message', this.onMsgHandler, false);
		});
	}

	showFrame() {
		if (this.walEl) {
			this.walEl.classList.add('visible');

			const data: any = {
				// needed
				source: 'ncc-inkey-client',
				// specific
				type: 'set-visibility',
				payload: {
					visible: true
				}
			};
			this.emit(data);
		}
	}

	hideFrame() {
		if (this.walEl) {
			this.walEl.classList.remove('visible');

			const data: any = {
				// needed
				source: 'ncc-inkey-client',
				// specific
				type: 'set-visibility',
				payload: {
					visible: false
				}
			};
			this.emit(data);
		}
	}

	setHeight(height: number, unit = 'px') {
		if (this.walEl) {
			this.walEl.style.height = `${height}${unit}`;
		}
	}

	destroy() {
		// console.log('destroy FrameBus');
		this.destroying = true;

		if (this.walElContainer) {
			if (this.walEl) {
				this.walElContainer.removeChild(this.walEl);
			}
			document.body.removeChild(this.walElContainer);
			this.walElContainer = null;
		}

		if (this.walEl) {
			this.walEl = null;
		}

		if (this.walWin) {
			this.walWin = null;
		}

		if (this.onMsgHandler) {
			window.removeEventListener('message', this.onMsgHandler, false);
			this.onMsgHandler = null;
		}

		this.removeStyles();

		// ? emit some disconnect event over bus before close?

		this.ready = false;
		this.initing = false;
		this.destroying = false;
	}

	// async ready for waiting for iframe to mount + load into DOM
	async isReady(): Promise<boolean> {
		return new Promise((resolve) => {
			if (this.ready) {
				resolve(true);
			} else {
				if (this.initing) {
					const readyInterval = setInterval(() => {
						console.log('isReady intervaling');
						if (this.ready) {
							clearInterval(readyInterval);
							resolve(true);
						}
					}, 150);
				} else {
					console.warn('do initSrc again');
					resolve(false);
				}
			}
		});
	}

	public setOnDisconnect(f: any) {
		this.onDisconnect = f;
	}
	onDisconnect() {
		console.log('onDisconnect');
	}

	onMessage(event: any) { // should be MessageEvent, but that breaks in a Node env
		// console.log('client onMess', event);

		if (
			event.data.source &&
			event.data.source == 'ncc-inkey-wallet') {
			// event.data.source.substring(0, 4) == 'ncc-') {
			// event.data.source.substring(0, 16) == 'ncc-inkey-wallet') {
			console.log('client got mess', event.data);

			// handle hide messages
			if (event.data.type === 'hide') {
				this.hideFrame();
			}

			if (event.data.type === 'disconnect') {
				this.onDisconnect();
			}

			if (event.data.type === 'set-height') {
				// console.log('got mess: set-height');
				const h = event.data.payload.height as number;
				if (h) {
					this.setHeight(h);
				}
			}

			if (event.data.type == 'styles-recommonded') {
				const css = event.data.payload.css as string;
				this.insertStyles(css);
			}


			// async message handling back to callee resolver
			if (event.data['async'] && event.data.async == true && event.data.uuid) {
				// console.log('requests', this.requests);
				// console.log('getting', event.data.uuid);

				const outgoing = this.requests.get(event.data.uuid); // "this" is still Class scope because of .bind(this)
				if (!outgoing) {
					throw Error('no outgoing val for event type');
				}

				// clean up garb
				this.requests.delete(event.data.uuid);

				const resolve = outgoing.resolve;
				resolve(event.data.payload);
			}
		}
	}

	// TODO only have 1 emit method, just check for data.async == true, then add to requests queue
	// simple sync emit (dont to add to async response queue)
	emit(data: Record<string, any>) {
		// console.log('emit to wallet iframe');

		if (!this.ready) {
			// console.error('FrameBus not ready, please init first');
			// return;
			throw new Error('FrameBus not ready');
		}

		const uuid = new Date().getTime().toString();

		data = {
			...data,
			uuid,
		};

		if (this.walEl && this.walWin) {
			this.walWin.postMessage(data, this.walEl.src);
		} else {
			throw new Error('no wallEl or walWin');
		}
	}

	// TODO should we also support emitCb(data: any, cb()?: CallbackFn) -- combined w normal? can they all be 1 definition?
	// TODO in algonaut make asyncEmit private so we can abstract asyncEmit method to asyncSendTxn(wrapping asyncEmit...) and all args are type safe

	// async emit
	emitAsync<T>(data: Record<string, any>) {
		console.log('emitAsync');

		if (!this.ready) {
			throw new Error('FrameBus not ready');
		}

		const uuid = new Date().getTime().toString();

		data = {
			...data,
			uuid,
			async: true
		};

		if (this.walEl && this.walWin) {
			this.walWin.postMessage(data, this.walEl.src);
		} else {
			throw new Error('no wallEl or walWin');
		}

		return new Promise<T>((resolve) => {
			// this.requests.set(uuid, resolve); // works
			this.requests.set(uuid, { req: data, resolve }); // works, more info
		});
	}

	insertStyles(css: string) {
		// console.log('insertStyles', css);

		// TODO verifiy check + sterilize this incoming arg

		// insert styles (if not there)
		const existingStyles: HTMLStyleElement | null = document.querySelector('style#inkey-frame-styles');
		if (!existingStyles) {
			const stylesheet = document.createElement('style');
			stylesheet.setAttribute('id', 'inkey-frame-styles');
			stylesheet.innerText = css;
			document.head.appendChild(stylesheet);
		} else {
			// replace styles into existing style tag
			existingStyles.innerText = css;
		}

		if (this.walEl) {
			// 100ms delay needed for no glitch on first load
			setTimeout(() => {
				this.walEl.style.visibility = 'initial';
			}, 100);
		}

	}

	removeStyles() {
		// remove injected style tag
		const styleEl = document.querySelector('style#inkey-frame-styles');
		if (styleEl) {
			document.head.removeChild(styleEl);
		}
	}

	// wallet needs to handle asyncMessages like...
	/**
	 * 	event.source?.postMessage({
			source: 'ncc-inkey-wallet',
			payload: {
				type: 'async works?',
				a: 'AAA',
				b: 'bbb'
			},

			//
			async: true, // send back a flag saying this was an async emit
			uuid: event.data.uuid // SEND BACK THE SAME UUID
		}, {
			targetOrigin: event.origin // works
		});
	 */
}
