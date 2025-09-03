const express = require('express');
const router = express.Router();
const payslipController = require('../controllers/payslipController');

console.log('📄 Loading payslip routes...');

// Payslip route definitions
router.get('/staff/:staff_id', payslipController.getStaffPayslips);    // Get all payslips for a staff member (員工自助服務)
router.get('/:payroll_id', payslipController.getPayslip);             // Get payslip data by payroll ID
router.get('/:payroll_id/download', payslipController.downloadPayslip); // Download payslip PDF

console.log('✅ Payslip routes loaded successfully');

module.exports = router;
