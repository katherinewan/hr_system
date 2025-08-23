const { pool } = require('../config/database');

console.log('📋 Loading attendance controller...');

// Time format validation (HH:mm:ss)
const isValidTime = (timeStr) => {
  if (!timeStr) return true; // Allow null or empty string (may only update partial fields when updating)
  const regex = /^(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d$/;
  return regex.test(timeStr);
};

// ✅ Get attendance records by employee ID
const getAttendanceByStaffId = async (req, res) => {
  try {
    const { staff_id } = req.params;
    console.log(`📥 Request: Get attendance records for employee ID ${staff_id}`);

    if (!/^\d+$/.test(staff_id)) {
      return res.status(400).json({ success: false, message: 'Employee ID must be numeric' });
    }

    const result = await pool.query(`
      SELECT 
        attendance_log,
        staff_id,
        TO_CHAR(date, 'YYYY-MM-DD') as date,
        check_in,
        check_out,
        total_hours,
        status
      FROM attendance
      WHERE staff_id = $1
      ORDER BY date DESC, check_in DESC
    `, [staff_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'No attendance records found for this employee' });
    }

    res.json({
      success: true,
      message: `Successfully retrieved ${result.rows.length} attendance records`,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('❌ Error retrieving attendance records:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve attendance records', error: error.message });
  }
};

// ✅ Get all attendance records
const getAllAttendance = async (req, res) => {
  try {
    const { date, status, staff_id, start_date, end_date, page = 1, limit = 50 } = req.query;
    console.log('📥 Request: Get all attendance records', { date, status, staff_id, start_date, end_date, page, limit });

    let query = `
      SELECT 
        attendance_log,
        staff_id,
        TO_CHAR(date, 'YYYY-MM-DD') as date,
        check_in,
        check_out,
        total_hours,
        status
      FROM attendance
      WHERE 1=1
    `;
    
    const queryParams = [];
    let paramCount = 0;

    if (date) {
      paramCount++;
      query += ` AND date = $${paramCount}`;
      queryParams.push(date);
    }
    if (start_date) {
      paramCount++;
      query += ` AND date >= $${paramCount}`;
      queryParams.push(start_date);
    }
    if (end_date) {
      paramCount++;
      query += ` AND date <= $${paramCount}`;
      queryParams.push(end_date);
    }
    if (status) {
      paramCount++;
      query += ` AND status = $${paramCount}`;
      queryParams.push(status);
    }
    if (staff_id) {
      paramCount++;
      query += ` AND staff_id = $${paramCount}`;
      queryParams.push(staff_id);
    }

    query += ` ORDER BY date DESC, check_in DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    queryParams.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

    const result = await pool.query(query, queryParams);

    // Total count
    let countQuery = 'SELECT COUNT(*) FROM attendance WHERE 1=1';
    const countParams = [];
    let idx = 0;
    if (date) { idx++; countQuery += ` AND date = $${idx}`; countParams.push(date); }
    if (start_date) { idx++; countQuery += ` AND date >= $${idx}`; countParams.push(start_date); }
    if (end_date) { idx++; countQuery += ` AND date <= $${idx}`; countParams.push(end_date); }
    if (status) { idx++; countQuery += ` AND status = $${idx}`; countParams.push(status); }
    if (staff_id) { idx++; countQuery += ` AND staff_id = $${idx}`; countParams.push(staff_id); }

    const countResult = await pool.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      message: `Successfully retrieved attendance records`,
      data: result.rows,
      count: result.rows.length,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        totalPages: Math.ceil(totalCount / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('❌ Error retrieving attendance records:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve attendance records', error: error.message });
  }
};

// ✅ Employee clock in/out
const markAttendance = async (req, res) => {
  try {
    const { staff_id, type } = req.body;
    console.log(`📥 Request: Employee ${staff_id} clock in/out`, { type });

    if (!staff_id || !type) return res.status(400).json({ success: false, message: 'Employee ID and clock type are required fields' });
    if (!['check_in', 'check_out'].includes(type)) return res.status(400).json({ success: false, message: 'Clock type must be check_in or check_out' });

    const currentTime = new Date();
    const currentDate = currentTime.toISOString().split('T')[0];
    const currentTimeStr = currentTime.toTimeString().split(' ')[0];

    if (!isValidTime(currentTimeStr)) {
      return res.status(400).json({ success: false, message: 'Time format must be HH:mm:ss' });
    }

    if (type === 'check_in') {
      const existingRecord = await pool.query(`SELECT attendance_log FROM attendance WHERE staff_id=$1 AND date=$2`, [staff_id, currentDate]);
      if (existingRecord.rows.length > 0) {
        return res.status(409).json({ success: false, message: 'Already clocked in today' });
      }
      const result = await pool.query(`
        INSERT INTO attendance (staff_id, date, check_in, status)
        VALUES ($1, $2, $3, 'Present')
        RETURNING attendance_log, staff_id, TO_CHAR(date, 'YYYY-MM-DD') as date, check_in, check_out, total_hours, status
      `, [staff_id, currentDate, currentTimeStr]);

      return res.status(201).json({ success: true, message: 'Clock in successful', data: result.rows[0] });
    } else {
      const todayRecord = await pool.query(`SELECT * FROM attendance WHERE staff_id=$1 AND date=$2 AND check_in IS NOT NULL`, [staff_id, currentDate]);
      if (todayRecord.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'No clock-in record found for today, please clock in first' });
      }
      const record = todayRecord.rows[0];
      if (record.check_out) return res.status(409).json({ success: false, message: 'Already clocked out today' });

      const checkIn = new Date(`${currentDate} ${record.check_in}`);
      const checkOut = new Date(`${currentDate} ${currentTimeStr}`);
      const totalHours = ((checkOut - checkIn) / (1000 * 60 * 60)).toFixed(2);

      const result = await pool.query(`
        UPDATE attendance 
        SET check_out=$1, total_hours=$2
        WHERE attendance_log=$3
        RETURNING attendance_log, staff_id, TO_CHAR(date, 'YYYY-MM-DD') as date, check_in, check_out, total_hours, status
      `, [currentTimeStr, totalHours, record.attendance_log]);

      return res.json({ success: true, message: `Clock out successful, total work hours: ${totalHours} hours`, data: result.rows[0] });
    }
  } catch (error) {
    console.error('❌ Clock in/out error:', error);
    res.status(500).json({ success: false, message: 'Clock in/out failed', error: error.message });
  }
};

const updateAttendance = async (req, res) => {
  try {
    const { attendance_log } = req.params;
    const { check_in, check_out, status } = req.body;
    console.log(`📥 Request: Update attendance record ${attendance_log}`, { check_in, check_out, status });

    // Validate time format
    if (check_in && !isValidTime(check_in)) {
      return res.status(400).json({ success: false, message: 'check_in time format must be HH:mm:ss' });
    }
    if (check_out && !isValidTime(check_out)) {
      return res.status(400).json({ success: false, message: 'check_out time format must be HH:mm:ss' });
    }

    let record = await pool.query(`SELECT * FROM attendance WHERE attendance_log=$1`, [attendance_log]);
    if (record.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Attendance record does not exist' });
    }

    record = record.rows[0];
    
    // Determine final check_in and check_out values
    const finalCheckIn = check_in === "" ? null : (check_in || record.check_in);
    const finalCheckOut = check_out === "" ? null : (check_out || record.check_out);
    
    // Calculate total_hours - key fix
    let totalHours = null;
    
    if (finalCheckIn && finalCheckOut) {
      try {
        // Get date string
        const dateStr = record.date instanceof Date 
          ? record.date.toISOString().split('T')[0]
          : record.date.toString().split('T')[0];
        
        const checkInTime = new Date(`${dateStr} ${finalCheckIn}`);
        const checkOutTime = new Date(`${dateStr} ${finalCheckOut}`);
        
        // Check if dates are valid
        if (!isNaN(checkInTime.getTime()) && !isNaN(checkOutTime.getTime())) {
          const diffMs = checkOutTime - checkInTime;
          if (diffMs >= 0) {
            totalHours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));
            
            // Ensure totalHours is a valid number
            if (isNaN(totalHours) || !isFinite(totalHours)) {
              totalHours = null;
            }
          } else {
            totalHours = 0.00; // Set negative time to 0
          }
        }
      } catch (error) {
        console.error('Time calculation error:', error);
        totalHours = null;
      }
    }

    console.log('Calculation result:', { finalCheckIn, finalCheckOut, totalHours });

    const result = await pool.query(`
      UPDATE attendance
      SET check_in=$1, check_out=$2, status=$3, total_hours=$4
      WHERE attendance_log=$5
      RETURNING attendance_log, staff_id, TO_CHAR(date, 'YYYY-MM-DD') as date, check_in, check_out, total_hours, status
    `, [
      check_in === "" ? null : check_in,
      check_out === "" ? null : check_out,
      status === "" ? null : status,
      totalHours, // Ensure this is number or null
      attendance_log
    ]);

    res.json({ success: true, message: 'Attendance record updated successfully', data: result.rows[0] });
  } catch (error) {
    console.error('❌ Error updating attendance record:', error);
    res.status(500).json({ success: false, message: 'Failed to update attendance record', error: error.message });
  }
};

// Create new attendance record
const createAttendance = async (req, res) => {
  try {
    const { staff_id, date, check_in, check_out, status } = req.body;
    console.log(`📥 Request: Create attendance record`, { staff_id, date, check_in, check_out, status });

    // Validate required fields
    if (!staff_id || !date || !status) {
      return res.status(400).json({ success: false, message: 'Employee ID, date, and status are required fields' });
    }

    // Validate time format
    if (check_in && !isValidTime(check_in)) {
      return res.status(400).json({ success: false, message: 'check_in time format must be HH:mm:ss' });
    }
    if (check_out && !isValidTime(check_out)) {
      return res.status(400).json({ success: false, message: 'check_out time format must be HH:mm:ss' });
    }

    // Generate attendance_log ID: ATT_staffid_YYYYMMDD
    const dateStr = date.replace(/-/g, ''); // Convert YYYY-MM-DD to YYYYMMDD
    const attendanceLogId = `ATT_${staff_id}_${dateStr}`;

    // Calculate work hours
    let totalHours = null;
    if (check_in && check_out) {
      const checkInTime = new Date(`${date} ${check_in}`);
      const checkOutTime = new Date(`${date} ${check_out}`);
      const diffMs = checkOutTime - checkInTime;
      totalHours = (diffMs / (1000 * 60 * 60)).toFixed(2);
    }

    // Check if record already exists for this employee on this date
    const existingRecord = await pool.query(`
      SELECT attendance_log FROM attendance WHERE staff_id=$1 AND date=$2
    `, [staff_id, date]);

    if (existingRecord.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Attendance record already exists for this employee on this date' });
    }

    // Also check if attendance_log already exists
    const existingLogId = await pool.query(`
      SELECT attendance_log FROM attendance WHERE attendance_log=$1
    `, [attendanceLogId]);

    if (existingLogId.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'This attendance record ID already exists' });
    }

    const result = await pool.query(`
      INSERT INTO attendance (attendance_log, staff_id, date, check_in, check_out, total_hours, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING attendance_log, staff_id, TO_CHAR(date, 'YYYY-MM-DD') as date, check_in, check_out, total_hours, status
    `, [attendanceLogId, staff_id, date, check_in || null, check_out || null, totalHours, status]);

    res.status(201).json({ 
      success: true, 
      message: 'Attendance record created successfully', 
      data: result.rows[0] 
    });
  } catch (error) {
    console.error('❌ Error creating attendance record:', error);
    res.status(500).json({ success: false, message: 'Failed to create attendance record', error: error.message });
  }
};

// ✅ Delete attendance record
const deleteAttendance = async (req, res) => {
  try {
    const { attendance_log } = req.params;
    console.log(`📥 Request: Delete attendance record ${attendance_log}`);

    const existing = await pool.query(`SELECT * FROM attendance WHERE attendance_log=$1`, [attendance_log]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Attendance record not found' });
    }

    await pool.query(`DELETE FROM attendance WHERE attendance_log=$1`, [attendance_log]);
    res.json({ success: true, message: 'Attendance record deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting attendance record:', error);
    res.status(500).json({ success: false, message: 'Failed to delete attendance record', error: error.message });
  }
};

// ✅ Attendance report
const getAttendanceReport = async (req, res) => {
  try {
    const { start_date, end_date, staff_id } = req.query;
    console.log('📥 Request: Get attendance report', { start_date, end_date, staff_id });

    if (!start_date || !end_date) {
      return res.status(400).json({ success: false, message: 'Start date and end date are required' });
    }

    let query = `
      SELECT 
        staff_id,
        COUNT(CASE WHEN status = 'Present' THEN 1 END) as present_days,
        COUNT(CASE WHEN status = 'Absent' THEN 1 END) as absent_days,
        COUNT(CASE WHEN status = 'Late' THEN 1 END) as late_days,
        COUNT(CASE WHEN status = 'Sick Leave' THEN 1 END) as sick_leave_days,
        COUNT(CASE WHEN status = 'Annual Leave' THEN 1 END) as annual_leave_days,
        COUNT(CASE WHEN status = 'Overtime' THEN 1 END) as overtime_days,
        SUM(total_hours) as total_hours
      FROM attendance
      WHERE date BETWEEN $1 AND $2
    `;

    const queryParams = [start_date, end_date];
    if (staff_id) {
      query += ` AND staff_id = $3`;
      queryParams.push(staff_id);
    }
    query += ` GROUP BY staff_id ORDER BY staff_id`;

    const result = await pool.query(query, queryParams);
    res.json({ success: true, message: 'Attendance report generated successfully', data: result.rows });
  } catch (error) {
    console.error('❌ Attendance report error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate attendance report', error: error.message });
  }
};

// 在 attendController.js 中修正 getMyAttendance 函數
const getMyAttendance = async (req, res) => {
  try {
    // 從認證中間件獲取員工ID - 注意屬性名是 staffId（在 auth.js 中設置的）
    const staffId = req.staff.staffId;
    console.log(`🔥 Request: Get my attendance records for staff ${staffId}`);

    const result = await pool.query(`
      SELECT 
        attendance_log,
        staff_id,
        TO_CHAR(date, 'YYYY-MM-DD') as date,
        check_in,
        check_out,
        total_hours,
        status
      FROM attendance
      WHERE staff_id = $1
      ORDER BY date DESC
      LIMIT 100
    `, [staffId]);

    console.log(`Found ${result.rows.length} attendance records for staff ${staffId}`);

    res.json({
      success: true,
      message: `Successfully retrieved ${result.rows.length} attendance records`,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('❌ Error retrieving my attendance records:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to retrieve attendance records', 
      error: error.message 
    });
  }
};

module.exports = {
  getAttendanceByStaffId,
  getAllAttendance,
  markAttendance,
  updateAttendance,
  deleteAttendance,
  getAttendanceReport,
  createAttendance,
  getMyAttendance
};