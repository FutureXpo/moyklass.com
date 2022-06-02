function applyExtraSetup(sequelize) {
	const { lessons, students, teachers, lesson_students, lesson_teachers } = sequelize.models;

	lessons.belongsToMany(students, {
		as: "students",
		through: lesson_students,
		foreignKey: "lesson_id",
		otherKey: "student_id",
	});
	lessons.belongsToMany(teachers, {
		as: "teachers",
		through: lesson_teachers,
		foreignKey: "lesson_id",
		otherKey: "teacher_id",
	});
	students.belongsToMany(lessons, {
		as: "lessons",
		through: lesson_students,
		foreignKey: "student_id",
		otherKey: "lesson_id",
	});
	teachers.belongsToMany(lessons, {
		as: "lessons",
		through: lesson_teachers,
		foreignKey: "teacher_id",
		otherKey: "lesson_id",
	});
}

module.exports = { applyExtraSetup };
