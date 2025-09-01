const { query } = require('../config/database');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

console.log('📄 Loading payslip controller...');

// Generate payslip PDF
const generatePayslipPDF = async (payrollData) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 }
      });
      
      const filename = `payslip_${payrollData.staff_id}_${payrollData.period_start.replace(/-/g, '')}.pdf`;
      const filePath = path.join(__dirname, '../temp/', filename);
      
      // Ensure temp directory exists
      const tempDir = path.dirname(filePath);
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // Header
      doc.fontSize(18).font('Helvetica-Bold')
         .text('Payslip', 50, 50)
         .fontSize(12).font('Helvetica')
         .text('Zoomedia Inc', 50, 75)
         .text('21023 Pearson Point Road', 50, 90)
         .text('Gateway Avenue', 50, 105);

      // Employee Info Box
      const leftBox = { x: 50, y: 140, width: 240, height: 120 };
      doc.rect(leftBox.x, leftBox.y, leftBox.width, leftBox.height).stroke();
      
      // Employee Details
      doc.fontSize(10)
         .text('Date of Joining:', leftBox.x + 10, leftBox.y + 15)
         .text(payrollData.date_of_joining || 'N/A', leftBox.x + 120, leftBox.y + 15)
         .text('Pay Period:', leftBox.x + 10, leftBox.y + 30)
         .text(`${payrollData.period_start} - ${payrollData.period_end}`, leftBox.x + 120, leftBox.y + 30)
         .text('Worked Days:', leftBox.x + 10, leftBox.y + 45)
         .text('30', leftBox.x + 120, leftBox.y + 45)
         .text('Employee name:', leftBox.x + 10, leftBox.y + 70)
         .text(payrollData.staff_name, leftBox.x + 120, leftBox.y + 70)
         .text('Designation:', leftBox.x + 10, leftBox.y + 85)
         .text(payrollData.position_title || 'N/A', leftBox.x + 120, leftBox.y + 85)
         .text('Department:', leftBox.x + 10, leftBox.y + 100)
         .text(payrollData.department_name || 'N/A', leftBox.x + 120, leftBox.y + 100);

      // Salary Details Table
      const tableTop = 280;
      const leftCol = 50;
      const amountCol = 150;
      const rightCol = 300;
      const rightAmountCol = 450;

      // Table Headers
      doc.rect(leftCol, tableTop, 250, 20).fill('#f0f0f0').stroke();
      doc.rect(rightCol, tableTop, 250, 20).fill('#f0f0f0').stroke();
      
      doc.fillColor('black')
         .fontSize(10).font('Helvetica-Bold')
         .text('Earnings', leftCol + 80, tableTop + 6)
         .text('Amount', amountCol + 40, tableTop + 6)
         .text('Deductions', rightCol + 80, tableTop + 6)
         .text('Amount', rightAmountCol + 30, tableTop + 6);

      // Calculate earnings and deductions
      let earnings = [];
      let deductions = [];
      let totalEarnings = 0;
      let totalDeductions = 0;

      if (payrollData.details && payrollData.details.length > 0) {
        payrollData.details.forEach(detail => {
          if (detail.component_type === 'earning') {
            earnings.push({ name: detail.component_name, amount: detail.amount });
            totalEarnings += parseFloat(detail.amount);
          } else {
            deductions.push({ name: detail.component_name, amount: detail.amount });
            totalDeductions += parseFloat(detail.amount);
          }
        });
      } else {
        // Default from salary data
        earnings.push({ name: 'Basic', amount: payrollData.basic_salary || 0 });
        if (payrollData.allowance && payrollData.allowance > 0) {
          earnings.push({ name: 'Allowance', amount: payrollData.allowance });
        }
        if (payrollData.deduction && payrollData.deduction > 0) {
          deductions.push({ name: 'Deduction', amount: payrollData.deduction });
        }
        totalEarnings = (parseFloat(payrollData.basic_salary) || 0) + (parseFloat(payrollData.allowance) || 0);
        totalDeductions = parseFloat(payrollData.deduction) || 0;
      }

      // Fill table content
      let currentY = tableTop + 25;
      const maxRows = Math.max(earnings.length, deductions.length);
      
      doc.font('Helvetica');
      for (let i = 0; i < maxRows; i++) {
        // Earnings side
        if (i < earnings.length) {
          doc.text(earnings[i].name, leftCol + 5, currentY)
             .text(earnings[i].amount.toFixed(2), amountCol + 5, currentY);
        }
        
        // Deductions side
        if (i < deductions.length) {
          doc.text(deductions[i].name, rightCol + 5, currentY)
             .text(deductions[i].amount.toFixed(2), rightAmountCol + 5, currentY);
        }
        
        currentY += 20;
      }

      // Totals
      currentY += 10;
      doc.rect(leftCol, currentY, 250, 20).fill('#f0f0f0').stroke();
      doc.rect(rightCol, currentY, 250, 20).fill('#f0f0f0').stroke();
      
      doc.fillColor('black').font('Helvetica-Bold')
         .text('Total Earnings', leftCol + 5, currentY + 6)
         .text(totalEarnings.toFixed(2), amountCol + 5, currentY + 6)
         .text('Total Deductions', rightCol + 5, currentY + 6)
         .text(totalDeductions.toFixed(2), rightAmountCol + 5, currentY + 6);

      // Net Pay
      const netPay = totalEarnings - totalDeductions;
      currentY += 40;
      doc.fontSize(12).font('Helvetica-Bold')
         .text('Net Pay:', leftCol, currentY)
         .text(netPay.toFixed(2), amountCol, currentY);

      // Net Pay in words
      currentY += 30;
      doc.fontSize(10).font('Helvetica')
         .text(numberToWords(netPay), leftCol, currentY, { width: 500 });

      // Signatures
      currentY += 60;
      doc.text('Employer Signature', leftCol, currentY)
         .text('Employee Signature', rightCol, currentY);

      // Footer
      doc.fontSize(8)
         .text('This is system generated payslip', 250, doc.page.height - 30, { 
           align: 'center' 
         });

      doc.end();

      stream.on('finish', () => {
        resolve({ filePath, filename });
      });

      stream.on('error', reject);

    } catch (error) {
      reject(error);
    }
  });
};

// Simple number to words conversion (for demonstration)
const numberToWords = (num) => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const thousands = ['', 'Thousand', 'Million', 'Billion'];

  if (num === 0) return 'Zero Dollars Only';
  if (num < 0) return 'Negative ' + numberToWords(Math.abs(num));

  const integerPart = Math.floor(num);
  const decimalPart = Math.round((num - integerPart) * 100);

  let result = convertInteger(integerPart);
  result += ' Dollar' + (integerPart !== 1 ? 's' : '');
  
  if (decimalPart > 0) {
    result += ' and ' + convertInteger(decimalPart) + ' Cent' + (decimalPart !== 1 ? 's' : '');
  }
  
  return result + ' Only';

  function convertInteger(num) {
    if (num === 0) return '';
    if (num < 10) return ones[num];
    if (num < 20) return teens[num - 10];
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '');
    if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' ' + convertInteger(num % 100) : '');
    
    for (let i = thousands.length - 1; i > 0; i--) {
      const unit = Math.pow(1000, i);
      if (num >= unit) {
        return convertInteger(Math.floor(num / unit)) + ' ' + thousands[i] + (num % unit ? ' ' + convertInteger(num % unit) : '');
      }
    }
    return convertInteger(num);
  }
};

// Get payslip by payroll ID
const getPayslip = async (req, res) => {
  try {
    const { payroll_id } = req.params;
    console.log(`📄 Request: Get payslip for payroll ID ${payroll_id}`);

    // Get payroll data with details
    const payrollResult = await query(`
      SELECT 
        p.payroll_id,
        p.staff_id,
        st.name AS staff_name,
        st.date_of_joining,
        pos.title AS position_title,
        dept.name AS department_name,
        p.period_start,
        p.period_end,
        p.total_salary,
        p.status,
        p.created_at,
        s.basic_salary,
        s.allowance,
        s.deduction
      FROM payroll p
      JOIN staff st ON p.staff_id = st.staff_id
      LEFT JOIN position pos ON st.position_id = pos.position_id
      LEFT JOIN department dept ON pos.department_id = dept.department_id
      LEFT JOIN salary s ON p.staff_id = s.staff_id
      WHERE p.payroll_id = $1
    `, [payroll_id]);

    if (payrollResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Payroll record not found' });
    }

    // Get payroll details
    const detailsResult = await query(`
      SELECT component_name, amount, component_type
      FROM payroll_detail
      WHERE payroll_id = $1
      ORDER BY component_type DESC, component_name
    `, [payroll_id]);

    const payrollData = payrollResult.rows[0];
    payrollData.details = detailsResult.rows;

    res.json({
      success: true,
      data: payrollData
    });

  } catch (error) {
    console.error('❌ Error retrieving payslip:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Generate and download payslip PDF
const downloadPayslip = async (req, res) => {
  try {
    const { payroll_id } = req.params;
    console.log(`📄 Request: Download payslip PDF for payroll ID ${payroll_id}`);

    // Get payroll data
    const payrollResult = await query(`
      SELECT 
        p.payroll_id,
        p.staff_id,
        st.name AS staff_name,
        st.date_of_joining,
        pos.title AS position_title,
        dept.name AS department_name,
        p.period_start::date as period_start,
        p.period_end::date as period_end,
        p.total_salary,
        p.status,
        s.basic_salary,
        s.allowance,
        s.deduction
      FROM payroll p
      JOIN staff st ON p.staff_id = st.staff_id
      LEFT JOIN position pos ON st.position_id = pos.position_id
      LEFT JOIN department dept ON pos.department_id = dept.department_id
      LEFT JOIN salary s ON p.staff_id = s.staff_id
      WHERE p.payroll_id = $1
    `, [payroll_id]);

    if (payrollResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Payroll record not found' });
    }

    // Get payroll details
    const detailsResult = await query(`
      SELECT component_name, amount, component_type
      FROM payroll_detail
      WHERE payroll_id = $1
      ORDER BY component_type DESC, component_name
    `, [payroll_id]);

    const payrollData = payrollResult.rows[0];
    payrollData.details = detailsResult.rows;

    // Generate PDF
    const { filePath, filename } = await generatePayslipPDF(payrollData);

    // Send PDF file
    res.download(filePath, filename, (err) => {
      if (err) {
        console.error('Error sending file:', err);
        res.status(500).json({ success: false, message: 'Error downloading file' });
      }
      
      // Clean up temp file after sending
      setTimeout(() => {
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (cleanupError) {
          console.error('Error cleaning up temp file:', cleanupError);
        }
      }, 5000);
    });

  } catch (error) {
    console.error('❌ Error generating payslip PDF:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get staff payslips (for employee self-service)
const getStaffPayslips = async (req, res) => {
  try {
    const { staff_id } = req.params;
    console.log(`📄 Request: Get payslips for staff ID ${staff_id}`);

    const result = await query(`
      SELECT 
        p.payroll_id,
        p.staff_id,
        st.name AS staff_name,
        p.period_start,
        p.period_end,
        p.total_salary,
        p.status,
        p.created_at
      FROM payroll p
      JOIN staff st ON p.staff_id = st.staff_id
      WHERE p.staff_id = $1
      AND p.status IN ('confirmed', 'paid')
      ORDER BY p.period_start DESC
    `, [staff_id]);

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('❌ Error retrieving staff payslips:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getPayslip,
  downloadPayslip,
  getStaffPayslips
};