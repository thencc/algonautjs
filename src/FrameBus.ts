// [parent-window]<->[iframe] communications class
export class FrameBus {
	ready: boolean = false;
	initing = false; // for async init w initSrc

	walEl: null | HTMLIFrameElement = null;
	walWin: null | Window = null;
	onMsgHandler: null | ((event: MessageEvent<any>) => void) = null; // need a reference to onMsgHandler since .bind(this) makes a new instance of that method and removeEventListener needs the real thing

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
					this.initSrc(config.src);
				} else {
					console.error('err constructing FrameBus');
				}
			} else {
				console.error('err constructing FrameBus');
			}
		}

		// insert styles
		const stylesheet = document.createElement('style');
		stylesheet.innerText = this.getStyles();
		document.head.appendChild(stylesheet);
	}

	initId(walElId: string) {
		console.log('initId');

		this.destroy(); // reset

		const walEl = document.getElementById(walElId) as null | HTMLIFrameElement;
		// console.log('walEl', walEl);
		if (!walEl) {
			console.error('no walEl');
			return;
		}
		this.walEl = walEl;

		const walWin = walEl.contentWindow;
		walEl.classList.add('hippo-frame');
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
	async initSrc(src = 'http://default-src.com') {
		console.log('initSrc', src);

		this.destroy(); // reset

		this.initing = true;

		// make element
		const walEl = document.createElement('iframe');
		walEl.src = src;
		// walEl.setAttribute('style', `
		// 	position: fixed;
		// 	top: 100px;
		// 	left: 0;
		// 	width: 100vw;
		// 	height: 100vh;
		// 	transition: 0.1s top ease-out;
		// 	box-shadow: 0 -2px 20px rgba(0,0,0,0.4);`
		// );
		walEl.classList.add('hippo-frame');
		walEl.setAttribute('allow', 'clipboard-write'); // needed to copy stuff to clipboard
		walEl.setAttribute('name', 'walFrame');
		walEl.setAttribute('title', 'Algorand Microwallet');
		walEl.setAttribute('frameborder', '0');
		walEl.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-modals allow-popups');
		walEl.setAttribute('allow', 'publickey-credentials-get');
		// walEl.setAttribute('allow', 'publickey-credentials-create'); // gah, wish this existed...
		this.walEl = walEl;
		// mount el
		document.body.append(walEl);

		// get iframe window
		const walWin = walEl.contentWindow;
		if (!walWin) {
			console.error('no walWin');
			return;
		}
		this.walWin = walWin;

		walEl.addEventListener('load', () => {
			// console.log('iframe loaded');

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
		}
	}

	hideFrame() {
		if (this.walEl) {
			this.walEl.classList.remove('visible');
		}
	}

	destroy() {
		// console.log('destroy FrameBus');

		if (this.walEl) {
			document.body.removeChild(this.walEl);
			this.walEl = null;
		}

		if (this.walWin) {
			this.walWin = null;
		}

		if (this.onMsgHandler) {
			window.removeEventListener('message', this.onMsgHandler, false);
			this.onMsgHandler = null;
		}

		this.ready = false;
		this.initing = false;
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

	onMessage(event: MessageEvent) {
		// console.log('client onMess', event);

		if (
			event.data.source &&
			event.data.source == 'ncc-hippo-wallet') {
			// event.data.source.substring(0, 4) == 'ncc-') {
			// event.data.source.substring(0, 16) == 'ncc-hippo-wallet') {
			console.log('client got mess', event.data);

			// handle hide messages
			if (event.data.type === 'hide') {
				this.hideFrame();
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
		console.log('emit to wallet iframe');

		if (!this.ready) {
			// console.error('FrameBus not ready, please init first');
			// return;
			throw new Error('FrameBus not ready');
		}

		const uuid = new Date().getTime().toString();

		data = {
			...data,
			uuid,
		}

		this.walWin?.postMessage(data, this.walEl!.src);
	}

	// TODO shoudl we also support emitCb(data: any, cb()?: CallbackFn) -- combined w normal? can they all be 1 definition?
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

		this.walWin?.postMessage(data, this.walEl!.src);

		return new Promise<T>((resolve) => {
			// this.requests.set(uuid, resolve); // works
			this.requests.set(uuid, { req: data, resolve }); // works, more info
		});
	}

	getStyles(): string {
		return `.hippo-frame {
			position: fixed;
			top: -450px;
			left: 0;
			width: 100vw;
			height: 400px;
			transition: 0.2s top ease-out;
			box-shadow: 0 -2px 20px rgba(0,0,0,0.4);
			z-index: 10001;
		}

		.hippo-frame.visible {
			top: 0;
			transition: 0.2s top ease-out;
		}

		@media screen and (min-width: 500px) {
			.hippo-frame {
				max-width: 400px;
				left: calc(50% - 200px);
			}
		}`;
	}

	// wallet needs to handle asyncMessages like...
	/**
	 * 	event.source?.postMessage({
			source: 'ncc-hippo-wallet',
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
