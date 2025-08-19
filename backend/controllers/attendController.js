const { pool } = require('../config/database');

console.log('📋 載入出勤控制器...');

// 時間格式驗證 (HH:mm:ss)
const isValidTime = (timeStr) => {
  if (!timeStr) return true; // 允許 null 或空字串（更新時可能只更新部分欄位）
  const regex = /^(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d$/;
  return regex.test(timeStr);
};

// ✅ 根據員工 ID 獲取出勤記錄
const getAttendanceByStaffId = async (req, res) => {
  try {
    const { staff_id } = req.params;
    console.log(`📥 請求：獲取員工 ID ${staff_id} 的出勤記錄`);

    if (!/^\d+$/.test(staff_id)) {
      return res.status(400).json({ success: false, message: '員工 ID 必須是數字' });
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
      return res.status(404).json({ success: false, message: '找不到該員工的出勤記錄' });
    }

    res.json({
      success: true,
      message: `成功獲取 ${result.rows.length} 條出勤記錄`,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('❌ 獲取出勤記錄錯誤:', error);
    res.status(500).json({ success: false, message: '獲取出勤記錄失敗', error: error.message });
  }
};

// ✅ 獲取所有出勤記錄
const getAllAttendance = async (req, res) => {
  try {
    const { date, status, staff_id, start_date, end_date, page = 1, limit = 50 } = req.query;
    console.log('📥 請求：獲取所有出勤記錄', { date, status, staff_id, start_date, end_date, page, limit });

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

    // 總數
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
      message: `成功獲取出勤記錄`,
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
    console.error('❌ 獲取出勤記錄錯誤:', error);
    res.status(500).json({ success: false, message: '獲取出勤記錄失敗', error: error.message });
  }
};

// ✅ 員工打卡（上班/下班）
const markAttendance = async (req, res) => {
  try {
    const { staff_id, type } = req.body;
    console.log(`📥 請求：員工 ${staff_id} 打卡`, { type });

    if (!staff_id || !type) return res.status(400).json({ success: false, message: '員工 ID 和打卡類型為必填欄位' });
    if (!['check_in', 'check_out'].includes(type)) return res.status(400).json({ success: false, message: '打卡類型必須是 check_in 或 check_out' });

    const currentTime = new Date();
    const currentDate = currentTime.toISOString().split('T')[0];
    const currentTimeStr = currentTime.toTimeString().split(' ')[0];

    if (!isValidTime(currentTimeStr)) {
      return res.status(400).json({ success: false, message: '時間格式必須為 HH:mm:ss' });
    }

    if (type === 'check_in') {
      const existingRecord = await pool.query(`SELECT attendance_log FROM attendance WHERE staff_id=$1 AND date=$2`, [staff_id, currentDate]);
      if (existingRecord.rows.length > 0) {
        return res.status(409).json({ success: false, message: '今天已經打過上班卡了' });
      }
      const result = await pool.query(`
        INSERT INTO attendance (staff_id, date, check_in, status)
        VALUES ($1, $2, $3, 'Present')
        RETURNING attendance_log, staff_id, TO_CHAR(date, 'YYYY-MM-DD') as date, check_in, check_out, total_hours, status
      `, [staff_id, currentDate, currentTimeStr]);

      return res.status(201).json({ success: true, message: '上班打卡成功', data: result.rows[0] });
    } else {
      const todayRecord = await pool.query(`SELECT * FROM attendance WHERE staff_id=$1 AND date=$2 AND check_in IS NOT NULL`, [staff_id, currentDate]);
      if (todayRecord.rows.length === 0) {
        return res.status(404).json({ success: false, message: '找不到今天的上班記錄，請先打上班卡' });
      }
      const record = todayRecord.rows[0];
      if (record.check_out) return res.status(409).json({ success: false, message: '今天已經打過下班卡了' });

      const checkIn = new Date(`${currentDate} ${record.check_in}`);
      const checkOut = new Date(`${currentDate} ${currentTimeStr}`);
      const totalHours = ((checkOut - checkIn) / (1000 * 60 * 60)).toFixed(2);

      const result = await pool.query(`
        UPDATE attendance 
        SET check_out=$1, total_hours=$2
        WHERE attendance_log=$3
        RETURNING attendance_log, staff_id, TO_CHAR(date, 'YYYY-MM-DD') as date, check_in, check_out, total_hours, status
      `, [currentTimeStr, totalHours, record.attendance_log]);

      return res.json({ success: true, message: `下班打卡成功，工作時數：${totalHours} 小時`, data: result.rows[0] });
    }
  } catch (error) {
    console.error('❌ 打卡錯誤:', error);
    res.status(500).json({ success: false, message: '打卡失敗', error: error.message });
  }
};

const updateAttendance = async (req, res) => {
  try {
    const { attendance_log } = req.params;
    const { check_in, check_out, status } = req.body;
    console.log(`📥 請求：更新出勤記錄 ${attendance_log}`, { check_in, check_out, status });

    // 驗證時間格式
    if (check_in && !isValidTime(check_in)) {
      return res.status(400).json({ success: false, message: 'check_in 時間格式必須為 HH:mm:ss' });
    }
    if (check_out && !isValidTime(check_out)) {
      return res.status(400).json({ success: false, message: 'check_out 時間格式必須為 HH:mm:ss' });
    }

    let record = await pool.query(`SELECT * FROM attendance WHERE attendance_log=$1`, [attendance_log]);
    if (record.rows.length === 0) {
      return res.status(404).json({ success: false, message: '出勤記錄不存在' });
    }

    record = record.rows[0];
    
    // 確定最終的 check_in 和 check_out 值
    const finalCheckIn = check_in === "" ? null : (check_in || record.check_in);
    const finalCheckOut = check_out === "" ? null : (check_out || record.check_out);
    
    // 計算 total_hours - 重點修復
    let totalHours = null;
    
    if (finalCheckIn && finalCheckOut) {
      try {
        // 獲取日期字符串
        const dateStr = record.date instanceof Date 
          ? record.date.toISOString().split('T')[0]
          : record.date.toString().split('T')[0];
        
        const checkInTime = new Date(`${dateStr} ${finalCheckIn}`);
        const checkOutTime = new Date(`${dateStr} ${finalCheckOut}`);
        
        // 檢查日期是否有效
        if (!isNaN(checkInTime.getTime()) && !isNaN(checkOutTime.getTime())) {
          const diffMs = checkOutTime - checkInTime;
          if (diffMs >= 0) {
            totalHours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));
            
            // 確保 totalHours 是有效數字
            if (isNaN(totalHours) || !isFinite(totalHours)) {
              totalHours = null;
            }
          } else {
            totalHours = 0.00; // 負數時間設為 0
          }
        }
      } catch (error) {
        console.error('時間計算錯誤:', error);
        totalHours = null;
      }
    }

    console.log('計算結果:', { finalCheckIn, finalCheckOut, totalHours });

    const result = await pool.query(`
      UPDATE attendance
      SET check_in=$1, check_out=$2, status=$3, total_hours=$4
      WHERE attendance_log=$5
      RETURNING attendance_log, staff_id, TO_CHAR(date, 'YYYY-MM-DD') as date, check_in, check_out, total_hours, status
    `, [
      check_in === "" ? null : check_in,
      check_out === "" ? null : check_out,
      status === "" ? null : status,
      totalHours, // 確保這是 number 或 null
      attendance_log
    ]);

    res.json({ success: true, message: '出勤記錄更新成功', data: result.rows[0] });
  } catch (error) {
    console.error('❌ 更新出勤記錄錯誤:', error);
    res.status(500).json({ success: false, message: '更新出勤記錄失敗', error: error.message });
  }
};

// 創建新的出勤記錄
const createAttendance = async (req, res) => {
  try {
    const { staff_id, date, check_in, check_out, status } = req.body;
    console.log(`📥 請求：創建出勤記錄`, { staff_id, date, check_in, check_out, status });

    // 驗證必填欄位
    if (!staff_id || !date || !status) {
      return res.status(400).json({ success: false, message: '員工 ID、日期和狀態為必填欄位' });
    }

    // 驗證時間格式
    if (check_in && !isValidTime(check_in)) {
      return res.status(400).json({ success: false, message: 'check_in 時間格式必須為 HH:mm:ss' });
    }
    if (check_out && !isValidTime(check_out)) {
      return res.status(400).json({ success: false, message: 'check_out 時間格式必須為 HH:mm:ss' });
    }

    // 生成 attendance_log ID: ATT_staffid_YYYYMMDD
    const dateStr = date.replace(/-/g, ''); // 將 YYYY-MM-DD 轉換為 YYYYMMDD
    const attendanceLogId = `ATT_${staff_id}_${dateStr}`;

    // 計算工作時數
    let totalHours = null;
    if (check_in && check_out) {
      const checkInTime = new Date(`${date} ${check_in}`);
      const checkOutTime = new Date(`${date} ${check_out}`);
      const diffMs = checkOutTime - checkInTime;
      totalHours = (diffMs / (1000 * 60 * 60)).toFixed(2);
    }

    // 檢查是否已存在該員工當天的記錄
    const existingRecord = await pool.query(`
      SELECT attendance_log FROM attendance WHERE staff_id=$1 AND date=$2
    `, [staff_id, date]);

    if (existingRecord.rows.length > 0) {
      return res.status(409).json({ success: false, message: '該員工當天已有出勤記錄' });
    }

    // 也可以直接檢查 attendance_log 是否已存在
    const existingLogId = await pool.query(`
      SELECT attendance_log FROM attendance WHERE attendance_log=$1
    `, [attendanceLogId]);

    if (existingLogId.rows.length > 0) {
      return res.status(409).json({ success: false, message: '該出勤記錄 ID 已存在' });
    }

    const result = await pool.query(`
      INSERT INTO attendance (attendance_log, staff_id, date, check_in, check_out, total_hours, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING attendance_log, staff_id, TO_CHAR(date, 'YYYY-MM-DD') as date, check_in, check_out, total_hours, status
    `, [attendanceLogId, staff_id, date, check_in || null, check_out || null, totalHours, status]);

    res.status(201).json({ 
      success: true, 
      message: '出勤記錄創建成功', 
      data: result.rows[0] 
    });
  } catch (error) {
    console.error('❌ 創建出勤記錄錯誤:', error);
    res.status(500).json({ success: false, message: '創建出勤記錄失敗', error: error.message });
  }
};

// ✅ 刪除出勤記錄
const deleteAttendance = async (req, res) => {
  try {
    const { attendance_log } = req.params;
    console.log(`📥 請求：刪除出勤記錄 ${attendance_log}`);

    const existing = await pool.query(`SELECT * FROM attendance WHERE attendance_log=$1`, [attendance_log]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: '找不到該出勤記錄' });
    }

    await pool.query(`DELETE FROM attendance WHERE attendance_log=$1`, [attendance_log]);
    res.json({ success: true, message: '出勤記錄刪除成功' });
  } catch (error) {
    console.error('❌ 刪除出勤記錄錯誤:', error);
    res.status(500).json({ success: false, message: '刪除出勤記錄失敗', error: error.message });
  }
};

// ✅ 出勤報告
const getAttendanceReport = async (req, res) => {
  try {
    const { start_date, end_date, staff_id } = req.query;
    console.log('📥 請求：獲取出勤報告', { start_date, end_date, staff_id });

    if (!start_date || !end_date) {
      return res.status(400).json({ success: false, message: '開始日期和結束日期為必填' });
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
    res.json({ success: true, message: '成功生成出勤報告', data: result.rows });
  } catch (error) {
    console.error('❌ 出勤報告錯誤:', error);
    res.status(500).json({ success: false, message: '生成出勤報告失敗', error: error.message });
  }
};

module.exports = {
  getAttendanceByStaffId,
  getAllAttendance,
  markAttendance,
  updateAttendance,
  deleteAttendance,
  getAttendanceReport,
  createAttendance  // 新增
};