const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const xlsx = require("xlsx");
const nodemailer = require("nodemailer");
require("dotenv").config();
const cors = require("cors");
const app = express();
app.use(cors());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1); // Exit the application if MongoDB connection fails
  });

// Attendance Data Model
const attendanceDataSchema = new mongoose.Schema({
  employeeId: String,
  attendanceDate: Date,
  punchRecords: String,
});
const AttendanceData = mongoose.model("AttendanceData", attendanceDataSchema);

// Employee Model
const employeeSchema = new mongoose.Schema({
  employeeId: String,
  emp_name: String,
  email: String,
});
const Employee = mongoose.model("Employee", employeeSchema);

// Setup file upload
const upload = multer({ dest: "uploads/" });

// Nodemailer Transporter Setup
const transporter = nodemailer.createTransport({
  service: "gmail",
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

// Function to parse and save attendance data from the Excel file
async function processAttendanceFile(filePath) {
  try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Parse all rows in the sheet
    const rawRows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: "" });

    const results = [];
    let employeeId = null;
    let attendanceDate = null;
    let punchRecords = null;

    // Loop through rows to identify the key data (Emp Code, Att. Date, Punch Records)
    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i].map(cell => (typeof cell === 'string') ? cell.trim() : cell);

      console.log(`Processing Row ${i + 1}:`, row);

      // Look for the row with "Emp Code:" and extract the employee ID
      if (row[0] && row[0].includes("Emp Code:")) {
        employeeId = row[1] ? row[1].toString().trim() : null;
        console.log(`Extracted Emp Code: ${employeeId}`);
      }

      // Look for "Att. Date" and capture the date from the next row
      if (row[0] && row[0].includes("Att. Date")) {
        const dateStr = rawRows[i + 1] && rawRows[i + 1][0];
        if (dateStr) {
          attendanceDate = new Date(dateStr);  // Convert the attendance date to a Date object
          console.log(`Extracted Att. Date: ${attendanceDate}`);
        }
      }

      // Look for "Punch Records" after "Present"
      if (row[13] && typeof row[13] === "string" && row[13].toLowerCase() === "present") {
        // Punch records are in the last column of the row
        punchRecords = row[14] ? row[14].toString().trim() : null;
        console.log(`Extracted Punch Records: ${punchRecords}`);
      }

      // Once all necessary data is gathered, insert into the database
      if (employeeId && attendanceDate && punchRecords) {
        console.log(`Final Extracted Data:`);
        console.log(`Emp Code: ${employeeId}`);
        console.log(`Attendance Date: ${attendanceDate.toISOString().slice(0, 10)}`);
        console.log(`Punch Records: ${punchRecords}`);

        // Create a new attendance record to insert into MongoDB
        const attendanceDataRecord = new AttendanceData({
          employeeId,
          attendanceDate,
          punchRecords,
        });

        try {
          // Save attendance data to MongoDB
          await attendanceDataRecord.save();
          console.log(`Saved attendance data for Emp ID: ${employeeId}`);
          results.push({ employeeId, attendanceDate, punchRecords, status: "Saved" });

          // Fetch the employee's email from the Employee model
          const employee = await Employee.findOne({ employeeId }).exec();
          if (employee && employee.email) {
            // Send email with attendance details
            const emailText = `
              Hello ${employee.emp_name},

              Your attendance details for ${attendanceDate.toISOString().slice(0, 10)}:
              Punch Records: ${punchRecords}

              Regards,
              HR Team
            `;
            await sendEmail(employee.email, `Attendance Report - ${attendanceDate.toISOString().slice(0, 10)}`, emailText);
          }

          // Reset the values for the next record
          employeeId = null;
          attendanceDate = null;
          punchRecords = null;
        } catch (err) {
          console.error(`Failed to save attendance data for Emp ID: ${employeeId}`, err);
          results.push({ employeeId, status: "Failed to save" });
        }
      }
    }

    return results;

  } catch (err) {
    console.error("Error processing file:", err);
    throw new Error("Failed to process the file.");
  }
}

// Upload route to handle file upload
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).send({ error: "No file uploaded" });

    console.log("File uploaded:", req.file.path);
    const results = await processAttendanceFile(req.file.path);

    res.send({ message: "Processing complete", results, count: results.length });
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).send({ error: `Server error: ${error.message}` });
  }
});

// Start the server
app.listen(5000, () => console.log("Server running on http://localhost:5000"));
