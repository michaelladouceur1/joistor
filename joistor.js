/**
 * Function for creating a new Joistor object
 * @param {object} opts - options for configuring joistor object
 * @param {boolean} opts.errorLog - flag for setting if default errors are logged
 * @param {number} opts.historyBuffer - max number of states to store in history
 * @param {boolean} opts.strict - flag for setting type casting during validation checks
 * @returns
 */
function Joistor(opts = { errorLog: true, historyBuffer: 20, strict: false }) {
	let updateHistory = false;

	let schema = {};
	let state = new Proxy({}, stateRegisterProxyHandler());
	let history = { undo: [], redo: [] };

	let onRegisterCallbacks = [];
	let onUnregisterCallbacks = [];
	let onChangeCallbacks = {};
	let onErrorCallbacks = [
		(error, state) => {
			if (opts.errorLog) {
				console.log(error);
			}
		},
	];

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

		executeRegisterCallbacks(field);
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

		executeUnregisterCallbacks(field);
	}

	/**
	 * Add callbacks to be executed after a field is registered
	 * @param {function} callback - callback function to be executed after registering a field
	 * @param {*} callback.field - field being registered
	 * @param {*} callback.state - state after registering field
	 * @example
	 * onRegister((field, state) => console.log(`${field} has been registered`))
	 */
	function onRegister(callback) {
		onRegisterCallbacks.push(callback);
	}

	/**
	 * Add callbacks to be executed after a field is unregistered
	 * @param {function} callback - callback function to be executed after unregistering a field
	 * @param {*} callback.field - field being unregistered
	 * @param {*} callback.state - state after unregistering field
	 * @example
	 * onUnregister((field, state) => console.log(`${field} has been removed`))
	 */
	function onUnregister(callback) {
		onUnregisterCallbacks.push(callback);
	}

	/**
	 * Add callbacks to be executed after a change occurs
	 * @param {string} path - path to the uppermost state field to listen to
	 * @param {function} callback - callback function to call when the field is updated
	 * @param {*} callback.state - state after change occurs
	 * @param {*} callback.field - field that was changed
	 * @param {*} callback.prop - property of the field that was changed
	 * @param {*} callback.value - value that the property was changed to
	 * @example
	 * onChange("user", (state, field, prop, value) => console.log(`${prop} of ${field} was updated to ${value}`))
	 */
	function onChange(path, callback) {
		if (!onChangeCallbacks[path]) onChangeCallbacks[path] = [];
		onChangeCallbacks[path].push(callback);
	}

	/**
	 * Add callbacks to be executed after an error occurs
	 * @param {function} callback - callback function to be executed after unregistering a field
	 * @param {*} callback.error - error message
	 * @param {*} callback.state - state after error occurred
	 * @example
	 * onError((error, state) => logger.error(`Error: ${error} (State: ${state})))
	 */
	function onError(callback) {
		onErrorCallbacks.push(callback);
	}

	/**
	 * Undo the last state change
	 * @example
	 * store.state.user.name = "John Doe"
	 * store.state.user.name = "Jane Doe"
	 * undo()
	 * console.log(store.state.user.name) ==> "John Doe"
	 */
	function undo() {
		if (history.undo.length === 0) return;

		const { removeUndo } = updateUndoHistory();
		const { addRedo } = updateRedoHistory(state);

		const prevState = removeUndo();
		addRedo();

		updateUndoRedoState(prevState);
	}

	/**
	 * Redo the last state change
	 * @example
	 * store.state.user.name = "John Doe"
	 * store.state.user.name = "Jane Doe"
	 * undo()
	 * console.log(store.state.user.name) ==> "John Doe"
	 * redo()
	 * console.log(store.state.user.name) ==> "Jane Doe"
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
			const { error } = validate(obj, prop);
			if (error) {
				if (oldValue) {
					obj[prop] = oldValue;
				} else {
					delete obj[prop];
				}
				executeValidationErrorCallbacks(valid.error);
				return true;
			}

			// add undo history
			addUndo();
			clearRedo();

			// call onChange callbacks
			executeChangeCallbacks(prop);

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
			const { error } = validate(state, baseProp);
			if (error) {
				// undo update
				obj[prop] = oldValue;
				executeValidationErrorCallbacks(valid.error);
				return true;
			}

			// add undo
			addUndo();
			clearRedo();

			// call onChange callbacks
			executeChangeCallbacks(baseProp, prop, value);

			return true;
		}

		return {
			get: stateFieldProxyGetter,
			set: stateFieldProxySetter,
		};
	}

	function executeRegisterCallbacks(field) {
		onRegisterCallbacks.forEach((callback) => callback(field, state));
	}

	function executeUnregisterCallbacks(field) {
		onUnregisterCallbacks.forEach((callback) => callback(field, state));
	}

	function executeChangeCallbacks(field, prop, value) {
		if (onChangeCallbacks[field]) {
			onChangeCallbacks[field].forEach((callback) => callback(state, field, prop, value));
		}
	}

	function executeValidationErrorCallbacks(error) {
		onErrorCallbacks.forEach((callback) => callback(error, state));
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

		// returns { error, value }
		return valid;
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
		onRegister,
		onUnregister,
		onChange,
		onError,
		undo,
		redo,
	};
}

export default Joistor;
