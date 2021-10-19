const request = require("superagent");

require("dotenv").config();

// TODO
// collect list of emails for MYP students
// scan myp student json file from ./assets
const myp_students = require("./assets/202021_myp_students.json");
const dp_students = require("./assets/202021_dp_students.json");

// store all student emails in one array
let myp_students_emails = [];
let dp_students_emails = [];

let grade_7_emails = [];
let grade_8_emails = [];
let grade_9_emails = [];
let grade_10_emails = [];
let grade_11_emails = [];
let grade_12_emails = [];

myp_students.map((student) => {
  switch (student.Grade) {
    case "Grade 7":
      grade_7_emails.push(student.EMail);
      break;
    case "Grade 8":
      grade_8_emails.push(student.EMail);
      break;
    case "Grade 9":
      grade_9_emails.push(student.EMail);
      break;
    case "Grade 10":
      grade_10_emails.push(student.EMail);
      break;
    default:
      console.error("error");
      break;
  }
  myp_students_emails.push(student.EMail);
});

dp_students.map((student) => {
  switch (student.Grade) {
    case "Grade 11":
      grade_11_emails.push(student.EMail);
      break;
    case "Grade 12":
      grade_12_emails.push(student.EMail);
      break;

    default:
      console.error("error");
      break;
  }
  dp_students_emails.push(student.EMail);
});

// clear duplicates
myp_students_emails = [...new Set(myp_students_emails)];
dp_students_emails = [...new Set(dp_students_emails)];
grade_7_emails = [...new Set(grade_7_emails)];
grade_8_emails = [...new Set(grade_8_emails)];
grade_9_emails = [...new Set(grade_9_emails)];
grade_10_emails = [...new Set(grade_10_emails)];
grade_11_emails = [...new Set(grade_11_emails)];
grade_12_emails = [...new Set(grade_12_emails)];

// GET userid of each student based on the email from Brightspace API
const fetchBrightspaceUserId = async (email) => {
  const version = 1.26;
  const api_endpoint =
    process.env.API_DOMAIN +
    `/d2l/api/lp/${version}/users/?externalEmail=${email}`;
  const access_token = process.env.ACCESS_TOKEN;

  let req;

  try {
    req = await request
      .get(api_endpoint)
      .auth(access_token, { type: "bearer" });
  } catch (err) {
    console.error(`unable to find ${email}`);
    return;
  }

  const user = req.body;

  return user[0];
};

const constructUserIDArray = async (grade) => {
  console.time(`Fetching USERID array for grade ${grade}`);
  let student_ids = [];
  let ref;

  switch (grade) {
    case 7:
      ref = grade_7_emails;
      break;
    case 8:
      ref = grade_8_emails;
      break;
    case 9:
      ref = grade_9_emails;
      break;
    case 10:
      ref = grade_10_emails;
      break;
    case 11:
      ref = grade_11_emails;
      break;
    case 12:
      ref = grade_12_emails;
      break;
    default:
      throw new Error("unknown grade" + grade);
  }

  for await (let email of ref) {
    const user_details = await fetchBrightspaceUserId(email);
    if (user_details) {
      const user_id = user_details.UserId;
      student_ids.push(user_id);
    }
  }

  console.timeEnd(`Fetching USERID array for grade ${grade}`);
  return student_ids;
};

const enroll_students_in_course = async (classlist, course_id) => {
  console.time(`Enrolling students in course ${course_id}`);

  for await (let student of classlist) {
    console.time(`+ student ${student} to class ${course_id}`);

    const version = 1.26;
    const api_endpoint =
      process.env.API_DOMAIN + `/d2l/api/lp/${version}/enrollments/`;

    const access_token = process.env.ACCESS_TOKEN;

    const student_role_id = 110;

    const payload = {
      OrgUnitId: course_id,
      UserId: student,
      RoleId: student_role_id,
    };

    try {
      request
        .post(api_endpoint)
        .auth(access_token, { type: "bearer" })
        .set("Content-Type", "application/json")
        .send(payload)
        .end((err, response) => {
          if (err) {
            console.error({ err });
            return err;
          }
          console.timeEnd(`+ student ${student} to class ${course_id}`);
        });
    } catch (err) {
      console.error(
        `ERROR: Unable to enroll ${student} to course ${course_id}`
      );

      throw new Error(err);
    }
  }

  console.timeEnd(`enrolling students in course ${course_id}`);
};

const enroll_students = async () => {
  const grades = [
    { Grade: 7, CourseId: 12686 },
    { Grade: 8, CourseId: 12782 },
    { Grade: 9, CourseId: 12783 },
    { Grade: 10, CourseId: 12784 },
    { Grade: 11, CourseId: 12785 },
    { Grade: 12, CourseId: 12786 },
  ];

  for await (let grade of grades) {
    const classlist = await constructUserIDArray(grade.Grade);

    await enroll_students_in_course(classlist, grade.CourseId);
  }
};

// enroll each student to MYP course

enroll_students();
