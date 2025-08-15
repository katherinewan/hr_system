-- -- Create schema
CREATE SCHEMA IF NOT EXISTS "hrnet_database";
SET SEARCH_PATH to "hrnet_database", PUBLIC;

-- create department table
CREATE TABLE department (
	department_id INTEGER PRIMARY KEY,
	department_name VARCHAR(100) NOT NULL,
	department_head VARCHAR(100) NOT NULL
);

-- create position table
CREATE TABLE position (
	position_id INTEGER PRIMARY KEY,
	title VARCHAR(100) NOT NULL,
	level VARCHAR(100) NOT NULL,
	department_id INTEGER NOT NULL,
	FOREIGN KEY (department_id) REFERENCES department(department_id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- create staff table
CREATE TABLE staff (
    staff_id INTEGER PRIMARY KEY CHECK (staff_id >= 100001 AND staff_id <= 999999),
    name VARCHAR(100) NOT NULL,
    nickname VARCHAR(50),
    gender CHAR(10) NOT NULL CHECK (gender IN ('male', 'female')),
    age INTEGER NOT NULL CHECK (age >= 18 AND age <= 70), -- Extended retirement age
    hire_date DATE NOT NULL CHECK (hire_date <= CURRENT_DATE),
    email VARCHAR(100) UNIQUE NOT NULL,
    address TEXT NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    emer_phone VARCHAR(20),
    emer_name VARCHAR(100),
	position_id INTEGER,
    FOREIGN KEY (position_id) REFERENCES position(position_id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- create attendance table
CREATE TABLE attendance (
    attendance_log VARCHAR(100) PRIMARY KEY,
    staff_id INTEGER NOT NULL,
    date DATE NOT NULL,
    check_in TIME,
    check_out TIME,
    total_hours NUMERIC(4,2),
    status VARCHAR(100) NOT NULL DEFAULT 'Present',
    FOREIGN KEY (staff_id) REFERENCES staff(staff_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT unique_staff_date UNIQUE (staff_id, date)
);

-- status will be show 'absent' when there are no any attendance
-- status will be show 'late' when the check_in is later than 9:00 am
-- status will be show 'early leave' when the check_out is earlier than 17:30 pm

-- create user account table
CREATE TABLE user_accounts (
    user_id INTEGER PRIMARY KEY,
    staff_id INTEGER NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('Admin', 'HR', 'Manager', 'Employee')),
    last_login TIMESTAMP,
    password_reset_expires TIMESTAMP,
    failed_login_attempts INTEGER DEFAULT 0,
    account_locked BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (staff_id) REFERENCES staff(staff_id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create leave table - FIXED: Removed UNIQUE constraint from staff_id
CREATE TABLE leave (
    leave_id INTEGER PRIMARY KEY,
    staff_id INTEGER NOT NULL, -- REMOVED UNIQUE constraint
    -- Leave eligibility flags
    sick_leave_enabled BOOLEAN DEFAULT FALSE,
    annual_leave_enabled BOOLEAN DEFAULT FALSE,
    casual_leave_enabled BOOLEAN DEFAULT TRUE,
    maternity_leave_enabled BOOLEAN DEFAULT FALSE,
    paternity_leave_enabled BOOLEAN DEFAULT FALSE,
    -- Leave quotas (available days) - FIXED: More realistic quotas
    sl_quota INTEGER DEFAULT 0, -- 12 sick leave days per year
    al_quota INTEGER DEFAULT 0, -- 21 annual leave days per year  
    cl_quota INTEGER DEFAULT 0,  -- 7 casual leave days per year
    ml_quota INTEGER DEFAULT 0, -- 90 maternity leave days
    pl_quota INTEGER DEFAULT 0, -- 14 paternity leave days
    -- Leave used counters
    sl_used INTEGER DEFAULT 0,
    al_used INTEGER DEFAULT 0,
    cl_used INTEGER DEFAULT 0,
    ml_used INTEGER DEFAULT 0,
    pl_used INTEGER DEFAULT 0,
    -- ADDED: Leave year tracking
    leave_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
    -- Tracking fields
    last_quota_update DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (staff_id) REFERENCES staff(staff_id) ON DELETE CASCADE ON UPDATE CASCADE,
    -- ADDED: Unique constraint for staff_id and leave_year combination
    CONSTRAINT unique_staff_leave_year UNIQUE (staff_id, leave_year)
);

-- Create leave requests table for handling leave applications
CREATE TABLE leave_requests (
    request_id SERIAL PRIMARY KEY,
    staff_id INTEGER NOT NULL,
    leave_type VARCHAR(50) NOT NULL CHECK (leave_type IN ('sick_leave', 'annual_leave', 'casual_leave', 'maternity_leave', 'paternity_leave')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days INTEGER NOT NULL CHECK (total_days > 0),
    reason TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Cancelled')),
    applied_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_by INTEGER,
    approved_on TIMESTAMP,
    rejection_reason TEXT,
    emergency_contact VARCHAR(100),
    medical_certificate BOOLEAN DEFAULT FALSE,
    -- Audit fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (staff_id) REFERENCES staff(staff_id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES staff(staff_id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

-- Create leave request history table for audit trail
CREATE TABLE leave_request_history (
    history_id SERIAL PRIMARY KEY,
    request_id INTEGER NOT NULL,
    action VARCHAR(50) NOT NULL,
    performed_by INTEGER NOT NULL,
    action_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    old_status VARCHAR(20),
    new_status VARCHAR(20),
    comments TEXT,
    FOREIGN KEY (request_id) REFERENCES leave_requests(request_id) ON DELETE CASCADE,
    FOREIGN KEY (performed_by) REFERENCES staff(staff_id) ON DELETE CASCADE
);

-- create salary table
CREATE TABLE salary (
    salary_id INTEGER PRIMARY KEY, 
    staff_id INTEGER NOT NULL UNIQUE, 
    position_id INTEGER NOT NULL, 
    basic_salary DECIMAL(10,2) NOT NULL, 
    al_allowance DECIMAL(8,2) DEFAULT 0.00, 
    sl_allowance DECIMAL(8,2) DEFAULT 0.00, 
	ml_allowance DECIMAL(8,2) DEFAULT 0.00,
	pl_allowance DECIMAL(8,2) DEFAULT 0.00,
    cl_deduction DECIMAL(8,2) DEFAULT 0.00, 
    FOREIGN KEY (staff_id) REFERENCES staff(staff_id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (position_id) REFERENCES position(position_id) ON DELETE RESTRICT ON UPDATE CASCADE
);

-- create payroll table
CREATE TABLE payroll (
    payroll_id INTEGER PRIMARY KEY, 
    staff_id INTEGER NOT NULL, 
    month DATE NOT NULL, 
    total_salary DECIMAL(10,2) NOT NULL, 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
    FOREIGN KEY (staff_id) REFERENCES staff(staff_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT unique_staff_month UNIQUE (staff_id, month)
);

-- Create indexes for better performance
CREATE INDEX idx_staff_email ON staff(email);
CREATE INDEX idx_staff_hire_date ON staff(hire_date);
CREATE INDEX idx_attendance_staff_date ON attendance(staff_id, date);
CREATE INDEX idx_payroll_staff_month ON payroll(staff_id, month);
CREATE INDEX idx_leave_requests_staff ON leave_requests(staff_id);
CREATE INDEX idx_leave_requests_status ON leave_requests(status);
CREATE INDEX idx_leave_requests_dates ON leave_requests(start_date, end_date);
CREATE INDEX idx_leave_staff_year ON leave(staff_id, leave_year); -- ADDED

-- Keep
-- Create view for staff with calculated seniority
CREATE VIEW staff_with_seniority AS
SELECT 
    staff_id,
    name,
    nickname,
    gender,
    age,
    hire_date,
    -- Calculate seniority in years (with decimal precision)
    ROUND(
      EXTRACT(EPOCH FROM (CURRENT_DATE - hire_date)) / (365.25 * 24 * 60 * 60), 2
    ) AS seniority_years,
    -- Calculate seniority in days
    (CURRENT_DATE - hire_date) AS seniority_days,
    -- Calculate seniority in months
    EXTRACT(YEAR FROM AGE(CURRENT_DATE, hire_date)) * 12 + 
    EXTRACT(MONTH FROM AGE(CURRENT_DATE, hire_date)) AS seniority_months,
    email,
    address,
    phone_number,
    emer_phone,
    emer_name,
    position_id
FROM staff;

-- what is this for?
-- Create function to calculate working days between two dates (excluding weekends)
CREATE OR REPLACE FUNCTION calculate_working_days(start_date DATE, end_date DATE)
RETURNS INTEGER AS $$
DECLARE
    total_days INTEGER;
    weekend_days INTEGER;
BEGIN
    -- Calculate total days including start and end date
    total_days := (end_date - start_date) + 1;
    
    -- Calculate weekend days in the range
    weekend_days := (
        SELECT COUNT(*)
        FROM generate_series(start_date, end_date, '1 day'::interval) AS day_series
        WHERE EXTRACT(DOW FROM day_series) IN (0, 6) -- Sunday = 0, Saturday = 6
    );
    
    -- Return working days (excluding weekends)
    RETURN total_days - weekend_days;
END;
$$ LANGUAGE plpgsql;

-- FIXED: Function to check leave eligibility with proper year handling
CREATE OR REPLACE FUNCTION check_leave_eligibility(
    p_staff_id INTEGER,
    p_leave_type VARCHAR(50),
    p_requested_days INTEGER,
    p_leave_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)
) RETURNS TABLE(
    eligible BOOLEAN,
    available_quota INTEGER,
    message TEXT
) AS $$
DECLARE
    leave_record RECORD;
    is_eligible BOOLEAN := FALSE;
    quota_available INTEGER := 0;
    response_message TEXT;
BEGIN
    -- Get leave information for the staff and year
    SELECT * INTO leave_record 
    FROM leave 
    WHERE staff_id = p_staff_id AND leave_year = p_leave_year;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 0, 'Leave record not found for staff in specified year';
        RETURN;
    END IF;
    
    -- Check eligibility based on leave type
    CASE p_leave_type
        WHEN 'sick_leave' THEN
            is_eligible := leave_record.sick_leave_enabled;
            quota_available := leave_record.sl_quota - leave_record.sl_used;
            
        WHEN 'annual_leave' THEN
            is_eligible := leave_record.annual_leave_enabled;
            quota_available := leave_record.al_quota - leave_record.al_used;
            
        WHEN 'casual_leave' THEN
            is_eligible := leave_record.casual_leave_enabled;
            quota_available := leave_record.cl_quota - leave_record.cl_used;
            
        WHEN 'maternity_leave' THEN
            is_eligible := leave_record.maternity_leave_enabled;
            quota_available := leave_record.ml_quota - leave_record.ml_used;
            
        WHEN 'paternity_leave' THEN
            is_eligible := leave_record.paternity_leave_enabled;
            quota_available := leave_record.pl_quota - leave_record.pl_used;
            
        WHEN 'emergency_leave' THEN
            is_eligible := TRUE;
            quota_available := 999; -- No quota limit for emergency
            
        ELSE
            RETURN QUERY SELECT FALSE, 0, 'Invalid leave type';
            RETURN;
    END CASE;
    
    -- Determine response message
    IF NOT is_eligible THEN
        response_message := 'Not eligible for ' || p_leave_type;
    ELSIF quota_available < p_requested_days THEN
        response_message := 'Insufficient quota. Available: ' || quota_available || ', Requested: ' || p_requested_days;
    ELSE
        response_message := 'Eligible for leave request';
    END IF;
    
    RETURN QUERY SELECT 
        is_eligible AND (quota_available >= p_requested_days OR p_leave_type = 'emergency_leave'),
        quota_available,
        response_message;
END;
$$ LANGUAGE plpgsql;

-- FIXED: Function to submit leave request with proper year handling
CREATE OR REPLACE FUNCTION submit_leave_request(
    p_staff_id INTEGER,
    p_leave_type VARCHAR(50),
    p_start_date DATE,
    p_end_date DATE,
    p_reason TEXT,
    p_emergency_contact VARCHAR(100) DEFAULT NULL,
    p_medical_certificate BOOLEAN DEFAULT FALSE
) RETURNS TABLE(
    success BOOLEAN,
    request_id INTEGER,
    message TEXT
) AS $$
DECLARE
    working_days INTEGER;
    eligibility_check RECORD;
    new_request_id INTEGER;
    leave_year INTEGER;
BEGIN
    -- Get the leave year from start date
    leave_year := EXTRACT(YEAR FROM p_start_date);
    
    -- Validate dates - FIXED: Allow future dates but not too far
    IF p_start_date < CURRENT_DATE - INTERVAL '7 days' THEN
        RETURN QUERY SELECT FALSE, NULL::INTEGER, 'Cannot apply for leave more than 7 days in the past';
        RETURN;
    END IF;
    
    IF p_end_date < p_start_date THEN
        RETURN QUERY SELECT FALSE, NULL::INTEGER, 'End date cannot be before start date';
        RETURN;
    END IF;
    
    -- Calculate working days
    working_days := calculate_working_days(p_start_date, p_end_date);
    
    -- Check leave eligibility
    SELECT * INTO eligibility_check 
    FROM check_leave_eligibility(p_staff_id, p_leave_type, working_days, leave_year);
    
    IF NOT eligibility_check.eligible THEN
        RETURN QUERY SELECT FALSE, NULL::INTEGER, eligibility_check.message;
        RETURN;
    END IF;
    
    -- Check for overlapping leave requests
    IF EXISTS (
        SELECT 1 FROM leave_requests 
        WHERE staff_id = p_staff_id 
        AND status IN ('Pending', 'Approved')
        AND (
            (p_start_date BETWEEN start_date AND end_date) OR
            (p_end_date BETWEEN start_date AND end_date) OR
            (start_date BETWEEN p_start_date AND p_end_date)
        )
    ) THEN
        RETURN QUERY SELECT FALSE, NULL::INTEGER, 'Overlapping leave request exists';
        RETURN;
    END IF;
    
    -- Submit the leave request
    INSERT INTO leave_requests (
        staff_id, leave_type, start_date, end_date, total_days, reason, 
        emergency_contact, medical_certificate
    ) VALUES (
        p_staff_id, p_leave_type, p_start_date, p_end_date, working_days, p_reason,
        p_emergency_contact, p_medical_certificate
    ) RETURNING leave_requests.request_id INTO new_request_id;
    
    -- Log the action
    INSERT INTO leave_request_history (request_id, action, performed_by, new_status, comments)
    VALUES (new_request_id, 'created', p_staff_id, 'Pending', 'Leave request submitted');
    
    RETURN QUERY SELECT TRUE, new_request_id, 'Leave request submitted successfully. Request ID: ' || new_request_id;
END;
$$ LANGUAGE plpgsql;

-- FIXED: Function to approve/reject leave request with proper year handling
CREATE OR REPLACE FUNCTION process_leave_request(
    p_request_id INTEGER,
    p_approver_id INTEGER,
    p_action VARCHAR(20), -- 'Approved' or 'Rejected'
    p_comments TEXT DEFAULT NULL
) RETURNS TABLE(
    success BOOLEAN,
    message TEXT
) AS $$
DECLARE
    request_record RECORD;
    leave_year INTEGER;
BEGIN
    -- Get the leave request
    SELECT * INTO request_record FROM leave_requests WHERE request_id = p_request_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'Leave request not found';
        RETURN;
    END IF;
    
    IF request_record.status != 'Pending' THEN
        RETURN QUERY SELECT FALSE, 'Request already processed';
        RETURN;
    END IF;
    
    -- Get leave year from request start date
    leave_year := EXTRACT(YEAR FROM request_record.start_date);
    
    -- Update the request status
    UPDATE leave_requests 
    SET 
        status = p_action,
        approved_by = p_approver_id,
        approved_on = CURRENT_TIMESTAMP,
        rejection_reason = CASE WHEN p_action = 'Rejected' THEN p_comments ELSE NULL END,
        updated_at = CURRENT_TIMESTAMP
    WHERE request_id = p_request_id;
    
    -- If approved, deduct from leave quota for the correct year
    IF p_action = 'Approved' THEN
        CASE request_record.leave_type
            WHEN 'sick_leave' THEN
                UPDATE leave SET 
                    sl_used = sl_used + request_record.total_days,
                    updated_at = CURRENT_TIMESTAMP
                WHERE staff_id = request_record.staff_id AND leave_year = leave_year;
            WHEN 'annual_leave' THEN
                UPDATE leave SET 
                    al_used = al_used + request_record.total_days,
                    updated_at = CURRENT_TIMESTAMP
                WHERE staff_id = request_record.staff_id AND leave_year = leave_year;
            WHEN 'casual_leave' THEN
                UPDATE leave SET 
                    cl_used = cl_used + request_record.total_days,
                    updated_at = CURRENT_TIMESTAMP
                WHERE staff_id = request_record.staff_id AND leave_year = leave_year;
            WHEN 'maternity_leave' THEN
                UPDATE leave SET 
                    ml_used = ml_used + request_record.total_days,
                    updated_at = CURRENT_TIMESTAMP
                WHERE staff_id = request_record.staff_id AND leave_year = leave_year;
            WHEN 'paternity_leave' THEN
                UPDATE leave SET 
                    pl_used = pl_used + request_record.total_days,
                    updated_at = CURRENT_TIMESTAMP
                WHERE staff_id = request_record.staff_id AND leave_year = leave_year;
            -- Emergency leave doesn't deduct from quota
        END CASE;
    END IF;
    
    -- Log the action
    INSERT INTO leave_request_history (request_id, action, performed_by, old_status, new_status, comments)
    VALUES (p_request_id, LOWER(p_action), p_approver_id, 'Pending', p_action, p_comments);
    
    RETURN QUERY SELECT TRUE, 'Leave request ' || LOWER(p_action) || ' successfully';
END;
$$ LANGUAGE plpgsql;

-- Create function to cancel leave request (by staff member)
CREATE OR REPLACE FUNCTION cancel_leave_request(
    p_request_id INTEGER,
    p_staff_id INTEGER,
    p_reason TEXT DEFAULT 'Cancelled by staff'
) RETURNS TABLE(
    success BOOLEAN,
    message TEXT
) AS $$
DECLARE
    request_record RECORD;
BEGIN
    -- Get the leave request
    SELECT * INTO request_record FROM leave_requests WHERE request_id = p_request_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'Leave request not found';
        RETURN;
    END IF;
    
    -- Check if staff owns this request
    IF request_record.staff_id != p_staff_id THEN
        RETURN QUERY SELECT FALSE, 'Unauthorized: You can only cancel your own requests';
        RETURN;
    END IF;
    
    -- Can only cancel pending requests
    IF request_record.status != 'Pending' THEN
        RETURN QUERY SELECT FALSE, 'Can only cancel pending requests';
        RETURN;
    END IF;
    
    -- Update the request status
    UPDATE leave_requests 
    SET 
        status = 'Cancelled',
        rejection_reason = p_reason,
        updated_at = CURRENT_TIMESTAMP
    WHERE request_id = p_request_id;
    
    -- Log the action
    INSERT INTO leave_request_history (request_id, action, performed_by, old_status, new_status, comments)
    VALUES (p_request_id, 'cancelled', p_staff_id, 'Pending', 'Cancelled', p_reason);
    
    RETURN QUERY SELECT TRUE, 'Leave request cancelled successfully';
END;
$$ LANGUAGE plpgsql;

-- Update leave eligibility to true
CREATE OR REPLACE FUNCTION update_leave_eligibility()
RETURNS TRIGGER AS $$
DECLARE
	weeks_employed INTEGER;
    months_employed INTEGER;
    years_employed INTEGER;
BEGIN
	-- Calculate weeks employed
	weeks_employed := FLOOR(EXTRACT(EPOCH FROM AGE(CURRENT_DATE, 
    (SELECT hire_date FROM staff WHERE staff_id = NEW.staff_id))) / (60 * 60 * 24 * 7));

    -- Calculate months employed
    months_employed := EXTRACT(YEAR FROM AGE(CURRENT_DATE, 
        (SELECT hire_date FROM staff WHERE staff_id = NEW.staff_id))) * 12 + 
        EXTRACT(MONTH FROM AGE(CURRENT_DATE, 
        (SELECT hire_date FROM staff WHERE staff_id = NEW.staff_id)));
    
    -- Calculate years employed
    years_employed := EXTRACT(YEAR FROM AGE(CURRENT_DATE, 
        (SELECT hire_date FROM staff WHERE staff_id = NEW.staff_id)));
    
    -- Enable sick leave and add quota if employed for at least 1 month
    IF months_employed >= 1 THEN
        NEW.sick_leave_enabled := TRUE;
        -- Add 2 sick leave days for each completed month
        NEW.sl_quota := months_employed * 2;
    END IF;
    
    -- Enable annual leave if employed for at least 6 months
    IF months_employed >= 12 THEN
        NEW.annual_leave_enabled := TRUE;
    END IF;
    
    -- Enable maternity/paternity leave if employed for at least 12 months
    IF weeks_employed >= 40 THEN
        NEW.maternity_leave_enabled := TRUE;
        NEW.paternity_leave_enabled := TRUE;
    END IF;
    
    -- Update the last quota update date
    NEW.last_quota_update := CURRENT_DATE;
    NEW.updated_at := CURRENT_TIMESTAMP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- add leaves

-- Calculate average salary
CREATE OR REPLACE FUNCTION calculate_average_salary (

)

-- Calculate 4/5 salary for (SL,ML)
-- Deducation for casual leave