// controllers/staffController.js - 完整版員工控制器（使用現有 User 模型）
const { pool } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

console.log('📋 載入員工控制器...');

// 獲取所有員工
const getAllStaff = async (req, res) => {
  try {
    console.log('📥 請求：獲取所有員工');
    
    const result = await pool.query(`
      SELECT 
        staff_id,
        name,
        nickname,
        gender,
        age,
        hire_date,
        email,
        address,
        phone_number,
        emer_phone,
        emer_name,
        position_id
      FROM staff
      ORDER BY staff_id
    `);
    
    console.log(`✅ 成功檢索 ${result.rows.length} 名員工`);
    
    res.json({
      success: true,
      message: `成功檢索 ${result.rows.length} 筆員工記錄`,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('❌ 獲取員工列表錯誤:', error);
    res.status(500).json({
      success: false,
      message: '無法檢索員工資料',
      error: error.message
    });
  }
};

// 根據 ID 獲取員工
const getStaffById = async (req, res) => {
  try {
    const { staff_id } = req.params;
    console.log(`📥 請求：獲取員工 ID ${staff_id}`);
    
    // 驗證 ID 格式
    if (!/^\d+$/.test(staff_id)) {
      return res.status(400).json({
        success: false,
        message: '員工 ID 必須是數字'
      });
    }
    
    const result = await pool.query(`
      SELECT 
        staff_id,
        name,
        nickname,
        gender,
        age,
        hire_date,
        email,
        address,
        phone_number,
        emer_phone,
        emer_name,
        position_id
      FROM staff 
      WHERE staff_id = $1
    `, [parseInt(staff_id.trim())]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `找不到員工 ID ${staff_id}`
      });
    }
    
    console.log(`✅ 找到員工 ID ${staff_id} 資料`);
    
    res.json({
      success: true,
      message: `成功檢索員工 ${staff_id} 資料`,
      data: result.rows[0],
      staff_id: staff_id.trim()
    });
  } catch (error) {
    console.error('❌ 獲取員工錯誤:', error);
    res.status(500).json({
      success: false,
      message: '無法檢索員工資料',
      error: error.message
    });
  }
};

// 根據姓名搜尋員工
const searchStaffByName = async (req, res) => {
  try {
    const { name } = req.query;
    console.log(`📥 請求：搜尋包含 "${name}" 的員工姓名`);
    
    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: '請提供搜尋姓名'
      });
    }
    
    const result = await pool.query(`
      SELECT 
        staff_id,
        name,
        nickname,
        gender,
        age,
        hire_date,
        email,
        address,
        phone_number,
        emer_phone,
        emer_name,
        position_id
      FROM staff 
      WHERE LOWER(name) LIKE LOWER($1) 
         OR LOWER(nickname) LIKE LOWER($1)
      ORDER BY staff_id
    `, [`%${name.trim()}%`]);
    
    console.log(`✅ 找到 ${result.rows.length} 名匹配的員工`);
    
    res.json({
      success: true,
      message: `找到 ${result.rows.length} 名員工`,
      data: result.rows,
      count: result.rows.length,
      searchTerm: name.trim()
    });
  } catch (error) {
    console.error('❌ 搜尋員工錯誤:', error);
    res.status(500).json({
      success: false,
      message: '員工搜尋失敗',
      error: error.message
    });
  }
};

// 新增員工
const createStaff = async (req, res) => {
  try {
    const {
      staff_id,
      name,
      nickname,
      gender,
      age,
      hire_date,
      email,
      address,
      phone_number,
      emer_phone,
      emer_name,
      position_id
    } = req.body;

    console.log('📥 請求：新增員工', { name, email });

    // 驗證必填欄位
    if (!name || !email || !phone_number || !age || !hire_date) {
      return res.status(400).json({
        success: false,
        message: '請填寫所有必填欄位：姓名、電子郵件、電話號碼、年齡、入職日期'
      });
    }

    // 驗證電子郵件格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: '無效的電子郵件格式'
      });
    }

    // 驗證年齡
    if (age < 1 || age > 120) {
      return res.status(400).json({
        success: false,
        message: '年齡必須在 1-120 之間'
      });
    }

    // 檢查電子郵件是否已存在
    const existingStaff = await pool.query('SELECT staff_id FROM staff WHERE email = $1', [email]);
    if (existingStaff.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: '此電子郵件地址已被使用'
      });
    }

    // 插入新員工到資料庫
    const result = await pool.query(`
    INSERT INTO staff (
      staff_id, name, nickname, gender, age, hire_date, email, address, 
      phone_number, emer_phone, emer_name, position_id
    ) 
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *
  `, [
    staff_id.trim(),
    name.trim(),
    nickname?.trim() || null,
    gender || 'male',
    parseInt(age),
    hire_date,
    email.trim(),
    address?.trim() || null,
    phone_number.trim(),
    emer_phone?.trim() || null,
    emer_name?.trim() || null,
    position_id?.trim() || null
  ]);

    console.log(`✅ 成功新增員工 ID ${result.rows[0].staff_id}`);

    res.status(201).json({
      success: true,
      message: '員工新增成功',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('❌ 新增員工錯誤:', error);
    res.status(500).json({
      success: false,
      message: '無法新增員工',
      error: error.message
    });
  }
};

// 更新員工
const updateStaff = async (req, res) => {
  try {
    const { staff_id } = req.params;
    const {
      name,
      nickname,
      gender,
      age,
      hire_date,
      email,
      address,
      phone_number,
      emer_phone,
      emer_name,
      position_id
    } = req.body;

    console.log(`📥 請求：更新員工 ID ${staff_id}`, { name, email });

    // 驗證 ID 格式
    if (!/^\d+$/.test(staff_id)) {
      return res.status(400).json({
        success: false,
        message: '員工 ID 必須是數字'
      });
    }

    // 驗證必填欄位
    if (!name || !email || !phone_number || !age || !hire_date) {
      return res.status(400).json({
        success: false,
        message: '請填寫所有必填欄位：姓名、電子郵件、電話號碼、年齡、入職日期'
      });
    }

    // 驗證電子郵件格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: '無效的電子郵件格式'
      });
    }

    // 驗證年齡
    if (age < 1 || age > 120) {
      return res.status(400).json({
        success: false,
        message: '年齡必須在 1-120 之間'
      });
    }

    // 檢查員工是否存在
    const existingStaff = await pool.query('SELECT staff_id FROM staff WHERE staff_id = $1', [parseInt(staff_id)]);
    if (existingStaff.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `找不到員工 ID ${staff_id}`
      });
    }

    // 檢查電子郵件是否被其他員工使用
    const emailCheck = await pool.query(
      'SELECT staff_id FROM staff WHERE email = $1 AND staff_id != $2', 
      [email, parseInt(staff_id)]
    );
    if (emailCheck.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: '此電子郵件地址已被其他員工使用'
      });
    }

    // 更新員工資料
    const result = await pool.query(`
      UPDATE staff SET 
        name = $1,
        nickname = $2,
        gender = $3,
        age = $4,
        hire_date = $5,
        email = $6,
        address = $7,
        phone_number = $8,
        emer_phone = $9,
        emer_name = $10,
        position_id = $11
      WHERE staff_id = $12
      RETURNING *
    `, [
      name.trim(),
      nickname?.trim() || null,
      gender || 'male',
      parseInt(age),
      hire_date,
      email.trim(),
      address?.trim() || null,
      phone_number.trim(),
      emer_phone?.trim() || null,
      emer_name?.trim() || null,
      position_id?.trim() || null,
      parseInt(staff_id)
    ]);

    console.log(`✅ 成功更新員工 ID ${staff_id}`);

    res.json({
      success: true,
      message: '員工資料更新成功',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('❌ 更新員工錯誤:', error);
    res.status(500).json({
      success: false,
      message: '無法更新員工資料',
      error: error.message
    });
  }
};

// 刪除員工
const deleteStaff = async (req, res) => {
  try {
    const { staff_id } = req.params;
    console.log(`📥 請求：刪除員工 ID ${staff_id}`);

    // 驗證 ID 格式
    if (!/^\d+$/.test(staff_id)) {
      return res.status(400).json({
        success: false,
        message: '員工 ID 必須是數字'
      });
    }

    // 檢查員工是否存在
    const existingStaff = await pool.query('SELECT name FROM staff WHERE staff_id = $1', [parseInt(staff_id)]);
    if (existingStaff.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `找不到員工 ID ${staff_id}`
      });
    }

    const staffName = existingStaff.rows[0].name;

    // 刪除員工
    await pool.query('DELETE FROM staff WHERE staff_id = $1', [parseInt(staff_id)]);

    console.log(`✅ 成功刪除員工 ID ${staff_id} (${staffName})`);

    res.json({
      success: true,
      message: `員工 ${staffName} (ID: ${staff_id}) 已成功刪除`
    });
  } catch (error) {
    console.error('❌ 刪除員工錯誤:', error);
    res.status(500).json({
      success: false,
      message: '無法刪除員工',
      error: error.message
    });
  }
};

// ============ 員工個人資料相關功能 (需要認證) ============

// 獲取登入員工的個人資料
const getStaffProfile = async (req, res) => {
  try {
    const staffId = req.staff.staffId; // 來自 authMiddleware
    console.log(`📥 請求：獲取員工個人資料 ID ${staffId}`);

    // 獲取完整的員工資料和職位資訊
    const staffQuery = `
      SELECT 
        s.staff_id,
        s.name,
        s.nickname,
        s.gender,
        s.age,
        s.hire_date,
        s.email,
        s.address,
        s.phone_number,
        s.emer_phone,
        s.emer_name,
        s.position_id,
        p.position_name,
        p.department,
        p.base_salary
      FROM staff s
      LEFT JOIN positions p ON s.position_id = p.position_id
      WHERE s.staff_id = $1
    `;

    const result = await pool.query(staffQuery, [staffId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '找不到員工個人資料'
      });
    }

    const staffProfile = result.rows[0];

    // 格式化回應資料
    const profileData = {
      staffId: staffProfile.staff_id,
      personalInfo: {
        name: staffProfile.name,
        nickname: staffProfile.nickname,
        gender: staffProfile.gender,
        age: staffProfile.age,
        email: staffProfile.email,
        phoneNumber: staffProfile.phone_number,
        address: staffProfile.address
      },
      workInfo: {
        hireDate: staffProfile.hire_date,
        positionId: staffProfile.position_id,
        positionName: staffProfile.position_name,
        department: staffProfile.department,
        baseSalary: staffProfile.base_salary
      },
      emergencyContact: {
        name: staffProfile.emer_name,
        phone: staffProfile.emer_phone
      }
    };

    console.log(`✅ 成功獲取員工資料: ${staffProfile.name}`);

    res.json({
      success: true,
      message: '員工個人資料檢索成功',
      data: profileData
    });

  } catch (error) {
    console.error('❌ 獲取員工個人資料錯誤:', error);
    res.status(500).json({
      success: false,
      message: '檢索個人資料時發生內部伺服器錯誤'
    });
  }
};

// 更新員工個人資料 (限制可編輯欄位)
const updateStaffProfile = async (req, res) => {
  try {
    const staffId = req.staff.staffId; // 來自 authMiddleware
    const { 
      nickname, 
      phoneNumber, 
      address, 
      emergencyContactName, 
      emergencyContactPhone 
    } = req.body;

    console.log(`📥 請求：更新員工個人資料 ID ${staffId}`);

    // 驗證輸入
    if (!nickname && !phoneNumber && !address && !emergencyContactName && !emergencyContactPhone) {
      return res.status(400).json({
        success: false,
        message: '至少需要提供一個欄位進行更新'
      });
    }

    // 建立動態更新查詢
    const updateFields = [];
    const values = [];
    let paramCounter = 1;

    if (nickname !== undefined) {
      updateFields.push(`nickname = $${paramCounter++}`);
      values.push(nickname);
    }
    if (phoneNumber !== undefined) {
      updateFields.push(`phone_number = $${paramCounter++}`);
      values.push(phoneNumber);
    }
    if (address !== undefined) {
      updateFields.push(`address = $${paramCounter++}`);
      values.push(address);
    }
    if (emergencyContactName !== undefined) {
      updateFields.push(`emer_name = $${paramCounter++}`);
      values.push(emergencyContactName);
    }
    if (emergencyContactPhone !== undefined) {
      updateFields.push(`emer_phone = $${paramCounter++}`);
      values.push(emergencyContactPhone);
    }

    values.push(staffId); // 添加 staff_id 用於 WHERE 條件

    const updateQuery = `
      UPDATE staff 
      SET ${updateFields.join(', ')}
      WHERE staff_id = $${paramCounter}
      RETURNING staff_id, nickname, phone_number, address, emer_name, emer_phone
    `;

    const result = await pool.query(updateQuery, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '找不到員工或未進行任何變更'
      });
    }

    console.log(`✅ 成功更新員工個人資料 ID ${staffId}`);

    res.json({
      success: true,
      message: '個人資料更新成功',
      data: {
        staffId: result.rows[0].staff_id,
        updatedFields: {
          nickname: result.rows[0].nickname,
          phoneNumber: result.rows[0].phone_number,
          address: result.rows[0].address,
          emergencyContactName: result.rows[0].emer_name,
          emergencyContactPhone: result.rows[0].emer_phone
        }
      }
    });

  } catch (error) {
    console.error('❌ 更新員工個人資料錯誤:', error);
    res.status(500).json({
      success: false,
      message: '更新個人資料時發生內部伺服器錯誤'
    });
  }
};

// 獲取工作統計摘要
const getWorkSummary = async (req, res) => {
  try {
    const staffId = req.staff.staffId; // 來自 authMiddleware
    console.log(`📥 請求：獲取工作統計摘要 ID ${staffId}`);

    // 獲取工作統計摘要
    const summaryQuery = `
      SELECT 
        COUNT(*) as total_work_days,
        COALESCE(SUM(total_hours), 0) as total_hours_worked,
        COALESCE(AVG(total_hours), 0) as average_daily_hours
      FROM attendance 
      WHERE staff_id = $1 
      AND status = 'present'
      AND date >= DATE_TRUNC('month', CURRENT_DATE)
    `;

    const summaryResult = await pool.query(summaryQuery, [staffId]);
    
    // 獲取入職日期來計算服務年限
    const hireQuery = `SELECT hire_date FROM staff WHERE staff_id = $1`;
    const hireResult = await pool.query(hireQuery, [staffId]);

    let yearsOfService = 0;
    if (hireResult.rows.length > 0) {
      const hireDate = new Date(hireResult.rows[0].hire_date);
      const currentDate = new Date();
      yearsOfService = Math.floor((currentDate - hireDate) / (365.25 * 24 * 60 * 60 * 1000));
    }

    const workSummary = {
      currentMonth: {
        totalWorkDays: parseInt(summaryResult.rows[0].total_work_days),
        totalHours: parseFloat(summaryResult.rows[0].total_hours_worked).toFixed(2),
        averageDailyHours: parseFloat(summaryResult.rows[0].average_daily_hours).toFixed(2)
      },
      tenure: {
        yearsOfService: yearsOfService
      }
    };

    console.log(`✅ 成功獲取工作統計摘要 ID ${staffId}`);

    res.json({
      success: true,
      message: '工作統計摘要檢索成功',
      data: workSummary
    });

  } catch (error) {
    console.error('❌ 獲取工作統計摘要錯誤:', error);
    res.status(500).json({
      success: false,
      message: '檢索工作統計摘要時發生內部伺服器錯誤'
    });
  }
};

module.exports = {
  getAllStaff,
  getStaffById,
  searchStaffByName,
  createStaff,
  updateStaff,
  deleteStaff,
  getStaffProfile,
  updateStaffProfile,
  getWorkSummary
};