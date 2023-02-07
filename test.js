import Joi from "joi";
import Joistor from "./joistor.js";

const store = Joistor();

store.register(
	{
		user: Joi.object({
			id: Joi.number().integer().required(),
			name: Joi.string().required(),
			sequence: Joi.object({
				count: Joi.number().integer().required(),
				members: Joi.array().items(Joi.number().integer()),
			}).required(),
		}),
	},
	{
		user: {
			id: 1,
			name: "Michael",
			sequence: {
				count: 3,
				members: [1, 2, 3, 4],
			},
		},
	}
);

// store.register(
// 	{
// 		admin: Joi.object({
// 			id: Joi.number().integer().required(),
// 			name: Joi.string().required(),
// 			sequence: Joi.object({
// 				count: Joi.number().integer().required(),
// 				members: Joi.array().items(Joi.number().integer()),
// 			}).required(),
// 		}),
// 	},
// 	{
// 		admin: {
// 			id: 1,
// 			name: "Michael",
// 			sequence: {
// 				count: 3,
// 				members: [1, 2, 3, 4],
// 			},
// 		},
// 	}
// );

// store.register(
// 	{
// 		devices: Joi.array().items(
// 			Joi.object({
// 				name: Joi.string().required(),
// 				min: Joi.number(),
// 				max: Joi.number(),
// 			})
// 		),
// 	},
// 	{
// 		devices: [
// 			{
// 				name: "Computer",
// 				min: 0,
// 				max: 100,
// 			},
// 			{
// 				name: "Car",
// 				min: 10,
// 				max: 50,
// 			},
// 		],
// 	}
// );

console.log(store.state);
console.log(store.history);
console.log("=================\n");
store.state.user.name = "Ashley";
console.log(store.state);
console.log(store.history);
console.log("=================\n");
store.undo();
console.log(store.state);
console.log(store.history);
console.log("=================\n");
