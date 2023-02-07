import { deepStrictEqual } from "assert";

import Joi from "joi";
import Joistor from "../joistor.js";

const DEFAULT_SCHEMA_SYSTEM = {
	system: Joi.object({
		id: Joi.number(),
		name: Joi.string().allow(""),
	}),
};

const DEFAULT_SCHEMA_WORKSPACE = {
	workspace: Joi.object({
		id: Joi.number(),
		name: Joi.string().allow(""),
		sequence: Joi.array().items(Joi.number()),
	}),
};

const SYSTEM_STATE_1 = { id: 0, name: "" };
const SYSTEM_STATE_2 = { id: 1, name: "test" };
const SYSTEM_STATE_3 = { id: 1, name: "test2" };

const WORKSPACE_STATE_1 = { id: 0, name: "", sequence: [] };
const WORKSPACE_STATE_2 = { id: 1, name: "test", sequence: [0, 1] };
const WORKSPACE_STATE_3 = { id: 1, name: "test", sequence: [0, 1, 2, 3, 4, 5] };

const INVALID_SYSTEM_STATE_1 = { id: "invalid", name: "" };

let store;

describe("Joistor", () => {
	beforeEach(() => (store = Joistor()));
	afterEach(() => (store = undefined));

	it("registers a new schema and default state", () => {
		// register schema and state and check that they have been added
		store.register(DEFAULT_SCHEMA_SYSTEM, { system: SYSTEM_STATE_1 });
		deepStrictEqual(store.schema, DEFAULT_SCHEMA_SYSTEM);
		deepStrictEqual(store.state, { system: SYSTEM_STATE_1 });
	});

	it("state and schema is unregistered", () => {
		// register schema and state and check that they have been added
		store.register(DEFAULT_SCHEMA_SYSTEM, { system: SYSTEM_STATE_1 });
		deepStrictEqual(Object.keys(store.schema).length, 1);
		deepStrictEqual(Object.keys(store.state).length, 1);
		deepStrictEqual(store.schema, DEFAULT_SCHEMA_SYSTEM);
		deepStrictEqual(store.state, { system: SYSTEM_STATE_1 });

		// unregister and check that the schema and state have been removed
		store.unregister("system");
		deepStrictEqual(Object.keys(store.schema).length, 0);
		deepStrictEqual(Object.keys(store.state).length, 0);
		deepStrictEqual(store.schema, {});
		deepStrictEqual(store.state, {});
	});

	it("onChange events are called when a state field is updated", () => {
		// register schema and state and check that they have been added
		store.register(DEFAULT_SCHEMA_SYSTEM, { system: SYSTEM_STATE_1 });
		deepStrictEqual(store.schema, DEFAULT_SCHEMA_SYSTEM);
		deepStrictEqual(store.state, { system: SYSTEM_STATE_1 });

		// register onChange event and check that it is called when the state is updated
		let onChangeSystem = false;
		store.onChange("system", () => {
			onChangeSystem = true;
		});
		store.state.system = { ...SYSTEM_STATE_2 };
		deepStrictEqual(onChangeSystem, true);

		let onChangeSystemName = false;
		store.onChange("system", () => {
			onChangeSystemName = true;
		});
		store.state.system.name = SYSTEM_STATE_3.name;
		deepStrictEqual(onChangeSystemName, true);
	});

	it("state is updated", () => {
		// register both system and workspace and check that the history is empty
		store.register(DEFAULT_SCHEMA_SYSTEM, { system: SYSTEM_STATE_1 });
		store.register(DEFAULT_SCHEMA_WORKSPACE, { workspace: WORKSPACE_STATE_1 });
		deepStrictEqual(store.state, { system: { ...SYSTEM_STATE_1 }, workspace: { ...WORKSPACE_STATE_1 } });

		// update the system and check that the state is updated
		store.state.system = { ...SYSTEM_STATE_2 };
		deepStrictEqual(store.state.system, SYSTEM_STATE_2);
		deepStrictEqual(store.state, { system: { ...SYSTEM_STATE_2 }, workspace: { ...WORKSPACE_STATE_1 } });

		// update the system again and check that the state is updated
		store.state.system.name = SYSTEM_STATE_3.name;
		deepStrictEqual(store.state.system, SYSTEM_STATE_3);
		deepStrictEqual(store.state, { system: { ...SYSTEM_STATE_3 }, workspace: { ...WORKSPACE_STATE_1 } });

		// update the workspace and check that the state is updated
		store.state.workspace = { ...WORKSPACE_STATE_2 };
		deepStrictEqual(store.state.workspace, WORKSPACE_STATE_2);
		deepStrictEqual(store.state, { system: { ...SYSTEM_STATE_3 }, workspace: { ...WORKSPACE_STATE_2 } });

		// update the workspace again and check that the state is updated
		store.state.workspace.sequence = WORKSPACE_STATE_3.sequence;
		deepStrictEqual(store.state.workspace, WORKSPACE_STATE_3);
		deepStrictEqual(store.state, { system: { ...SYSTEM_STATE_3 }, workspace: { ...WORKSPACE_STATE_3 } });

		// update the system and workspace and check that the state is updated
		store.state.system = { ...SYSTEM_STATE_1 };
		deepStrictEqual(store.state.system, SYSTEM_STATE_1);
		deepStrictEqual(store.state, { system: { ...SYSTEM_STATE_1 }, workspace: { ...WORKSPACE_STATE_3 } });
	});

	it("state is not updated when invalid", () => {
		// register system
		store.register(DEFAULT_SCHEMA_SYSTEM, { system: SYSTEM_STATE_1 });

		// update the system with an invalid value and check that the state is not updated
		store.state.system = { ...INVALID_SYSTEM_STATE_1 };
		deepStrictEqual(store.state.system, SYSTEM_STATE_1);
	});

	it("history is updated", () => {
		// register  system  and check that the history is empty
		store.register(DEFAULT_SCHEMA_SYSTEM, { system: SYSTEM_STATE_1 });
		deepStrictEqual(store.history.undo.length, 0);
		deepStrictEqual(store.history.redo.length, 0);

		// update the system and check that the history is updated
		store.state.system = { ...SYSTEM_STATE_2 };
		deepStrictEqual(store.history.undo.length, 1);
		deepStrictEqual(store.history.redo.length, 0);

		// update the system again and check that the history is updated
		store.state.system.name = SYSTEM_STATE_3.name;
		deepStrictEqual(store.history.undo.length, 2);
		deepStrictEqual(store.history.redo.length, 0);
	});

	it("state is updated when undo is called", () => {
		// register system and check that the history is empty
		store.register(DEFAULT_SCHEMA_SYSTEM, { system: SYSTEM_STATE_1 });
		deepStrictEqual(store.history.undo.length, 0);
		deepStrictEqual(store.history.redo.length, 0);

		// update the system more than once and check that the history is updated to n-times updated
		// state must be updated to the final value of the last update

		store.state.system = { ...SYSTEM_STATE_2 };
		deepStrictEqual(store.history.undo.length, 1);
		deepStrictEqual(store.history.redo.length, 0);
		deepStrictEqual(store.state.system, SYSTEM_STATE_2);

		store.state.system.name = SYSTEM_STATE_3.name;
		deepStrictEqual(store.history.undo.length, 2);
		deepStrictEqual(store.history.redo.length, 0);
		deepStrictEqual(store.state.system, SYSTEM_STATE_3);

		// undo the last update and check that the history is updated to previous state
		store.undo();
		deepStrictEqual(store.history.undo.length, 1);
		deepStrictEqual(store.history.redo.length, 1);
		deepStrictEqual(store.state.system, SYSTEM_STATE_2);

		// undo again and check that the history is updated to previous state
		store.undo();
		deepStrictEqual(store.history.undo.length, 0);
		deepStrictEqual(store.history.redo.length, 2);
		deepStrictEqual(store.state, { system: SYSTEM_STATE_1 });
	});

	it("state is updated when redo is called", () => {
		// register system and check that the history is empty
		store.register(DEFAULT_SCHEMA_SYSTEM, { system: SYSTEM_STATE_1 });
		deepStrictEqual(store.history.undo.length, 0);
		deepStrictEqual(store.history.redo.length, 0);

		// update the system more than once and check that the history is updated to n-times updated
		// state must be updated to the final value of the last update

		store.state.system = { ...SYSTEM_STATE_2 };
		deepStrictEqual(store.history.undo.length, 1);
		deepStrictEqual(store.history.redo.length, 0);
		deepStrictEqual(store.state.system, SYSTEM_STATE_2);

		store.state.system.name = SYSTEM_STATE_3.name;
		deepStrictEqual(store.history.undo.length, 2);
		deepStrictEqual(store.history.redo.length, 0);
		deepStrictEqual(store.state.system, SYSTEM_STATE_3);

		// undo the last update and check that the history is updated to previous state
		store.undo();
		deepStrictEqual(store.history.undo.length, 1);
		deepStrictEqual(store.history.redo.length, 1);
		deepStrictEqual(store.state.system, SYSTEM_STATE_2);

		// redo the last update and check that the history is updated to previous state
		store.redo();
		deepStrictEqual(store.history.undo.length, 2);
		deepStrictEqual(store.history.redo.length, 0);
		deepStrictEqual(store.state.system, SYSTEM_STATE_3);
	});
});
