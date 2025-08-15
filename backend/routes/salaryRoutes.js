const express = require('express');
const router = express.Router();
const salaryController = require('../controllers/salaryController');

console.log('💰 載入薪資路由...');

// 薪資路由定義
router.get('/', salaryController.getAllSalaries);           // 獲取所有薪資
router.get('/:salary_id', salaryController.getSalaryById);  // 根據薪資ID獲取單筆薪資
router.post('/', salaryController.createSalary);            // 建立新薪資
router.put('/:salary_id', salaryController.updateSalary);   // 更新薪資
router.delete('/:salary_id', salaryController.deleteSalary); // 刪除薪資
router.get('/staff/:staff_id', salaryController.getSalariesByStaffId); // 根據員工ID獲取薪資

console.log('✅ 薪資路由載入完成');

module.exports = router;