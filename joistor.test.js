import { strictEqual, deepStrictEqual } from "assert";
import Joi from "joi";

import { test } from "../src/test.js";
import { State } from "./state.js";

const DATE = new Date();

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

start();

async function start() {
  await test("state is registered", testRegisterState);
  await test("state is unregisterd", testUnregisterState);
  await test("onChange events are called when a state field is updated", testOnChangeState);
  await test("state is updated", testUpdateState);
  // await test("state of array of objects is updated", testUpdateStateArrayOfObjects);
  await test("state is not updated when invalid", testInvalidUpdateState);
  await test("history is updated", testUpdateHistory);
  await test("state is updated when undo is called", testUndoState);
  await test("state is updated when redo is called", testRedoState);
}

function testRegisterState() {
  const state = State();

  // register schema and state and check that they have been added
  state.register(DEFAULT_SCHEMA_SYSTEM, { system: SYSTEM_STATE_1 });
  deepStrictEqual(state.schema, DEFAULT_SCHEMA_SYSTEM);
  deepStrictEqual(state.state, { system: SYSTEM_STATE_1 });
}

function testUnregisterState() {
  const state = State();

  // register schema and state and check that they have been added
  state.register(DEFAULT_SCHEMA_SYSTEM, { system: SYSTEM_STATE_1 });
  deepStrictEqual(Object.keys(state.schema).length, 1);
  deepStrictEqual(Object.keys(state.state).length, 1);
  deepStrictEqual(state.schema, DEFAULT_SCHEMA_SYSTEM);
  deepStrictEqual(state.state, { system: SYSTEM_STATE_1 });

  // unregister and check that the schema and state have been removed
  state.unregister("system");
  deepStrictEqual(Object.keys(state.schema).length, 0);
  deepStrictEqual(Object.keys(state.state).length, 0);
  deepStrictEqual(state.schema, {});
  deepStrictEqual(state.state, {});
}

function testOnChangeState() {
  const state = State();

  // register schema and state and check that they have been added
  state.register(DEFAULT_SCHEMA_SYSTEM, { system: SYSTEM_STATE_1 });
  deepStrictEqual(state.schema, DEFAULT_SCHEMA_SYSTEM);
  deepStrictEqual(state.state, { system: SYSTEM_STATE_1 });

  // register onChange event and check that it is called when the state is updated
  let onChangeSystem = false;
  state.onChange("system", () => {
    onChangeSystem = true;
  });
  state.state.system = { ...SYSTEM_STATE_2 };
  deepStrictEqual(onChangeSystem, true);

  let onChangeSystemName = false;
  state.onChange("system", () => {
    onChangeSystemName = true;
  });
  state.state.system.name = SYSTEM_STATE_3.name;
  deepStrictEqual(onChangeSystemName, true);
}

function testUpdateState() {
  const state = State();

  // register both system and workspace and check that the history is empty
  state.register(DEFAULT_SCHEMA_SYSTEM, { system: SYSTEM_STATE_1 });
  state.register(DEFAULT_SCHEMA_WORKSPACE, { workspace: WORKSPACE_STATE_1 });
  deepStrictEqual(state.state, { system: { ...SYSTEM_STATE_1 }, workspace: { ...WORKSPACE_STATE_1 } });

  // update the system and check that the state is updated
  state.state.system = { ...SYSTEM_STATE_2 };
  deepStrictEqual(state.state.system, SYSTEM_STATE_2);
  deepStrictEqual(state.state, { system: { ...SYSTEM_STATE_2 }, workspace: { ...WORKSPACE_STATE_1 } });

  // update the system again and check that the state is updated
  state.state.system.name = SYSTEM_STATE_3.name;
  deepStrictEqual(state.state.system, SYSTEM_STATE_3);
  deepStrictEqual(state.state, { system: { ...SYSTEM_STATE_3 }, workspace: { ...WORKSPACE_STATE_1 } });

  // update the workspace and check that the state is updated
  state.state.workspace = { ...WORKSPACE_STATE_2 };
  deepStrictEqual(state.state.workspace, WORKSPACE_STATE_2);
  deepStrictEqual(state.state, { system: { ...SYSTEM_STATE_3 }, workspace: { ...WORKSPACE_STATE_2 } });

  // update the workspace again and check that the state is updated
  state.state.workspace.sequence = WORKSPACE_STATE_3.sequence;
  deepStrictEqual(state.state.workspace, WORKSPACE_STATE_3);
  deepStrictEqual(state.state, { system: { ...SYSTEM_STATE_3 }, workspace: { ...WORKSPACE_STATE_3 } });

  // update the system and workspace and check that the state is updated
  state.state.system = { ...SYSTEM_STATE_1 };
  deepStrictEqual(state.state.system, SYSTEM_STATE_1);
  deepStrictEqual(state.state, { system: { ...SYSTEM_STATE_1 }, workspace: { ...WORKSPACE_STATE_3 } });
}

function testUpdateStateArrayOfObjects() {
  const state = State();
  deepStrictEqual(true, false);
}

function testInvalidUpdateState() {
  const state = State();

  // register system
  state.register(DEFAULT_SCHEMA_SYSTEM, { system: SYSTEM_STATE_1 });

  // update the system with an invalid value and check that the state is not updated
  state.state.system = { ...INVALID_SYSTEM_STATE_1 };
  deepStrictEqual(state.state.system, SYSTEM_STATE_1);
}

function testUpdateHistory() {
  const state = State();

  // register  system  and check that the history is empty
  state.register(DEFAULT_SCHEMA_SYSTEM, { system: SYSTEM_STATE_1 });
  deepStrictEqual(state.history.undo.length, 0);
  deepStrictEqual(state.history.redo.length, 0);

  // update the system and check that the history is updated
  state.state.system = { ...SYSTEM_STATE_2 };
  deepStrictEqual(state.history.undo.length, 1);
  deepStrictEqual(state.history.redo.length, 0);

  // update the system again and check that the history is updated
  state.state.system.name = SYSTEM_STATE_3.name;
  deepStrictEqual(state.history.undo.length, 2);
  deepStrictEqual(state.history.redo.length, 0);
}

function testUndoState() {
  const state = State();

  // register system and check that the history is empty
  state.register(DEFAULT_SCHEMA_SYSTEM, { system: SYSTEM_STATE_1 });
  deepStrictEqual(state.history.undo.length, 0);
  deepStrictEqual(state.history.redo.length, 0);

  // update the system more than once and check that the history is updated to n-times updated
  // state must be updated to the final value of the last update

  state.state.system = { ...SYSTEM_STATE_2 };
  deepStrictEqual(state.history.undo.length, 1);
  deepStrictEqual(state.history.redo.length, 0);
  deepStrictEqual(state.state.system, SYSTEM_STATE_2);

  state.state.system.name = SYSTEM_STATE_3.name;
  deepStrictEqual(state.history.undo.length, 2);
  deepStrictEqual(state.history.redo.length, 0);
  deepStrictEqual(state.state.system, SYSTEM_STATE_3);

  // undo the last update and check that the history is updated to previous state
  state.undo();
  deepStrictEqual(state.history.undo.length, 1);
  deepStrictEqual(state.history.redo.length, 1);
  deepStrictEqual(state.state.system, SYSTEM_STATE_2);

  // undo again and check that the history is updated to previous state
  state.undo();
  deepStrictEqual(state.history.undo.length, 0);
  deepStrictEqual(state.history.redo.length, 2);
  deepStrictEqual(state.state, { system: SYSTEM_STATE_1 });
}

function testRedoState() {
  const state = State();

  // register system and check that the history is empty
  state.register(DEFAULT_SCHEMA_SYSTEM, { system: SYSTEM_STATE_1 });
  deepStrictEqual(state.history.undo.length, 0);
  deepStrictEqual(state.history.redo.length, 0);

  // update the system more than once and check that the history is updated to n-times updated
  // state must be updated to the final value of the last update

  state.state.system = { ...SYSTEM_STATE_2 };
  deepStrictEqual(state.history.undo.length, 1);
  deepStrictEqual(state.history.redo.length, 0);
  deepStrictEqual(state.state.system, SYSTEM_STATE_2);

  state.state.system.name = SYSTEM_STATE_3.name;
  deepStrictEqual(state.history.undo.length, 2);
  deepStrictEqual(state.history.redo.length, 0);
  deepStrictEqual(state.state.system, SYSTEM_STATE_3);

  // undo the last update and check that the history is updated to previous state
  state.undo();
  deepStrictEqual(state.history.undo.length, 1);
  deepStrictEqual(state.history.redo.length, 1);
  deepStrictEqual(state.state.system, SYSTEM_STATE_2);

  // redo the last update and check that the history is updated to previous state
  state.redo();
  deepStrictEqual(state.history.undo.length, 2);
  deepStrictEqual(state.history.redo.length, 0);
  deepStrictEqual(state.state.system, SYSTEM_STATE_3);
}
