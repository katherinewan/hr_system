const express = require('express');
const router = express.Router();
const salaryController = require('../controllers/salaryController');

console.log('💰 Loading salary routes...');

// Salary route definitions
router.get('/', salaryController.getAllSalaries);           // Get all salaries
router.get('/:salary_id', salaryController.getSalaryById);  // Get single salary by salary ID
router.post('/', salaryController.createSalary);            // Create new salary
router.put('/:salary_id', salaryController.updateSalary);   // Update salary
router.delete('/:salary_id', salaryController.deleteSalary); // Delete salary
router.get('/staff/:staff_id', salaryController.getSalariesByStaffId); // Get salaries by staff ID

console.log('✅ Salary routes loaded successfully');

module.exports = router;