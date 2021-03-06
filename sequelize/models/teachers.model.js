const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
	sequelize.define(
		"teachers",
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
			tableName: "teachers",
			schema: "public",
			timestamps: false,
			indexes: [
				{
					name: "teachers_pkey",
					unique: true,
					fields: [{ name: "id" }],
				},
			],
		}
	);
};
