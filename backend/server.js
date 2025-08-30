const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const xlsx = require("xlsx");
const nodemailer = require("nodemailer");
require("dotenv").config();
const cors = require("cors");

const app = express();
app.use(cors());

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB connection error:", err));

const employeeSchema = new mongoose.Schema({
  employeeId: String,
  email: String,
  name: String,
});
const Employee = mongoose.model("Employee", employeeSchema);

const upload = multer({ dest: "uploads/" });

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

function parseDateString(dateStr) {
  if (dateStr instanceof Date) {
    const d = new Date(dateStr);
    d.setHours(0,0,0,0);
    return d;
  }
  const d = new Date(dateStr);
  if (!isNaN(d)) {
    d.setHours(0,0,0,0);
    return d;
  }
  return null;
}

async function processAttendanceFile(filePath, targetDate) {
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(sheet, { defval: "" });

  console.log(`Total rows read from Excel: ${rows.length}`);
  if (rows.length > 0) {
    console.log("Example keys from first row:", Object.keys(rows[0]));
    console.log("Example first row data:", rows[0]);
  }

  const allEmployees = await Employee.find({}, { employeeId: 1, email: 1, name: 1 }).lean();
  const employeeMap = new Map(allEmployees.map(emp => [emp.employeeId, emp]));

  let matchedRowsCount = 0;
  const results = [];

  for (const [i, row] of rows.entries()) {
    const getKey = (keyword) =>
      Object.keys(row).find(k => k.toLowerCase().includes(keyword.toLowerCase()));

    const empIdKey = getKey("emp code");
    const empNameKey = getKey("employee name");
    const attDateKey = getKey("att. date");
    const inTimeKey = getKey("intime");
    const outTimeKey = getKey("outtime");

    if (!empIdKey || !attDateKey) {
      console.log(`Skipping row ${i}: Missing mandatory keys (Emp Code or Att. Date)`);
      continue;
    }

    const empIdRaw = row[empIdKey];
    if (!empIdRaw) {
      console.log(`Skipping row ${i}: Emp Code empty`);
      continue;
    }

    const empId = empIdRaw.toString().trim();

    if (!employeeMap.has(empId)) {
      console.log(`Skipping row ${i}: EmpId ${empId} not found in MongoDB`);
      continue;
    }

    const empData = employeeMap.get(empId);
    const empNameExcel = empNameKey && row[empNameKey] ? row[empNameKey].toString().trim() : "";
    const empName = empData.name || empNameExcel || "Employee";

    const attDateRaw = row[attDateKey];
    if (!attDateRaw) {
      console.log(`Skipping row ${i}: Attendance date empty`);
      continue;
    }

    const attendanceDate = parseDateString(attDateRaw);
    if (!attendanceDate) {
      console.log(`Skipping row ${i}: Invalid attendance date format: ${attDateRaw}`);
      continue;
    }

    if (attendanceDate.getTime() !== targetDate.getTime()) {
      console.log(`Skipping row ${i}: Attendance date ${attendanceDate.toISOString().slice(0,10)} does not match target date ${targetDate.toISOString().slice(0,10)}`);
      continue;
    }

    const inTime = inTimeKey && row[inTimeKey] ? row[inTimeKey].toString().trim() : "N/A";
    const outTime = outTimeKey && row[outTimeKey] ? row[outTimeKey].toString().trim() : "N/A";

    matchedRowsCount++;
    console.log(`Processing row ${i}: EmpId ${empId}, Name ${empName}, Date ${attendanceDate.toISOString().slice(0,10)}, InTime ${inTime}, OutTime ${outTime}`);

    const emailBody = `
Hello ${empName},

Your attendance details for ${attendanceDate.toISOString().slice(0,10)}:
In Time: ${inTime}
Out Time: ${outTime}

Regards,
HR Team
`;

    if (!empData.email) {
      console.warn(`EmpId ${empId} has no email.`);
      results.push({ empId, name: empName, status: "No email found" });
      continue;
    }

    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: empData.email,
        subject: `Attendance Report - ${attendanceDate.toISOString().slice(0,10)}`,
        text: emailBody,
      });
      console.log(`Email sent to ${empData.email} for EmpId ${empId}`);
      results.push({ empId, name: empName, email: empData.email, date: attendanceDate.toISOString().slice(0,10), inTime, outTime, status: "Email sent" });
    } catch (error) {
      console.error(`Error sending email for EmpId ${empId}:`, error);
      results.push({ empId, name: empName, status: `Error sending email: ${error.message}` });
    }
  }

  console.log(`Total matched rows for processing: ${matchedRowsCount}`);
  return results;
}

app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).send({ error: "No file uploaded" });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    console.log("File uploaded:", req.file.path);
    const results = await processAttendanceFile(req.file.path, today);

    res.send({ message: "Processing complete", matchedRows: results.length, results });
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).send({ error: "Server error" });
  }
});

app.listen(5000, () => console.log("Server running on http://localhost:5000"));
