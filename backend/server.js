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
  .catch((err) => console.error("MongoDB connection error:", err));

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
  // Parse as array of arrays, no headers
  const rawRows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: "" });

  const allEmployees = await Employee.find({}, { employeeId: 1, email:1, name:1 }).lean();
  const employeeMap = new Map(allEmployees.map(emp => [emp.employeeId, emp]));

  const results = [];

  let currentEmployeeId = null;
  let currentEmployeeName = null;

  for (let i=0; i < rawRows.length; i++) {
    const row = rawRows[i].map(cell => (typeof cell === 'string') ? cell.trim() : cell);

    if (row.length < 2) continue; // skip empty or invalid rows

    // Detect Emp Code row: first or second column is "Emp Code:"
    if (row[0] === "Emp Code:" || row[1] === "Emp Code:") {
      // Emp Code is next column after "Emp Code:"
      currentEmployeeId = row[1] === "Emp Code:" ? (row[2] ? row[2].toString().trim() : null)
                                                : (row[1] ? row[1].toString().trim() : null);
      // Employee Name is in "Employee Name :" row in next rows, try to find
      currentEmployeeName = null;
      // Search next few rows for Employee Name
      for(let j = i+1; j < i+5 && j < rawRows.length; j++) {
        const r = rawRows[j].map(c => (typeof c === 'string') ? c.trim() : c);
        if (r[0] === "Employee Name :" || r[1] === "Employee Name :") {
          currentEmployeeName = r[2] ? r[2].toString().trim() : null;
          break;
        }
      }
      continue;
    }

    // Detect attendance data row by matching date pattern in first column, e.g. "01-Aug-2025" or "2025-08-01"
    let attDateStr = null;
    if (row[0] && (typeof row[0] === "string" || row[0] instanceof Date)) {
      attDateStr = row[0];
    } else if (row[1] && (typeof row[1] === "string" || row[1] instanceof Date)) {
      attDateStr = row[1];
    }
    if (!attDateStr) continue;

    // Try parse date (as string or Date)
    let attendanceDate = parseDateString(attDateStr);
    if (!attendanceDate) continue;

    // Filter by target date
    if (attendanceDate.getTime() !== targetDate.getTime()) continue;

    if (!currentEmployeeId) {
      console.warn(`Attendance row at ${i} without associated Emp Code - skipping`);
      continue;
    }

    // Check employee in DB
    if (!employeeMap.has(currentEmployeeId)) {
      console.warn(`EmpId ${currentEmployeeId} not in DB - skipping attendance row at ${i}`);
      continue;
    }

    const empData = employeeMap.get(currentEmployeeId);
    const empName = empData.name || currentEmployeeName || "Employee";

    // Extract InTime and OutTime depending on your Excel columns:
    // Based on your data, InTime likely in second or third column
    // 01-Aug-2025,09:15:43,19:31:06,...
    const inTimeVal = row[1] && typeof row[1] === "string" ? row[1].trim() : (row[2] && typeof row[2] === "string" ? row[2].trim() : "N/A");
    const outTimeVal = row[2] && typeof row[2] === "string" ? row[2].trim() : (row[3] && typeof row[3] === "string" ? row[3].trim() : "N/A");

    console.log(`Processing EmpId=${currentEmployeeId}, Name=${empName}, Date=${attendanceDate.toISOString().slice(0,10)}, InTime=${inTimeVal}, OutTime=${outTimeVal}`);

    if (!empData.email) {
      console.warn(`No email for EmpId=${currentEmployeeId} at row ${i}`);
      results.push({ empId: currentEmployeeId, name: empName, status: "No email found" });
      continue;
    }

    // Compose email
    const emailText = `
Hello ${empName},

Your attendance details for ${attendanceDate.toISOString().slice(0,10)}:
In Time: ${inTimeVal}
Out Time: ${outTimeVal}

Regards,
HR Team
    `;

    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: empData.email,
        subject: `Attendance Report - ${attendanceDate.toISOString().slice(0,10)}`,
        text: emailText,
      });
      console.log(`Email sent to ${empData.email} for EmpId=${currentEmployeeId}`);
      results.push({ empId: currentEmployeeId, name: empName, email: empData.email, date: attendanceDate.toISOString().slice(0,10), inTime: inTimeVal, outTime: outTimeVal, status: "Email sent" });
    } catch (err) {
      console.error(`Failed to send mail to EmpId=${currentEmployeeId}:`, err);
      results.push({ empId: currentEmployeeId, name: empName, status: `Mail send error: ${err.message}` });
    }
  }

  return results;
}

app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).send({ error: "No file uploaded" });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    console.log("File uploaded:", req.file.path);
    const results = await processAttendanceFile(req.file.path, today);

    res.send({ message: "Processing complete", results, count: results.length });
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).send({ error: "Server error" });
  }
});

app.listen(5000, () => console.log("Server running on http://localhost:5000"));
