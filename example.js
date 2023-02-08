import fs from "fs";

import Joi from "joi";
import Joistor from "./joistor.js";

// const store = Joistor({ errorLog: true });

// store.onError((error, state) => {
// 	console.log(error);
// 	console.log("there was an error... ", state);
// });

// store.onRegister((state) => {
// 	console.log("registered state: ", state);
// });

// const data = fs.readFileSync("./data.json", { encoding: "utf8" });

// store.register(
// 	{
// 		user: Joi.object({
// 			id: Joi.number(),
// 			name: Joi.string(),
// 		}),
// 	},
// 	JSON.parse(data)
// );

// store.onChange("user", (state, field, fieldState, prop, value) => {
// 	fs.writeFileSync("./data.json", JSON.stringify(state));
// });

// store.state.user.name = "Bert";
// store.state.user = { id: 10, name: "Sarah" };

// store.register(
// 	{
// 		user: Joi.object({
// 			id: Joi.number(),
// 			name: Joi.string(),
// 		}),
// 	},
// 	{
// 		user: {
// 			id: 1,
// 			name: "Michael",
// 		},
// 	}
// );

// store.register(
// 	{
// 		workspace: Joi.object({
// 			id: Joi.number(),
// 			name: Joi.string().allow(""),
// 			sequence: Joi.array().items(Joi.number()),
// 		}),
// 	},
// 	{
// 		workspace: {
// 			id: 1,
// 			name: "test",
// 			sequence: [0, 1],
// 		},
// 	}
// );

// store.register(
// 	{
// 		list: Joi.array()
// 			.items(
// 				Joi.object({
// 					min: Joi.number().required().min(0),
// 					max: Joi.number().required(),
// 					position: Joi.array().items(Joi.number()).min(0).max(4),
// 				})
// 			)
// 			.min(0)
// 			.max(5),
// 	},
// 	{
// 		list: [
// 			{
// 				min: 0,
// 				max: 100,
// 				position: [42],
// 			},
// 			{
// 				min: 0,
// 				max: 200,
// 				position: [160],
// 			},
// 			{
// 				min: 0,
// 				max: 500,
// 				position: [17],
// 			},
// 			{
// 				min: 0,
// 				max: 250,
// 				position: [246],
// 			},
// 		],
// 	}
// );
