
const request = require("superagent");

require("dotenv").config();

// TODO
// collect list of emails for MYP students
// scan myp student json file from ./assets
const myp_students = require('./assets/202021_myp_students.json')
const dp_students = require('./assets/202021_dp_students.json')

const myp_course_offering_id = "12686"
const dp_course_offering_id = "12687"

// store all student emails in one array
let myp_students_emails = [];
let dp_students_emails = [];

myp_students.map(student => {
    myp_students_emails.push(student.EMail)
})

dp_students.map(student => {
    dp_students_emails.push(student.EMail)
})

// clear duplicates
myp_students_emails = [...new Set(myp_students_emails)]
dp_students_emails = [...new Set(dp_students_emails)]
console.log({dp_students_emails})

// GET userid of each student based on the email from Brightspace API
const fetchBrightspaceUserId = async (email) => {
    const version = 1.26
    const api_endpoint = process.env.API_DOMAIN + `/d2l/api/lp/${version}/users/?externalEmail=${email}`
    const access_token = process.env.ACCESS_TOKEN
    
    let req;

    try {
        req = await request.get(api_endpoint).auth(access_token, {type: "bearer"})
    } catch (err) {
        console.error(`unable to find ${email}`)
        return ;
    }
    
    const user = req.body;

    return user[0]
}

const constructUserIDArray = async (ib_programme) => {
    let student_ids = []
    let ref;

    if (ib_programme === "myp") {
        ref = myp_students_emails
    } else if (ib_programme === "dp"){
        ref = dp_students_emails
    }

    for await (let email of dp_students_emails) {
        const user_details = await fetchBrightspaceUserId(email)
        if (user_details) {
            const user_id = user_details.UserId
            student_ids.push(user_id)
        }
        
    }

    return student_ids   
}

constructUserIDArray("dp")

// enroll each student to MYP course