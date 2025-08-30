const AttendanceData = require('../models/Attendance');
const Employee = require('../models/Employee');
const xlsx = require('xlsx');
const nodemailer = require('nodemailer');

// Setup for sending email
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Function to send email
const sendEmail = async (email, subject, text) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: subject,
      text: text,
    };
    await transporter.sendMail(mailOptions);
    console.log(`Email sent to: ${email}`);
  } catch (error) {
    console.error("Error sending email:", error);
  }
};

// Upload and process attendance data from the Excel file
const uploadAttendanceData = async (req, res) => {
  try {
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const rawRows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: "" });

    const results = [];
    let employeeId = null;
    let attendanceDate = null;
    let punchRecords = null;

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i].map(cell => (typeof cell === 'string') ? cell.trim() : cell);

      if (row[0] && row[0].includes('Emp Code:')) {
        employeeId = row[1] ? row[1].toString().trim() : null;
      }

      if (row[0] && row[0].includes('Att. Date')) {
        const dateStr = rawRows[i + 1] && rawRows[i + 1][0];
        if (dateStr) {
          attendanceDate = new Date(dateStr);
        }
      }

      if (row[13] && typeof row[13] === "string" && row[13].toLowerCase() === "present") {
        punchRecords = row[14] ? row[14].toString().trim() : null;
      }

      if (employeeId && attendanceDate && punchRecords) {
        const attendanceDataRecord = new AttendanceData({
          employeeId,
          attendanceDate,
          punchRecords,
        });

        try {
          await attendanceDataRecord.save();
          results.push({ employeeId, attendanceDate, punchRecords, status: "Saved" });

          // Send email to employee
          const employee = await Employee.findOne({ employeeId }).exec();
          if (employee && employee.email) {
            const emailText = `
              Hello ${employee.emp_name},

              Your attendance details for ${attendanceDate.toISOString().slice(0, 10)}:
              Punch Records: ${punchRecords}

              Regards,
              HR Team
            `;
            await sendEmail(employee.email, `Attendance Report - ${attendanceDate.toISOString().slice(0, 10)}`, emailText);
          }

        } catch (err) {
          results.push({ employeeId, status: "Failed to save" });
        }

        // Reset values for next record
        employeeId = null;
        attendanceDate = null;
        punchRecords = null;
      }
    }

    res.status(200).json({ message: "File processed successfully", results });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error processing file" });
  }
};

module.exports = { uploadAttendanceData };
