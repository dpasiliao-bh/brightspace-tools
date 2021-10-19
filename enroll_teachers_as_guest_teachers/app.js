// scan for all active classes
// scan for all teacher user IDs

const request = require("superagent");
require("dotenv").config();
const csv = require("csv-parser");
const fs = require("fs");
const createCSVWriter = require("csv-writer").createObjectCsvWriter;

const csvWriter = createCSVWriter({
  path: "active_classes.csv",
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

// scan_all_course_offerings();

const write_to_csv = async () => {
  var dataToWrite = "123, 4565";
  var fs = require("fs");

  fs.writeFile("formList.csv", dataToWrite, "utf8", function (err) {
    if (err) {
      console.log(
        "Some error occured - file either not saved or corrupted file saved."
      );
    } else {
      console.log("It's saved!");
    }
  });
};

write_to_csv();
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
