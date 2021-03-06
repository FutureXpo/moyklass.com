const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
	sequelize.define(
		"students",
		{
			id: {
				autoIncrement: true,
				type: DataTypes.INTEGER,
				allowNull: false,
				primaryKey: true,
			},
			name: {
				type: DataTypes.STRING(10),
				allowNull: true,
			},
		},
		{
			sequelize,
			tableName: "students",
			schema: "public",
			timestamps: false,
			indexes: [
				{
					name: "students_pkey",
					unique: true,
					fields: [{ name: "id" }],
				},
			],
		}
	);
};
