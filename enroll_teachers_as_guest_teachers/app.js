// scan for all active classes
// scan for all teacher user IDs

const request = require("superagent");
require("dotenv").config();
const csv = require("csv-parser");
const fs = require("fs");
const createCSVWriter = require("csv-writer").createObjectCsvWriter;

const csvWriter = createCSVWriter({
  path: "teachers.csv",
  header: [
    { id: "Identifier", title: "ID" },
    { id: "DisplayName", title: "NAME" },
    { id: "EmailAddress", title: "EMAIL" },
  ],
});

// enroll each teacher to each active class as a guest teacher (RoleID: 120)
const access_token = process.env.ACCESS_TOKEN;

let active_classes = [];
let teacher_ids = [];

/**
 * scan all courses
 */
const scan_all_course_offerings = async () => {
  const senior_school_course_orgUnitId = "6665";
  let api_endpoint =
    process.env.API_DOMAIN +
    `/d2l/api/lp/1.26/orgstructure/6665/descendants/?ouTypeId=3`;

  let response;
  try {
    response = await request
      .get(api_endpoint)
      .auth(access_token, { type: "bearer" });
  } catch (err) {
    console.error({ err });
  }

  const complete_courses_list = response.body;

  for await (let course of complete_courses_list) {
    await is_course_active(course.Identifier);
  }

  return;
};

/**
 * Check if a particular course is active
 *
 */
const is_course_active = async (orgUnitId) => {
  const course_api_endpoint =
    process.env.API_DOMAIN + `/d2l/api/lp/1.26/courses/${orgUnitId}`;

  let response;
  try {
    response = await request
      .get(course_api_endpoint)
      .auth(access_token, { type: "bearer" });
  } catch (err) {
    console.error({ err });
  }

  const course_offering = response.body;

  if (course_offering.IsActive) {
    active_classes.push(course_offering.Identifier);
  }
};

const scan_for_teachers = async () => {
  let bookmark = 0;

  let HasMoreItems = true;
  let response;
  let full_teachers_list = [];
  do {
    let instructors_api_endpoint =
      process.env.API_DOMAIN +
      `/d2l/api/lp/1.26/enrollments/orgUnits/6606/users/?roleId=109&isActive=true&bookmark=${bookmark}`;
    try {
      response = await request
        .get(instructors_api_endpoint)
        .auth(access_token, { type: "bearer" });

      HasMoreItems = response.body.PagingInfo.HasMoreItems;
      bookmark = response.body.PagingInfo.Bookmark;

      console.log({ bookmark });
      full_teachers_list.push.apply(full_teachers_list, response.body.Items);
    } catch (err) {
      console.error({ err });
    }
  } while (HasMoreItems);

  let teachers = [];
  // consolidate teacher info
  full_teachers_list.map((teacher) => {
    teachers.push(teacher.User);
    teacher_ids.push(teacher.User.Identifier);
  });

  console.log({ teacher_ids });
  csvWriter.writeRecords(teachers).then(() => {
    console.log("...Writing Done");
  });
  return;
};

const enroll_teachers_as_guests_to_everything = async () => {
  for await (let teacher_id of teacher_ids) {
    for await (let class_id of active_classes) {
      // check if teacher is enrolled as an instructor in the class
      let is_teacher_enrolled = check_if_teacher_is_enrolled(
        teacher_id,
        class_id
      );

      // if the teacher is not enrolled in the class, enroll them as a guest
      if (!is_teacher_enrolled) {
        await enroll_one_teacher_as_guest_to_a_class(class_id, teacher_id); //TEST: 1569 - Demo.instructor_2
      }
    }
  }
};

const check_if_teacher_is_enrolled = async (teacher_id, class_id) => {
  const enrollment_details_api_endpoint =
    process.env.API_DOMAIN +
    `/d2l/api/lp/1.26/enrollments/orgUnits/${class_id}/users/${teacher_id}`;
  console.log("Checking if teacher is enrolled...");
  let response;
  try {
    response = await request
      .get(enrollment_details_api_endpoint)
      .auth(access_token, { type: "bearer" });

    // teacher is enrolled if an enrollment call returns a value
    return true;
  } catch (err) {
    console.log({ err });
    // if an error comes up, enrollment cannot be found
    return false;
  }
};

const enroll_one_teacher_as_guest_to_a_class = async (class_id, teacher_id) => {
  const enroll_teacher_api_endpoint =
    process.env.API_DOMAIN + `/d2l/api/lp/1.26/enrollments/`;
  const payload = {
    OrgUnitId: class_id,
    UserId: teacher_id,
    RoleId: 120,
  };

  console.log(`Enrolling USER ${teacher_id} to COURSE ${class_id}`);

  let response;
  try {
    response = await request
      .post(enroll_teacher_api_endpoint)
      .auth(access_token, { type: "bearer" })
      .set("Content-Type", "application/json")
      .send(payload);
    console.log(`SUCCESS: Enrolled USER ${teacher_id} to COURSE ${class_id}`);
  } catch (err) {
    console.error({ err });
  }
  return;
};

/**
 *
 */
const register_teachers_to_active_courses = async () => {
  console.log("=============START=============");
  console.time("Scanning for active classes...");
  await scan_all_course_offerings();
  console.timeEnd("Scanning for active classes...");
  console.log({ active_classes });

  console.time("Scanning for teachers...");
  await scan_for_teachers();
  console.timeEnd("Scanning for teachers...");
  console.log({ teacher_ids });

  console.log("---enrolling teachers---");
  console.time("Enrolled teachers to everything...");
  await enroll_teachers_as_guests_to_everything();
  console.timeEnd("Enrolled teachers to everything...");

  console.log("DONE!");
};

// register_teachers_to_active_courses();
// scan_for_teachers();

// enroll_one_teacher_as_guest_to_a_class(10124, 1569); //TEST: 1569 - Demo.instructor_2

check_if_teacher_is_enrolled(171, 10124);
