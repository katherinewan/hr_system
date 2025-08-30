const express = require('express');
const router = express.Router();
const salaryController = require('../controllers/salaryController');

console.log('💰 Loading salary routes...');

// Salary route definitions
router.get('/', salaryController.getAllSalaries);                  // Get all salaries
router.get('/staff/:staff_id', salaryController.getSalariesByStaffId); // Get salaries by staff ID (要放前面)
router.get('/:salary_id', salaryController.getSalaryById);         // Get single salary by salary ID
router.post('/', salaryController.createSalary);                   // Create new salary
router.put('/:salary_id', salaryController.updateSalary);          // Update salary
router.delete('/:salary_id', salaryController.deleteSalary);       // Delete salary

console.log('✅ Salary routes loaded successfully');

module.exports = router;
