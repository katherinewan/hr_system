-- 簡化版 HRNet 資料庫補充
-- 只包含最必要的修正和新增

SET SEARCH_PATH to "hrnet_database", PUBLIC;

-- ===== 1. 修正 leave_type 約束問題 =====
ALTER TABLE leave_requests DROP CONSTRAINT IF EXISTS leave_requests_leave_type_check;

-- 更新現有數據
UPDATE leave_requests 
SET leave_type = CASE leave_type
    WHEN 'sick_leave' THEN 'Sick Leave'
    WHEN 'annual_leave' THEN 'Annual Leave'
    WHEN 'casual_leave' THEN 'Casual Leave'
    WHEN 'maternity_leave' THEN 'Maternity Leave'
    WHEN 'paternity_leave' THEN 'Paternity Leave'
    WHEN 'emergency_leave' THEN 'Emergency Leave'
    ELSE leave_type
END;

-- 添加新約束
ALTER TABLE leave_requests 
ADD CONSTRAINT leave_requests_leave_type_check 
CHECK (leave_type IN ('Sick Leave', 'Annual Leave', 'Casual Leave', 'Maternity Leave', 'Paternity Leave', 'Emergency Leave'));

-- ===== 2. 為自動登出功能添加必要的表 =====

-- 登入歷史表（簡化版）
CREATE TABLE IF NOT EXISTS login_history (
    login_id SERIAL PRIMARY KEY,
    staff_id INTEGER NOT NULL,
    session_id VARCHAR(64) UNIQUE NOT NULL,
    login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    logout_time TIMESTAMP NULL,
    ip_address INET,
    FOREIGN KEY (staff_id) REFERENCES staff(staff_id) ON DELETE CASCADE
);

-- 活躍 session 表（簡化版）
CREATE TABLE IF NOT EXISTS active_sessions (
    session_id VARCHAR(64) PRIMARY KEY,
    staff_id INTEGER NOT NULL,
    login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    FOREIGN KEY (staff_id) REFERENCES staff(staff_id) ON DELETE CASCADE
);

-- ===== 3. 公司假期表 =====
CREATE TABLE IF NOT EXISTS company_holidays (
    holiday_id SERIAL PRIMARY KEY,
    holiday_name VARCHAR(100) NOT NULL,
    holiday_date DATE NOT NULL,
    holiday_type VARCHAR(50) DEFAULT 'Public Holiday',
    is_recurring BOOLEAN DEFAULT FALSE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(holiday_date, holiday_name)
);

-- ===== 4. 為 staff 表添加認證欄位 =====
ALTER TABLE staff ADD COLUMN IF NOT EXISTS password VARCHAR(255);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive'));

-- ===== 5. 創建基本索引 =====
CREATE INDEX IF NOT EXISTS idx_login_history_staff_id ON login_history(staff_id);
CREATE INDEX IF NOT EXISTS idx_active_sessions_staff_id ON active_sessions(staff_id);
CREATE INDEX IF NOT EXISTS idx_company_holidays_date ON company_holidays(holiday_date);

-- ===== 6. 清理過期 session 的函數 =====
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM active_sessions 
    WHERE expires_at < CURRENT_TIMESTAMP;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- 更新登入歷史
    UPDATE login_history 
    SET logout_time = CURRENT_TIMESTAMP
    WHERE session_id NOT IN (SELECT session_id FROM active_sessions)
      AND logout_time IS NULL;
    
    RETURN deleted_count;
END;
$ LANGUAGE plpgsql;

-- ===== 7. 計算工作日函數（排除公司假期） =====
CREATE OR REPLACE FUNCTION calculate_working_days_excluding_holidays(start_date DATE, end_date DATE)
RETURNS INTEGER AS $
DECLARE
    total_days INTEGER;
    weekend_days INTEGER;
    holiday_days INTEGER;
BEGIN
    -- 計算總天數
    total_days := (end_date - start_date) + 1;
    
    -- 計算週末天數
    weekend_days := (
        SELECT COUNT(*)
        FROM generate_series(start_date, end_date, '1 day'::interval) AS day_series
        WHERE EXTRACT(DOW FROM day_series) IN (0, 6)
    );
    
    -- 計算假期天數（排除週末）
    holiday_days := (
        SELECT COUNT(*)
        FROM company_holidays ch
        WHERE ch.holiday_date BETWEEN start_date AND end_date
          AND EXTRACT(DOW FROM ch.holiday_date) NOT IN (0, 6)
    );
    
    -- 返回工作日（排除週末和假期）
    RETURN total_days - weekend_days - holiday_days;
END;
$ LANGUAGE plpgsql;

-- ===== 8. 修正核心假期函數 =====
CREATE OR REPLACE FUNCTION process_leave_request(
    p_request_id INTEGER,
    p_approver_id INTEGER,
    p_action VARCHAR(20),
    p_comments TEXT DEFAULT NULL
) RETURNS TABLE(
    success BOOLEAN,
    message TEXT
) AS $
DECLARE
    request_record RECORD;
    leave_year INTEGER;
BEGIN
    SELECT * INTO request_record FROM leave_requests WHERE request_id = p_request_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'Leave request not found';
        RETURN;
    END IF;
    
    IF request_record.status != 'Pending' THEN
        RETURN QUERY SELECT FALSE, 'Request already processed';
        RETURN;
    END IF;
    
    leave_year := EXTRACT(YEAR FROM request_record.start_date);
    
    -- 更新申請狀態
    UPDATE leave_requests 
    SET 
        status = p_action,
        approved_by = p_approver_id,
        approved_on = CURRENT_TIMESTAMP,
        rejection_reason = CASE WHEN p_action = 'Rejected' THEN p_comments ELSE NULL END,
        updated_at = CURRENT_TIMESTAMP
    WHERE request_id = p_request_id;
    
    -- 如果批准，扣除假期配額
    IF p_action = 'Approved' THEN
        CASE request_record.leave_type
            WHEN 'Sick Leave' THEN
                UPDATE leave SET sl_used = sl_used + request_record.total_days
                WHERE staff_id = request_record.staff_id AND leave_year = leave_year;
            WHEN 'Annual Leave' THEN
                UPDATE leave SET al_used = al_used + request_record.total_days
                WHERE staff_id = request_record.staff_id AND leave_year = leave_year;
            WHEN 'Casual Leave' THEN
                UPDATE leave SET cl_used = cl_used + request_record.total_days
                WHERE staff_id = request_record.staff_id AND leave_year = leave_year;
            WHEN 'Maternity Leave' THEN
                UPDATE leave SET ml_used = ml_used + request_record.total_days
                WHERE staff_id = request_record.staff_id AND leave_year = leave_year;
            WHEN 'Paternity Leave' THEN
                UPDATE leave SET pl_used = pl_used + request_record.total_days
                WHERE staff_id = request_record.staff_id AND leave_year = leave_year;
        END CASE;
    END IF;
    
    -- 記錄歷史
    INSERT INTO leave_request_history (request_id, action, performed_by, old_status, new_status, comments)
    VALUES (p_request_id, LOWER(p_action), p_approver_id, 'Pending', p_action, p_comments);
    
    RETURN QUERY SELECT TRUE, 'Leave request ' || LOWER(p_action) || ' successfully';
END;
$ LANGUAGE plpgsql;

-- ===== 9. 插入一些基本的公司假期 =====
INSERT INTO company_holidays (holiday_name, holiday_date, holiday_type, is_recurring, description) VALUES
('New Year''s Day', '2025-01-01', 'Public Holiday', TRUE, 'New Year celebration'),
('Chinese New Year', '2025-01-29', 'Public Holiday', FALSE, 'Chinese New Year 2025'),
('Good Friday', '2025-04-18', 'Public Holiday', FALSE, 'Good Friday 2025'),
('Labour Day', '2025-05-01', 'Public Holiday', TRUE, 'International Workers'' Day'),
('Christmas Day', '2025-12-25', 'Public Holiday', TRUE, 'Christmas celebration')
ON CONFLICT (holiday_date, holiday_name) DO NOTHING;