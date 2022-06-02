const { Sequelize } = require("sequelize");
const { applyExtraSetup } = require("./extra-setup");
require("dotenv").config();

const sequelize = new Sequelize(process.env.DATABASE_URL, {
	logging: false,
	dialectOptions: {
		ssl: {
			require: true,
			rejectUnauthorized: false,
		},
		define: {
			timestamps: false,
		},
	},
});

const modelDefiners = [
	require("./models/lessons.model"),
	require("./models/students.model"),
	require("./models/teachers.model"),
	require("./models/lesson_students.model"),
	require("./models/lesson_teachers.model"),
];

for (const modelDefiner of modelDefiners) {
	modelDefiner(sequelize);
}

applyExtraSetup(sequelize);

module.exports = sequelize;
