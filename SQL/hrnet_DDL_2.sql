SET SEARCH_PATH to "hrnet_database", PUBLIC;

-- Insert sample data for department table
INSERT INTO department (department_id, department_name, department_head) VALUES
(1, 'Human Resources', 'Wong Mei Ling'),
(2, 'Information Technology', 'Chan Wai Kit'),
(3, 'Marketing', 'Lau Ka Yi'),
(4, 'Finance', 'Lee Chun Ho'),
(5, 'Operations', 'Tang Siu Ming'),
(6, 'Sales', 'Ng Wing Fai'),
(7, 'Customer Service', 'Leung Hoi Yan');

-- Insert sample data for position table
INSERT INTO position (position_id, title, level, department_id) VALUES
(101, 'HR Manager', 'Senior', 1),
(102, 'HR Specialist', 'Mid', 1),
(103, 'Recruiter', 'Junior', 1),
(201, 'IT Director', 'Senior', 2),
(202, 'Software Developer', 'Mid', 2),
(203, 'System Administrator', 'Mid', 2),
(204, 'IT Support Specialist', 'Junior', 2),
(301, 'Marketing Manager', 'Senior', 3),
(302, 'Digital Marketing Specialist', 'Mid', 3),
(303, 'Content Writer', 'Junior', 3),
(401, 'Finance Manager', 'Senior', 4),
(402, 'Financial Analyst', 'Mid', 4),
(403, 'Accountant', 'Mid', 4),
(501, 'Operations Manager', 'Senior', 5),
(502, 'Operations Coordinator', 'Mid', 5),
(601, 'Sales Manager', 'Senior', 6),
(602, 'Sales Representative', 'Mid', 6),
(603, 'Sales Associate', 'Junior', 6),
(701, 'Customer Service Manager', 'Senior', 7),
(702, 'Customer Service Representative', 'Mid', 7);

-- Insert sample data for staff table (20+ records)
INSERT INTO staff (staff_id, name, nickname, gender, age, hire_date, email, address, phone_number, emer_phone, emer_name, position_id) VALUES
(100001, 'Chan Tai Man', 'Tommy', 'male', 35, '2020-03-15', 'tommy.chan@company.com', 'Flat 12A, Block 3, Tai Koo Shing, Hong Kong', '9123-4567', '9123-4568', 'Chan Lai Fong', 201),
(100002, 'Wong Siu Ling', 'Emma', 'female', 28, '2021-07-22', 'emma.wong@company.com', 'Unit 808, Tower 2, Olympian City, Kowloon', '9234-5678', '9234-5679', 'Wong Chi Ming', 202),
(100003, 'Lau Ka Chun', 'Michael', 'male', 42, '2019-01-10', 'michael.lau@company.com', 'Room 1502, Mei Foo Sun Chuen, New Territories', '9345-6789', '9345-6790', 'Lau Wing Yi', 101),
(100004, 'Li Wai Man', 'Sarah', 'female', 31, '2020-11-08', 'sarah.li@company.com', 'Flat 25B, Taikoo Place, Quarry Bay', '9456-7890', '9456-7891', 'Li Chun Kit', 301),
(100005, 'Cheung Ho Fai', 'Christopher', 'male', 39, '2018-05-20', 'chris.cheung@company.com', 'Unit 1203, Festival Walk, Kowloon Tong', '9567-8901', '9567-8902', 'Cheung Mei Lin', 401),
(100006, 'Tam Ka Wai', 'Jessica', 'female', 26, '2022-02-14', 'jessica.tam@company.com', 'Room 906, Citywalk, Tsuen Wan', '9678-9012', '9678-9013', 'Tam Wing Ho', 602),
(100007, 'Ho Chun Ming', 'David', 'male', 33, '2021-09-03', 'david.ho@company.com', 'Flat 18C, Whampoa Garden, Hung Hom', '9789-0123', '9789-0124', 'Ho Siu Ying', 203),
(100008, 'Yuen Hoi Shan', 'Ashley', 'female', 29, '2020-12-01', 'ashley.yuen@company.com', 'Unit 715, Telford Plaza, Kowloon Bay', '9890-1234', '9890-1235', 'Yuen Wai Keung', 302),
(100009, 'Ng Wing Chuen', 'James', 'male', 45, '2017-08-18', 'james.ng@company.com', 'Room 2105, Grand Millennium Plaza, Sheung Wan', '9901-2345', '9901-2346', 'Ng Lai Ching', 501),
(100010, 'Chow Pui Yi', 'Amanda', 'female', 27, '2022-06-10', 'amanda.chow@company.com', 'Flat 8A, Kornhill, Tai Koo', '9012-3456', '9012-3457', 'Chow Ka Shing', 702),
(100011, 'Leung Wai Lun', 'Robert', 'male', 36, '2019-10-25', 'robert.leung@company.com', 'Unit 1408, Metro City, Tseung Kwan O', '9123-4569', '9123-4570', 'Leung Suk Ying', 402),
(100012, 'Mak Hiu Tung', 'Michelle', 'female', 32, '2020-04-07', 'michelle.mak@company.com', 'Room 605, Kwun Tong Plaza, Kwun Tong', '9234-5680', '9234-5681', 'Mak Chun Wai', 102),
(100013, 'Tsang Chi Wai', 'Kevin', 'male', 38, '2018-12-12', 'kevin.tsang@company.com', 'Flat 22D, Lok Fu Plaza, Lok Fu', '9345-6791', '9345-6792', 'Tsang Mei Fong', 601),
(100014, 'Yu Shuk Fan', 'Nicole', 'female', 30, '2021-03-28', 'nicole.yu@company.com', 'Unit 1012, Maritime Square, Tsing Yi', '9456-7892', '9456-7893', 'Yu Ho Ming', 303),
(100015, 'Fung Kin Chung', 'Daniel', 'male', 41, '2017-11-15', 'daniel.fung@company.com', 'Room 1705, Amoy Plaza, Kowloon Bay', '9567-8903', '9567-8904', 'Fung Wing Sze', 403),
(100016, 'Ip Sze Wing', 'Stephanie', 'female', 25, '2023-01-20', 'stephanie.ip@company.com', 'Flat 9B, Sha Tin Plaza, Sha Tin', '9678-9014', '9678-9015', 'Ip Ka Ho', 204),
(100017, 'Kwok Chun Yip', 'Ryan', 'male', 34, '2019-06-30', 'ryan.kwok@company.com', 'Unit 1206, New Town Plaza, Sha Tin', '9789-0125', '9789-0126', 'Kwok Wai Lin', 502),
(100018, 'So Wing Kei', 'Lauren', 'female', 28, '2021-08-15', 'lauren.so@company.com', 'Room 803, Cityplaza, Tai Koo', '9890-1236', '9890-1237', 'So Chun Ho', 603),
(100019, 'Law Chak Ming', 'Brandon', 'male', 37, '2018-09-22', 'brandon.law@company.com', 'Flat 16A, Festival City, Ma On Shan', '9901-2347', '9901-2348', 'Law Siu Kuen', 701),
(100020, 'Chan Hoi Ying', 'Samantha', 'female', 29, '2020-10-05', 'samantha.chan@company.com', 'Unit 1015, Times Square, Causeway Bay', '9012-3458', '9012-3459', 'Chan Wing Tai', 103);

-- Additional staff records to reach around 20
INSERT INTO staff (staff_id, name, nickname, gender, age, hire_date, email, address, phone_number, emer_phone, emer_name, position_id) VALUES
(100021, 'Lam Wai Hong', 'Timothy', 'male', 43, '2017-04-12', 'timothy.lam@company.com', 'Room 1301, Elements, Kowloon Station', '9123-4571', '9123-4572', 'Lam Pui Shan', 602),
(100022, 'Wong Ka Man', 'Melissa', 'female', 26, '2022-11-18', 'melissa.wong@company.com', 'Flat 7C, Plaza Hollywood, Diamond Hill', '9234-5682', '9234-5683', 'Wong Chi Fai', 702);

-- Insert sample data for user_accounts table
INSERT INTO user_accounts (user_id, staff_id, password, role, last_login, password_reset_expires, failed_login_attempts, account_locked) VALUES
(1, 100001, 'hashed_password_123', 'Admin', '2024-08-03 16:30:00', NULL, 0, FALSE),
(2, 100002, 'hashed_password_456', 'Employee', '2024-08-03 14:15:00', NULL, 0, FALSE),
(3, 100003, 'hashed_password_789', 'HR', '2024-08-03 09:45:00', NULL, 1, FALSE),
(4, 100004, 'hashed_password_101', 'Manager', '2024-08-02 17:20:00', NULL, 0, FALSE),
(5, 100005, 'hashed_password_112', 'Manager', '2024-08-03 08:30:00', NULL, 0, FALSE),
(6, 100006, 'hashed_password_131', 'Employee', '2024-08-01 16:45:00', NULL, 2, FALSE),
(7, 100007, 'hashed_password_415', 'Employee', '2024-08-03 13:10:00', NULL, 0, FALSE),
(8, 100008, 'hashed_password_161', 'Employee', '2024-08-02 15:25:00', NULL, 0, FALSE),
(9, 100009, 'hashed_password_718', 'Manager', '2024-08-03 11:40:00', NULL, 0, FALSE),
(10, 100010, 'hashed_password_192', 'Employee', '2024-08-03 12:55:00', NULL, 0, FALSE),
(11, 100011, 'hashed_password_021', 'Employee', '2024-08-02 10:30:00', NULL, 0, FALSE),
(12, 100012, 'hashed_password_324', 'HR', '2024-08-03 09:15:00', NULL, 0, FALSE),
(13, 100013, 'hashed_password_526', 'Manager', '2024-08-03 14:50:00', NULL, 0, FALSE),
(14, 100014, 'hashed_password_728', 'Employee', '2024-08-01 13:20:00', NULL, 3, TRUE),
(15, 100015, 'hashed_password_930', 'Employee', '2024-08-03 16:10:00', NULL, 0, FALSE),
(16, 100016, 'hashed_password_132', 'Employee', '2024-08-03 08:45:00', NULL, 0, FALSE),
(17, 100017, 'hashed_password_334', 'Employee', '2024-08-02 17:30:00', NULL, 1, FALSE),
(18, 100018, 'hashed_password_536', 'Employee', '2024-08-03 10:20:00', NULL, 0, FALSE),
(19, 100019, 'hashed_password_738', 'Manager', '2024-08-03 15:40:00', NULL, 0, FALSE),
(20, 100020, 'hashed_password_940', 'Employee', '2024-08-02 12:25:00', NULL, 0, FALSE),
(21, 100021, 'hashed_password_142', 'Employee', '2024-08-03 09:35:00', NULL, 0, FALSE),
(22, 100022, 'hashed_password_344', 'Employee', '2024-08-01 14:15:00', NULL, 1, FALSE);

-- Insert sample data for attendance table (last 5 working days)
INSERT INTO attendance (attendance_log, staff_id, date, check_in, check_out, total_hours, status) VALUES
-- Monday 2024-07-29
('ATT_100001_20240729', 100001, '2024-07-29', '09:00:00', '18:00:00', 8.00, 'Present'),
('ATT_100002_20240729', 100002, '2024-07-29', '09:15:00', '18:30:00', 8.25, 'Present'),
('ATT_100003_20240729', 100003, '2024-07-29', '08:45:00', '17:45:00', 8.00, 'Present'),
('ATT_100004_20240729', 100004, '2024-07-29', NULL, NULL, NULL, 'Sick Leave'),
('ATT_100005_20240729', 100005, '2024-07-29', '09:30:00', '18:15:00', 7.75, 'Late'),
('ATT_100006_20240729', 100006, '2024-07-29', '09:00:00', '18:00:00', 8.00, 'Present'),
('ATT_100007_20240729', 100007, '2024-07-29', '08:55:00', '17:55:00', 8.00, 'Present'),
('ATT_100008_20240729', 100008, '2024-07-29', '09:05:00', '18:05:00', 8.00, 'Present'),
('ATT_100009_20240729', 100009, '2024-07-29', '08:50:00', '17:50:00', 8.00, 'Present'),
('ATT_100010_20240729', 100010, '2024-07-29', '09:10:00', '18:10:00', 8.00, 'Present'),

-- Tuesday 2024-07-30
('ATT_100001_20240730', 100001, '2024-07-30', '09:00:00', '18:00:00', 8.00, 'Present'),
('ATT_100002_20240730', 100002, '2024-07-30', '09:00:00', '18:00:00', 8.00, 'Present'),
('ATT_100003_20240730', 100003, '2024-07-30', '08:45:00', '17:45:00', 8.00, 'Present'),
('ATT_100004_20240730', 100004, '2024-07-30', NULL, NULL, NULL, 'Sick Leave'),
('ATT_100005_20240730', 100005, '2024-07-30', '09:00:00', '19:00:00', 9.00, 'Overtime'),
('ATT_100006_20240730', 100006, '2024-07-30', '09:25:00', '18:25:00', 8.00, 'Late'),
('ATT_100007_20240730', 100007, '2024-07-30', '09:00:00', '18:00:00', 8.00, 'Present'),
('ATT_100008_20240730', 100008, '2024-07-30', '09:00:00', '18:00:00', 8.00, 'Present'),
('ATT_100009_20240730', 100009, '2024-07-30', '08:45:00', '17:45:00', 8.00, 'Present'),
('ATT_100010_20240730', 100010, '2024-07-30', '09:00:00', '18:00:00', 8.00, 'Present'),

-- Wednesday 2024-07-31
('ATT_100001_20240731', 100001, '2024-07-31', '09:05:00', '18:05:00', 8.00, 'Present'),
('ATT_100002_20240731', 100002, '2024-07-31', '09:00:00', '18:00:00', 8.00, 'Present'),
('ATT_100003_20240731', 100003, '2024-07-31', '08:50:00', '17:50:00', 8.00, 'Present'),
('ATT_100004_20240731', 100004, '2024-07-31', '09:00:00', '18:00:00', 8.00, 'Present'),
('ATT_100005_20240731', 100005, '2024-07-31', '09:00:00', '18:30:00', 8.50, 'Present'),
('ATT_100006_20240731', 100006, '2024-07-31', NULL, NULL, NULL, 'Annual Leave'),
('ATT_100007_20240731', 100007, '2024-07-31', '09:00:00', '18:00:00', 8.00, 'Present'),
('ATT_100008_20240731', 100008, '2024-07-31', '09:15:00', '18:15:00', 8.00, 'Present'),
('ATT_100009_20240731', 100009, '2024-07-31', '08:45:00', '18:45:00', 9.00, 'Overtime'),
('ATT_100010_20240731', 100010, '2024-07-31', '09:00:00', '18:00:00', 8.00, 'Present'),

-- Thursday 2024-08-01
('ATT_100001_20240801', 100001, '2024-08-01', '09:00:00', '18:00:00', 8.00, 'Present'),
('ATT_100002_20240801', 100002, '2024-08-01', '09:10:00', '18:10:00', 8.00, 'Present'),
('ATT_100003_20240801', 100003, '2024-08-01', '08:45:00', '17:45:00', 8.00, 'Present'),
('ATT_100004_20240801', 100004, '2024-08-01', '09:00:00', '18:00:00', 8.00, 'Present'),
('ATT_100005_20240801', 100005, '2024-08-01', '09:00:00', '18:00:00', 8.00, 'Present'),
('ATT_100006_20240801', 100006, '2024-08-01', NULL, NULL, NULL, 'Annual Leave'),
('ATT_100007_20240801', 100007, '2024-08-01', '09:30:00', '18:30:00', 8.00, 'Late'),
('ATT_100008_20240801', 100008, '2024-08-01', '09:00:00', '18:00:00', 8.00, 'Present'),
('ATT_100009_20240801', 100009, '2024-08-01', '08:50:00', '17:50:00', 8.00, 'Present'),
('ATT_100010_20240801', 100010, '2024-08-01', '09:00:00', '18:00:00', 8.00, 'Present'),

-- Friday 2024-08-02
('ATT_100001_20240802', 100001, '2024-08-02', '09:00:00', '18:00:00', 8.00, 'Present'),
('ATT_100002_20240802', 100002, '2024-08-02', '09:00:00', '18:00:00', 8.00, 'Present'),
('ATT_100003_20240802', 100003, '2024-08-02', '08:45:00', '17:45:00', 8.00, 'Present'),
('ATT_100004_20240802', 100004, '2024-08-02', '09:20:00', '18:20:00', 8.00, 'Late'),
('ATT_100005_20240802', 100005, '2024-08-02', '09:00:00', '19:30:00', 9.50, 'Overtime'),
('ATT_100006_20240802', 100006, '2024-08-02', '09:00:00', '18:00:00', 8.00, 'Present'),
('ATT_100007_20240802', 100007, '2024-08-02', '09:00:00', '18:00:00', 8.00, 'Present'),
('ATT_100008_20240802', 100008, '2024-08-02', '09:05:00', '18:05:00', 8.00, 'Present'),
('ATT_100009_20240802', 100009, '2024-08-02', '08:45:00', '17:45:00', 8.00, 'Present'),
('ATT_100010_20240802', 100010, '2024-08-02', NULL, NULL, NULL, 'Sick Leave');