const express = require('express');
const router = express.Router();
const payrollController = require('../controllers/payrollController');

console.log('💰 Loading payroll routes...');

// Payroll route definitions
router.get('/', payrollController.getAllPayrolls);                    // Get all payrolls
router.get('/staff/:staff_id', payrollController.getPayrollsByStaffId); // Get payrolls by staff ID (要放前面)
router.get('/:payroll_id', payrollController.getPayrollById);         // Get single payroll by payroll ID
router.post('/', payrollController.createPayroll);                   // Create new payroll
router.put('/:payroll_id', payrollController.updatePayroll);         // Update payroll
router.patch('/:payroll_id/status', payrollController.updatePayrollStatus); // Update payroll status only
router.delete('/:payroll_id', payrollController.deletePayroll);      // Delete payroll

console.log('✅ Payroll routes loaded successfully');

module.exports = router;