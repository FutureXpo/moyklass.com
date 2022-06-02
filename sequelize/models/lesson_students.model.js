const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
	let lesson_students = sequelize.define(
		"lesson_students",
		{
			visit: {
				type: DataTypes.BOOLEAN,
				allowNull: true,
				defaultValue: false,
			},
		},
		{
			sequelize,
			tableName: "lesson_students",
			schema: "public",
			timestamps: false,
		}
	);
	lesson_students.removeAttribute("id");
};
