import { CirqlOptions } from "../types";
import { CirqlBaseImpl } from "./base";
import { ConnectionStatus, Surreal } from "surrealdb";

type RequiredOptions = Required<CirqlOptions>;

/**
 * A wrapper class which provides all Cirql functionality on top of surrealdb.js.
 * 
 * If no surreal handle is provided, a new one will be created and configured to
 * emit the following events:
 * - open: The connection was successfully opened 
 * - close: The connection was closed
 * - error: An error occured in the connection
 * 
 * You can retrieve the underlying surreal handle using the `handle` property.
 */
export class Cirql extends CirqlBaseImpl {

	readonly options: RequiredOptions;

	#surreal: Surreal;

	constructor(options?: CirqlOptions);
	constructor(surreal: Surreal, options?: CirqlOptions);
	constructor(surrealOrOptions?: Surreal | CirqlOptions, options?: CirqlOptions) {
		super({
			onQuery: (query, params) => this.handle!.query(query, params),
			onRequest: () => !!this.handle && this.handle.status == ConnectionStatus.Connected,
			onLog: (query, params) => {
				if (this.options.logging) {
					this.options.logPrinter?.(query, params);
				}
			}
		});

		let handle: Surreal;
		let opts: CirqlOptions;

		if (surrealOrOptions instanceof Surreal) {
			opts = options || {};
			handle = surrealOrOptions;
		} else {
			opts = surrealOrOptions || {};
			handle = new Surreal();
			handle.emitter.subscribe("connected", () => this.dispatchEvent(new Event('open')));
			handle.emitter.subscribe("disconnected", () => this.dispatchEvent(new Event('close')));
			handle.emitter.subscribe("error", () => this.dispatchEvent(new Event('error')));
		}

		this.#surreal = handle;

		this.options = {
			logging: false,
			logPrinter: (query) => console.log(query),
			...opts
		};
	}

	/**
	 * Returns the underlying surrealdb.js handle
	 */
	get handle() {
		return this.#surreal;
	}

}