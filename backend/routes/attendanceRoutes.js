const express = require('express');
const { uploadAttendanceData } = require('../controllers/attendanceController');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

const router = express.Router();

router.post('/upload', upload.single('file'), uploadAttendanceData);

module.exports = router;
