const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
	let lesson_teachers = sequelize.define(
		"lesson_teachers",
		{},
		{
			sequelize,
			tableName: "lesson_teachers",
			schema: "public",
			timestamps: false,
		}
	);
	lesson_teachers.removeAttribute("id");
};
