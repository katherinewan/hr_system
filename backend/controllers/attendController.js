const { pool } = require('../config/database');

console.log('📋 載入出勤控制器...');

// 根據員工 ID 獲取出勤記錄
const getAttendanceByStaffId = async (req, res) => {
  try {
    const { staff_id } = req.params;
    console.log(`📥 請求：獲取員工 ID ${staff_id} 的出勤記錄`);

    // 驗證 ID 格式
    if (!/^\d+$/.test(staff_id)) {
      return res.status(400).json({
        success: false,
        message: '員工 ID 必須是數字'
      });
    }

    const result = await pool.query(`
      SELECT 
        attendance_log,
        staff_id,
        date,
        check_in,
        check_out,
        total_hours,
        status
      FROM attendance
      WHERE staff_id = $1
      ORDER BY date DESC, check_in DESC
    `, [parseInt(staff_id)]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '找不到該員工的出勤記錄'
      });
    }

    console.log(`✅ 成功獲取 ${result.rows.length} 條出勤記錄`);
    
    res.json({
      success: true,
      message: `成功獲取 ${result.rows.length} 條出勤記錄`,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('❌ 獲取出勤記錄錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取出勤記錄失敗',
      error: error.message
    });
  }
};

// 獲取所有出勤記錄
const getAllAttendance = async (req, res) => {
  try {
    const { date, status, staff_id, start_date, end_date, page = 1, limit = 50 } = req.query;
    console.log('📥 請求：獲取所有出勤記錄', { date, status, staff_id, start_date, end_date, page, limit });

    let query = `
      SELECT 
        attendance_log,
        staff_id,
        date,
        check_in,
        check_out,
        total_hours,
        status
      FROM attendance
      WHERE 1=1
    `;
    
    const queryParams = [];
    let paramCount = 0;

    // 日期篩選
    if (date) {
      paramCount++;
      query += ` AND date = $${paramCount}`;
      queryParams.push(date);
    }

    // 日期範圍篩選
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

    // 狀態篩選
    if (status) {
      paramCount++;
      query += ` AND status = $${paramCount}`;
      queryParams.push(status);
    }

    // 員工篩選
    if (staff_id) {
      paramCount++;
      query += ` AND staff_id = $${paramCount}`;
      queryParams.push(parseInt(staff_id));
    }

    query += ` ORDER BY date DESC, check_in DESC`;

    // 分頁
    const offset = (parseInt(page) - 1) * parseInt(limit);
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    queryParams.push(parseInt(limit));
    
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    queryParams.push(offset);

    const result = await pool.query(query, queryParams);

    // 獲取總記錄數
    let countQuery = 'SELECT COUNT(*) FROM attendance WHERE 1=1';
    const countParams = [];
    let countParamIndex = 0;

    if (date) {
      countParamIndex++;
      countQuery += ` AND date = $${countParamIndex}`;
      countParams.push(date);
    }

    if (start_date) {
      countParamIndex++;
      countQuery += ` AND date >= $${countParamIndex}`;
      countParams.push(start_date);
    }

    if (end_date) {
      countParamIndex++;
      countQuery += ` AND date <= $${countParamIndex}`;
      countParams.push(end_date);
    }

    if (status) {
      countParamIndex++;
      countQuery += ` AND status = $${countParamIndex}`;
      countParams.push(status);
    }

    if (staff_id) {
      countParamIndex++;
      countQuery += ` AND staff_id = $${countParamIndex}`;
      countParams.push(parseInt(staff_id));
    }

    const countResult = await pool.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count);

    console.log(`✅ 成功獲取 ${result.rows.length} 條出勤記錄（共 ${totalCount} 條）`);

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
    res.status(500).json({
      success: false,
      message: '獲取出勤記錄失敗',
      error: error.message
    });
  }
};

// 員工打卡（上班/下班）
const markAttendance = async (req, res) => {
  try {
    const { staff_id, type, notes } = req.body;
    console.log(`📥 請求：員工 ${staff_id} 打卡`, { type, notes });

    // 驗證必填欄位
    if (!staff_id || !type) {
      return res.status(400).json({
        success: false,
        message: '員工 ID 和打卡類型為必填欄位'
      });
    }

    // 驗證打卡類型
    if (!['check_in', 'check_out'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: '打卡類型必須是 check_in 或 check_out'
      });
    }

    const currentTime = new Date();
    const currentDate = currentTime.toISOString().split('T')[0];
    const currentTimeStr = currentTime.toTimeString().split(' ')[0];

    if (type === 'check_in') {
      // 上班打卡
      // 檢查今天是否已經打過卡
      const existingRecord = await pool.query(`
        SELECT attendance_log FROM attendance 
        WHERE staff_id = $1 AND date = $2
      `, [parseInt(staff_id), currentDate]);

      if (existingRecord.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: '今天已經打過上班卡了'
        });
      }

      // 新增上班打卡記錄
      const result = await pool.query(`
        INSERT INTO attendance (staff_id, date, check_in, status)
        VALUES ($1, $2, $3, 'Present')
        RETURNING *
      `, [parseInt(staff_id), currentDate, currentTimeStr]);

      console.log(`✅ 員工 ${staff_id} 上班打卡成功`);

      res.status(201).json({
        success: true,
        message: `員工 ${staff_id} 上班打卡成功`,
        data: result.rows[0]
      });

    } else {
      // 下班打卡
      // 查找今天的上班記錄
      const todayRecord = await pool.query(`
        SELECT * FROM attendance 
        WHERE staff_id = $1 AND date = $2 AND check_in IS NOT NULL
      `, [parseInt(staff_id), currentDate]);

      if (todayRecord.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '找不到今天的上班記錄，請先打上班卡'
        });
      }

      const record = todayRecord.rows[0];
      if (record.check_out) {
        return res.status(409).json({
          success: false,
          message: '今天已經打過下班卡了'
        });
      }

      // 計算工作時數
      const checkIn = new Date(`${currentDate} ${record.check_in}`);
      const checkOut = new Date(`${currentDate} ${currentTimeStr}`);
      const diffMs = checkOut - checkIn;
      const totalHours = (diffMs / (1000 * 60 * 60)).toFixed(2);

      // 更新下班打卡記錄
      const result = await pool.query(`
        UPDATE attendance 
        SET check_out = $1, total_hours = $2
        WHERE attendance_log = $3
        RETURNING *
      `, [currentTimeStr, totalHours, record.attendance_log]);

      console.log(`✅ 員工 ${staff_id} 下班打卡成功，工作時數：${totalHours} 小時`);

      res.json({
        success: true,
        message: `員工 ${staff_id} 下班打卡成功，工作時數：${totalHours} 小時`,
        data: result.rows[0]
      });
    }
  } catch (error) {
    console.error('❌ 打卡錯誤:', error);
    res.status(500).json({
      success: false,
      message: '打卡失敗',
      error: error.message
    });
  }
};

// 獲取出勤報表
const getAttendanceReport = async (req, res) => {
  try {
    const { staff_id, start_date, end_date, month } = req.query;
    console.log('📥 請求：獲取出勤報表', { staff_id, start_date, end_date, month });

    let query = `
      SELECT 
        staff_id,
        COUNT(*) as total_days,
        SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) as present_days,
        SUM(CASE WHEN status = 'Absent' THEN 1 ELSE 0 END) as absent_days,
        SUM(CASE WHEN status = 'Late' THEN 1 ELSE 0 END) as late_days,
        SUM(CASE WHEN status = 'Sick Leave' THEN 1 ELSE 0 END) as sick_days,
        SUM(CASE WHEN status = 'Annual Leave' THEN 1 ELSE 0 END) as annual_leave_days,
        SUM(CASE WHEN status = 'Overtime' THEN 1 ELSE 0 END) as overtime_days,
        ROUND(AVG(total_hours), 2) as avg_hours,
        SUM(total_hours) as total_hours
      FROM attendance
      WHERE 1=1
    `;

    const queryParams = [];
    let paramCount = 0;

    // 員工篩選
    if (staff_id) {
      paramCount++;
      query += ` AND staff_id = $${paramCount}`;
      queryParams.push(parseInt(staff_id));
    }

    // 日期範圍篩選
    if (start_date && end_date) {
      paramCount++;
      query += ` AND date >= $${paramCount}`;
      queryParams.push(start_date);
      
      paramCount++;
      query += ` AND date <= $${paramCount}`;
      queryParams.push(end_date);
    } else if (month) {
      // 月份篩選（格式：YYYY-MM）
      const startOfMonth = `${month}-01`;
      const endOfMonth = new Date(month + '-01');
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);
      endOfMonth.setDate(0);
      const lastDay = endOfMonth.toISOString().split('T')[0];

      paramCount++;
      query += ` AND date >= $${paramCount}`;
      queryParams.push(startOfMonth);
      
      paramCount++;
      query += ` AND date <= $${paramCount}`;
      queryParams.push(lastDay);
    }

    query += ` GROUP BY staff_id ORDER BY staff_id`;

    const result = await pool.query(query, queryParams);

    console.log(`✅ 成功獲取 ${result.rows.length} 名員工的出勤報表`);

    res.json({
      success: true,
      message: `成功獲取出勤報表`,
      data: result.rows,
      count: result.rows.length,
      filters: { staff_id, start_date, end_date, month }
    });
  } catch (error) {
    console.error('❌ 獲取出勤報表錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取出勤報表失敗',
      error: error.message
    });
  }
};

// 更新出勤記錄
const updateAttendance = async (req, res) => {
  try {
    const { attendance_log } = req.params;
    const { check_in, check_out, status } = req.body;
    console.log(`📥 請求：更新出勤記錄 ${attendance_log}`);

    // 驗證出勤記錄是否存在
    const existingRecord = await pool.query(`
      SELECT * FROM attendance WHERE attendance_log = $1
    `, [parseInt(attendance_log)]);

    if (existingRecord.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '找不到該出勤記錄'
      });
    }

    const record = existingRecord.rows[0];

    // 計算新的工作時數（如果有上下班時間）
    let totalHours = record.total_hours;
    if (check_in && check_out) {
      const checkInTime = new Date(`${record.date} ${check_in}`);
      const checkOutTime = new Date(`${record.date} ${check_out}`);
      const diffMs = checkOutTime - checkInTime;
      totalHours = (diffMs / (1000 * 60 * 60)).toFixed(2);
    }

    // 更新出勤記錄
    const result = await pool.query(`
      UPDATE attendance 
      SET 
        check_in = COALESCE($1, check_in),
        check_out = COALESCE($2, check_out),
        total_hours = $3,
        status = COALESCE($4, status)
      WHERE attendance_log = $5
      RETURNING *
    `, [check_in, check_out, totalHours, status, parseInt(attendance_log)]);

    console.log(`✅ 成功更新出勤記錄 ${attendance_log}`);

    res.json({
      success: true,
      message: '出勤記錄更新成功',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('❌ 更新出勤記錄錯誤:', error);
    res.status(500).json({
      success: false,
      message: '更新出勤記錄失敗',
      error: error.message
    });
  }
};

// 刪除出勤記錄
const deleteAttendance = async (req, res) => {
  try {
    const { attendance_log } = req.params;
    console.log(`📥 請求：刪除出勤記錄 ${attendance_log}`);

    // 驗證出勤記錄是否存在
    const existingRecord = await pool.query(`
      SELECT * FROM attendance WHERE attendance_log = $1
    `, [parseInt(attendance_log)]);

    if (existingRecord.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '找不到該出勤記錄'
      });
    }

    const record = existingRecord.rows[0];

    // 刪除出勤記錄
    await pool.query('DELETE FROM attendance WHERE attendance_log = $1', [parseInt(attendance_log)]);

    console.log(`✅ 成功刪除出勤記錄 ${attendance_log}`);

    res.json({
      success: true,
      message: `成功刪除員工 ${record.staff_id} 在 ${record.date} 的出勤記錄`
    });
  } catch (error) {
    console.error('❌ 刪除出勤記錄錯誤:', error);
    res.status(500).json({
      success: false,
      message: '刪除出勤記錄失敗',
      error: error.message
    });
  }
};

module.exports = {
  getAttendanceByStaffId,
  getAllAttendance,
  markAttendance,
  getAttendanceReport,
  updateAttendance,
  deleteAttendance
};