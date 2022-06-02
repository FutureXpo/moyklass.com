const express = require("express");
const bodyParser = require("body-parser");

const routes = {
	lessons: require("./routes/lessons"),
};

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

function makeHandlerAwareOfAsyncErrors(handler) {
	return async function (req, res, next) {
		try {
			await handler(req, res);
		} catch (error) {
			next(error);
		}
	};
}

app.get("/", makeHandlerAwareOfAsyncErrors(routes.lessons.getAll));
app.post("/lessons", makeHandlerAwareOfAsyncErrors(routes.lessons.create));

module.exports = app;
