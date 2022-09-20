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
		stylesheet.setAttribute('id', 'inkey-frame-styles');
		stylesheet.innerText = this.getStyles();
		document.head.appendChild(stylesheet);

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
	async initSrc(src = 'http://default-src.com') {
		console.log('initSrc', src);

		const exEl = document.querySelector('iframe#inkey-frame');
		if (exEl) {
			console.warn('dont mount frame to DOM again');
			return;
		}

		this.destroy(); // reset

		this.initing = true;

		// make element
		const walElContainer = document.createElement('div');
		walElContainer.setAttribute('id', 'inkey-frame-container');
		const walEl = document.createElement('iframe');
		walEl.src = src;
		walEl.classList.add('inkey-frame');
		walEl.setAttribute('id', 'inkey-frame');
		walEl.setAttribute('allow', 'clipboard-write'); // needed to copy stuff to clipboard
		walEl.setAttribute('name', 'walFrame');
		walEl.setAttribute('title', 'Algorand Microwallet');
		walEl.setAttribute('frameborder', '0');
		walEl.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-modals allow-popups allow-downloads');
		walEl.setAttribute('allow', 'publickey-credentials-get');
		// walEl.setAttribute('allow', 'publickey-credentials-create'); // gah, wish this existed...
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

			// success
			this.ready = true;
			this.initing = false;
			this.onMsgHandler = this.onMessage.bind(this);
			window.addEventListener('message', this.onMsgHandler, false);
		});

		// make it stick to top.
		// we can't use position: fixed here because `perspective` on the `body` element breaks it
		window.addEventListener('scroll', function () {
			walEl.style.top = window.scrollY + 'px';
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
		this.destroying = true;

		if (this.walElContainer) {
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

		// remove injected style tag
		const styleEl = document.querySelector('style#inkey-frame-styles');
		if (styleEl) {
			document.head.removeChild(styleEl);
		}

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
		};

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

	getStyles(): string {
		return `#inkey-frame-container {
			position: fixed;
			top: 0;
			left: 0;
			width: 100vw;
			perspective: 800px;
			perspective-origin: center top;
			z-index: 10001;
		}

		.inkey-frame {
			position: absolute;
			top: 0;
			left: 4px;
			width: calc(100vw - 8px);
			height: 400px;
			border-radius: 0 0 4px 4px;
			box-shadow: 0 -2px 20px rgba(0,0,0,0.4);
			opacity: 0;
			will-change: opacity, transform;
			transition: 0.2s transform ease-out, 0.1s opacity linear, visibility 0.2s linear;
			transform-origin: center top;
			transform: translate3d(0px, 0px, -350px) rotateX(70deg);
			visibility: hidden;
		}

		.inkey-frame.visible {
			opacity: 1;
			transform: translate3d(0px, 0px, 0px) rotateX(0deg);
			visibility: visible;
		}

		@media screen and (min-width: 500px) {
			.inkey-frame {
				max-width: 400px;
				left: calc(50% - 200px);
			}
		}`;
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
