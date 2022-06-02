const { models } = require("../../sequelize");
const { Sequelize, Op } = require("sequelize");
const moment = require("moment");

function checkParams(query) {
	//проверка параметров на формат и их данные
	let errors = {};
	let queryInfo = {}; //Все значения из запроса превратим в нужный формат для использования

	if (query.date) {
		//проверка дат
		queryInfo.dates = query.date.split(",").sort();
		if (queryInfo.dates.length > 2)
			errors.date = "You need to use 2 or less dates in query";
		else if (
			!(
				moment(queryInfo.dates[0], "YYYY-MM-DD", true).isValid() &&
				moment(
					queryInfo.dates[1] || queryInfo.dates[0],
					"YYYY-MM-DD",
					true
				).isValid()
			)
		) {
			errors.date = "Wrong date format";
		}
	}

	if (query.status) {
		//проверка статуса
		if (!(query.status === "0" || query.status === "1"))
			errors.status = "Status can only be 0 or 1";
		else queryInfo.status = parseInt(query.status);
	}

	if (query.teacherIds) {
		//проверка id учителей
		let teacherIds = query.teacherIds.split(",");
		queryInfo.teacherIds = [];
		for (teacherId of teacherIds) {
			let id = +teacherId;
			if (
				isNaN(id) ||
				id % 1 > 0 ||
				id < 1 ||
				queryInfo.teacherIds.includes(id)
			)
				errors.teacherIds = "teacherIds can only be unique integer more than 0";
			else queryInfo.teacherIds.push(id);
		}
	}

	if (query.studentsCount) {
		//проверка количества учеников
		let studentsCounts = query.studentsCount.split(",").sort();
		queryInfo.studentsCount = [];
		if (studentsCounts.length > 2)
			errors.studentsCount =
				"You need to use 2 or less studentsCounts in query";
		else
			for (studentsCount of studentsCounts) {
				let count = +studentsCount;
				if (isNaN(count) || count % 1 > 0 || count < 0)
					errors.studentsCount =
						"studentsCounts can only be integer greater than or equal to 0";
				else queryInfo.studentsCount.push(count);
			}
	}

	if (query.page) {
		//проверка номера страницы
		let page = +query.page;
		if (isNaN(page) || page % 1 > 0 || page < 1)
			errors.page = "Page can only be integer more than 0";
		else queryInfo.page = page;
	}

	if (query.lessonsPerPage) {
		//проверка количества учеников
		let lessonsPerPage = +query.lessonsPerPage;
		if (isNaN(lessonsPerPage) || lessonsPerPage % 1 > 0 || lessonsPerPage < 1)
			errors.lessonsPerPage = "lessonsPerPage can only be integer more than 0";
		else queryInfo.lessonsPerPage = lessonsPerPage;
	}

	return { queryInfo, errors };
}

function getWhereParametres(queryInfo) {
	//Преобразуем параметры в условия запроса
	let where = {};
	let and = [];
	
	if (queryInfo.dates) {
		//Добавляем условие на проверку даты занятия
		if (queryInfo.dates.length == 2)
			where.date = { [Op.between]: [queryInfo.dates[0], queryInfo.dates[1]] };
		else where.date = { [Op.eq]: queryInfo.dates[0] };
	}
	
	if (queryInfo.status !== undefined)
		//Добавляем условие на проверку статуса занятия
		where.status = { [Op.eq]: queryInfo.status };
		
	if (queryInfo.studentsCount) {
		//Добавляем условие на проверку количества учеников записанных на занятие
		if (queryInfo.studentsCount.length == 2)
			and.push({
				id: Sequelize.literal(`
(SELECT CAST(COUNT(lesson_students.student_id)AS INT) AS studentsCount 
FROM public.lessons AS lessons_student 
LEFT OUTER JOIN public.lesson_students AS lesson_students ON lessons_student.id = lesson_students.lesson_id 
WHERE lessons_student.id = lessons.id 
GROUP BY lessons_student.id) BETWEEN ${queryInfo.studentsCount[0]} AND ${queryInfo.studentsCount[1]}`),
			});
		else
			and.push({
				id: Sequelize.literal(`
(SELECT CAST(COUNT(lesson_students.student_id)AS INT) AS studentsCount 
FROM public.lessons AS lessons_student 
LEFT OUTER JOIN public.lesson_students AS lesson_students ON lessons_student.id = lesson_students.lesson_id 
WHERE lessons_student.id = lessons.id 
GROUP BY lessons_student.id) = ${queryInfo.studentsCount[0]}`),
			});
	}
	
	if (queryInfo.teacherIds)
		//Добавляем условие на проверку наличия учителей на занятии
		where.id = {
			[Op.any]: Sequelize.literal(`
(SELECT lessons_in.id
FROM public.lessons AS lessons_in 
LEFT OUTER JOIN public.lesson_teachers AS lesson_teachers ON lessons_in.id = lesson_teachers.lesson_id 
WHERE lesson_teachers.teacher_id = ANY (SELECT unnest(ARRAY[${queryInfo.teacherIds}]))
GROUP BY lessons_in.id) 
`),
		};

	return { ...where, [Op.and]: and };
}

async function getAll(req, res) {
	let query = checkParams(req.query);
	if (Object.keys(query.errors).length > 0) {
		return res.status(400).json({ isSuccess: false, errors: query.errors });
	}

	const lessons = await models.lessons.findAll({
		offset: (query.queryInfo.lessonsPerPage || 5) * ((query.queryInfo.page || 1) - 1) || 0,
		limit: query.queryInfo.lessonsPerPage || 5,
		attributes: {
			include: [
				//добавляем счетчик учеников посетивших занятие
				[
					Sequelize.literal(`(SELECT COALESCE((SELECT CAST(COUNT(lesson_students.visit)  AS INT) FROM lesson_students WHERE lessons.id = lesson_students.lesson_id AND lesson_students.visit GROUP BY lessons.id),0))`),
					"visitCount",
				],
			],
		},
		include: [
			{
				model: models.students,
				as: "students",
				attributes: {
					//Переносим аттрибут посещенного занятия из таблицы lesson_students
					include: [
						[
							Sequelize.literal(
								`(SELECT lesson_students.visit FROM lesson_students WHERE lesson_students.student_id = students.id and lesson_students.lesson_id = lessons.id)`
							),
							"visit",
						],
					],
				},
				through: {
					model: models.lesson_students,
					attributes: [],
				},
			},
			{
				model: models.teachers,
				as: "teachers",
				through: {
					model: models.lesson_teachers,
					attributes: [],
				},
			},
		],
		where: getWhereParametres(query.queryInfo),
		order: [["date", "ASC"]],
	});

	res.status(200).json({ isSuccess: true, lessons });
}

async function checkBody(body) { //проверка параметров на формат и их данные
	let errors = {};

	if (Array.isArray(body.teacherIds)) { //проверка id учителей на нужный формат и значения
		for (let id of body.teacherIds)
			if (!Number.isInteger(id) || id < 1)
				errors.teacherIds = "teacherId must be integer more than 0";
		if (errors.teacherIds == undefined)
			await models.teachers
				.findAll({
					where: {
						id: {
							[Op.in]: body.teacherIds,
						},
					},
				})
				.then(function (teachers) {
					if (teachers.length != body.teacherIds.length)
						errors.teacherIds = "You must use unique teacherIds";
				})
				.catch(function (err) {
					errors.teacherIds = "Some teacherIds cant be found";
				});
	} else errors.teacherIds = "Wrong teacherIds format";

	if (!(typeof body.title === "string" || body.title instanceof String)) //проверка названия на нужный формат и значения
		errors.title = "Wrong title format"; 

	if (Array.isArray(body.days)) { //проверка дней на нужный формат и значения
		let days = [];
		for (let day of body.days)
			if (!Number.isInteger(day) || day < 0 || day > 6 || days.includes(day))
				errors.days =
					"day must be unique integer more than or equal 0 and less than or equal 6";
			else days.push(day);
	} else errors.days = "Wrong days format";

	if (!moment(body.firstDate, "YYYY-MM-DD", true).isValid()) //проверка первой даты на нужный формат и значения
		errors.firstDate = "Wrong firstDate format"; 

	if (body.lessonsCount != undefined && body.lastDate != undefined) //проверка на отсутствие обоих параметров
		errors.parametres =	"You cant use lessonsCount and lastDate at the same time"; 
	if (body.lessonsCount == undefined && body.lastDate == undefined) //проверка на присутствие обоих параметров
		errors.parametres = "You have missed lessonsCount or lastDate"; 

	if (body.lastDate && !moment(body.lastDate, "YYYY-MM-DD", true).isValid()) //проверка последней даты на нужный формат и значения
		errors.lastDate = "Wrong lastDate format"; 

	if (body.lessonsCount && (!Number.isInteger(body.lessonsCount) || body.lessonsCount < 1 || body.lessonsCount > 300))
		errors.lessonsCount = "lessonsCount must be integer more than 0 and less than or equal 300"; //проверка количества занятий на нужный формат и значения

	return errors;
}

async function create(req, res) {
	let errors = await checkBody(req.body);
	if (Object.keys(errors).length > 0) {
		res.status(400).json({ isSuccess: false, errors });
	} else {
		let date = moment(req.body.firstDate);
		let col = 0;
		
		let data = []; //создаем массив занятий который необходимо записать в базу данных
		while (col < (req.body.lessonsCount ? req.body.lessonsCount : 300) && date <= (req.body.lastDate? moment(req.body.lastDate) : moment(req.body.firstDate).add(1, "year"))) {
			if (req.body.days.includes(date.day())) {
				data.push({
					title: req.body.title,
					date: date.format("YYYY-MM-DD"),
				});
				col++;
			}
			date.add(1, "day");
		}
		let lessons = await models.lessons.bulkCreate(data);
		
		let assotiations = [];
		for await (let lesson of lessons)
			for (let teacherId of req.body.teacherIds) {
				assotiations.push({
					lesson_id: lesson.dataValues.id,
					teacher_id: teacherId,
				});
			}
		await models.lesson_teachers.bulkCreate(assotiations);
		
		res.status(201).json({isSuccess: true, lessonIds: lessons.map((lesson) => lesson.dataValues.id)});
	}
}

module.exports = {
	getAll,
	create,
};
