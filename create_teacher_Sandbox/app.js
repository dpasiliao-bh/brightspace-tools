const request = require("superagent");

require("dotenv").config();

const get_teachers = async () => {
  const orgUnitId = 10100; // Brightspace 101
  const api_endpoint =
    process.env.API_DOMAIN + `/d2l/api/le/1.41/${orgUnitId}/classlist/`;
  const access_token = process.env.ACCESS_TOKEN;
  let response = await request
    .get(api_endpoint)
    .auth(access_token, { type: "bearer" });

  const teachers = response.body;
  return teachers;
};

const create_course = async () => {
  const api_endpoint = process.env.API_DOMAIN + `/d2l/api/lp/1.26/courses/`;
  const access_token = process.env.ACCESS_TOKEN;

  const teachers = await get_teachers();

  teachers.map((teacher) => {
    const name = teacher.FirstName + teacher.LastName;
    const sandbox_name = `Sandbox-${name}`;
    const course_template = 6641; //sandbox template

    const payload = {
      Name: sandbox_name,
      Code: `co_${sandbox_name.toLowerCase()}_sb`,
      Path: "",
      CourseTemplateId: course_template,
      SemesterId: null,
      StartDate: null,
      EndDate: null,
      LocaleId: null,
      ForceLocale: false,
      ShowAddressBook: false,
      Description: {
        Content: `Sandbox course for ${teacher.FirstName} ${teacher.LastName}.`,
        Type: "Text",
      },
    };

    try {
      request
        .post(api_endpoint)
        .auth(access_token, { type: "bearer" })
        .set("Content-Type", "application/json")
        .send(payload)
        .end((err, response) => {
          if (err) {
            console.log({ err });
            return err;
          }

          // enroll user
          let enrollment_endpoint =
            process.env.API_DOMAIN + `/d2l/api/lp/1.26/enrollments/`;
          const enrollment_payload = {
            OrgUnitId: response.body.Identifier,
            UserId: teacher.Identifier,
            RoleId: "109",
          };

          request
            .post(enrollment_endpoint)
            .auth(access_token, { type: "bearer" })
            .set("Content-Type", "application/json")
            .send(enrollment_payload)
            .end((err, response) => {
              console.log(
                `Successfully created a sandbox for ${teacher.FirstName} ${teacher.LastName}`
              );
            });
        });
    } catch (err) {
      console.error({ err });
    }
  });
};

create_course();
