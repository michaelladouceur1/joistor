import Joi from "joi";

function Joistor(opts = { historyBuffer: 20, strict: false }) {
	let updateHistory = false;

	let schema = {};
	let state = new Proxy({}, stateRegisterProxyHandler());
	let history = { undo: [], redo: [] };

	let onChangeCallbacks = {};

	// ========= Public API =========

	/**
	 * Register a new schema and default state
	 * @param {*} schemaObj - joi schema object
	 * @param {*} stateObj - default state object
	 * @example
	 * register({ user: Joi.object({ name: Joi.string().required() }) }, { user: { name: "John Doe" } })
	 */
	function register(schemaObj, stateObj) {
		updateHistory = false;
		const field = Object.keys(schemaObj)[0];
		schema[field] = schemaObj[field];
		state[field] = stateObj[field];
		updateHistory = true;
	}

	/**
	 * Unregister a schema and state
	 * @param {string} field - field to unregister
	 * @example
	 * register({ user: Joi.object({ name: Joi.string().required() }) }, { user: { name: "John Doe" } })
	 * unregister("user")
	 */
	function unregister(field) {
		delete schema[field];
		delete state[field];
	}

	/**
	 *
	 * @param {string} path - path to the uppermost state field to listen to
	 * @param {function} callback - callback function to call when the field is updated
	 * @example
	 * onChange("user", () => console.log("user has been updated"))
	 */
	function onChange(path, callback) {
		if (!onChangeCallbacks[path]) onChangeCallbacks[path] = [];
		onChangeCallbacks[path].push(callback);
	}

	/**
	 * Undo the last state change
	 * @example
	 * store.state.user.name = "John Doe"
	 * store.state.user.name = "Jane Doe"
	 * undo()
	 */
	function undo() {
		if (history.undo.length === 0) return;

		const { removeUndo } = updateUndoHistory();
		const { addRedo } = updateRedoHistory(state);

		const prevState = history.undo.pop();
		addRedo();

		updateUndoRedoState(prevState);
	}

	/**
	 * Redo the last state change
	 * @example
	 * store.state.user.name = "John Doe"
	 * store.state.user.name = "Jane Doe"
	 * undo()
	 * redo()
	 */
	function redo() {
		if (history.redo.length === 0) return;

		const { removeRedo } = updateRedoHistory();
		const { addUndo } = updateUndoHistory(state);

		const nextState = removeRedo();
		addUndo();

		updateUndoRedoState(nextState);
	}

	// ========= Private API =========

	function stateRegisterProxyHandler() {
		function stateRegisterProxyGetter(obj, prop) {
			const props = stateFields(obj);
			if (!props.includes(prop)) return;
			if (Array.isArray(obj[prop]) || typeof obj[prop] === "object") {
				return new Proxy(obj[prop], stateFieldProxyHandler(prop));
			}
			return obj[prop];
		}

		function stateRegisterProxySetter(obj, prop, value) {
			// update history, calling updateHistory() here will save the current state for calling addUndo() later
			const { addUndo } = updateUndoHistory(state);
			const { clearRedo } = updateRedoHistory();

			// save old value and update state
			const oldValue = obj[prop];
			obj[prop] = value;

			// validate state with schema
			const validatedState = validate(obj, prop);
			if (!validatedState) {
				if (oldValue) {
					obj[prop] = oldValue;
				} else {
					delete obj[prop];
				}
				return true;
			}

			// add undo history
			addUndo();
			clearRedo();

			// call onChange callbacks
			executeCallbacks(prop);

			return true;
		}

		return {
			get: stateRegisterProxyGetter,
			set: stateRegisterProxySetter,
		};
	}

	function stateFieldProxyHandler(baseProp) {
		function stateFieldProxyGetter(obj, prop) {
			if (Array.isArray(obj[prop]) || typeof obj[prop] === "object") {
				return new Proxy(obj[prop], stateFieldProxyHandler(baseProp));
			}
			return obj[prop];
		}

		function stateFieldProxySetter(obj, prop, value) {
			// update history, calling updateHistory() here will save the current state for calling addUndo() later
			const { addUndo } = updateUndoHistory(state);
			const { clearRedo } = updateRedoHistory();

			// save old value and update state
			const oldValue = obj[prop];
			obj[prop] = value;

			// validate state with schema
			const validatedState = validate(state, baseProp);
			if (!validatedState) {
				// undo update
				obj[prop] = oldValue;
				return true;
			}

			// add undo
			addUndo();
			clearRedo();

			// call onChange callbacks
			executeCallbacks(baseProp);

			return true;
		}

		return {
			get: stateFieldProxyGetter,
			set: stateFieldProxySetter,
		};
	}

	function executeCallbacks(prop) {
		if (onChangeCallbacks[prop]) {
			onChangeCallbacks[prop].forEach((callback) => callback(state, prop, state[prop]));
		}
	}

	function updateUndoRedoState(newState) {
		const oldStateFields = Object.keys(state);
		const newStateFields = Object.keys(newState);

		const fieldsAreTheSame = oldStateFields.every((field) => newStateFields.includes(field));

		// check if fields are the same
		if (!fieldsAreTheSame) {
			throw new Error("New state fields are not the same as old state fields");
		}

		newStateFields.forEach((field) => {
			// set updateHistory to false to prevent history being updated on the next set of state
			// state is being updated to a previous state, so no need to update history
			updateHistory = false;

			state[field] = newState[field];
		});

		updateHistory = true;
	}

	function updateUndoHistory(obj = {}) {
		const undoObj = JSON.parse(JSON.stringify(obj));
		return {
			addUndo: () => {
				if (!updateHistory) return;
				history.undo.push(undoObj);
				if (history.undo.length > opts.historyBuffer) history.undo.shift();
			},
			removeUndo: () => {
				return history.undo.pop();
			},
		};
	}

	function updateRedoHistory(obj = {}) {
		const redoObj = JSON.parse(JSON.stringify(obj));
		return {
			addRedo: () => {
				if (!updateHistory) return;
				history.redo.push(redoObj);
				if (history.redo.length > opts.historyBuffer) history.redo.shift();
			},
			removeRedo: () => {
				return history.redo.pop();
			},
			clearRedo: () => {
				if (!updateHistory) return;
				history.redo = [];
			},
		};
	}

	function validate(obj, field) {
		if (!schema[field]) {
			console.log(`No schema for ${field}`);
			return;
		}

		let valid;
		if (opts.strict) {
			valid = schema[field].strict().validate(obj[field]);
		} else {
			valid = schema[field].validate(obj[field]);
		}

		const { error, value } = valid;

		if (error) {
			console.log(error);
			return;
		}

		return value;
	}

	function stateFields(obj, fields = []) {
		const keys = Object.keys({ ...obj });
		fields.push(...keys);
		for (const key of keys) {
			if (typeof obj[key] === "object") {
				stateFields(obj[key], fields);
			}
		}
		return fields;
	}

	return {
		state,
		schema,
		history,
		register,
		unregister,
		onChange,
		undo,
		redo,
	};
}

export default Joistor;
