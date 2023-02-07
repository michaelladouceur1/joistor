import fs from "fs";

import Joi from "joi";
import Joistor from "./joistor.js";

const store = Joistor({ errorLog: false });

store.onError((error, state) => {
	console.log(error);
	console.log("there was an error... ", state);
});

store.onRegister((state) => {
	console.log("registered state: ", state);
});

const data = fs.readFileSync("./data.json", { encoding: "utf8" });

store.register(
	{
		user: Joi.object({
			id: Joi.number(),
			name: Joi.string(),
		}),
	},
	JSON.parse(data)
);

store.onChange("user", (state, field, fieldState, prop, value) => {
	fs.writeFileSync("./data.json", JSON.stringify(state));
});

store.state.user.name = "Bert";
store.state.user = { id: 10, name: "Sarah" };
