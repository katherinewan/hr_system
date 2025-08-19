-- Add payroll card related columns to salary table

-- Add card number column
ALTER TABLE salary 
ADD COLUMN card_number VARCHAR(20) NULL;

-- Add card name column
ALTER TABLE salary 
ADD COLUMN card_name VARCHAR(100) NULL;

-- Add bank name column (using ENUM type to restrict options)
CREATE TYPE bank_name_enum AS ENUM (
    'hsbc',
    'hang_seng_bank',
    'bank_of_china',
    'standard_chartered',
    'citibank',
    'dbs_bank',
    'icbc',
    'boc_hong_kong',
    'china_construction_bank',
    'agricultural_bank_of_china',
    'other'
);

ALTER TABLE salary 
ADD COLUMN bank_name bank_name_enum NULL;

-- Add comments to new columns
COMMENT ON COLUMN salary.card_number IS 'Payroll card number';
COMMENT ON COLUMN salary.card_name IS 'Payroll card name';
COMMENT ON COLUMN salary.bank_name IS 'Bank name for payroll card';

-- Optional: Add index on card number for better query performance
CREATE INDEX idx_salary_card_number ON salary(card_number);

-- Optional: Add check constraint to ensure card number format is correct
ALTER TABLE salary 
ADD CONSTRAINT chk_card_number_format 
CHECK (card_number ~ '^[0-9-\s]* OR card_number IS NULL);

-- View updated table structure
\d salary;


-- 為現有薪資記錄添加隨機出糧卡資料（使用真實員工姓名）

-- S1001 - Chan Tai Man (Tommy)
UPDATE salary SET 
    card_number = '4532876543210987', 
    card_name = 'Chan Tai Man', 
    bank_name = 'hsbc' 
WHERE salary_id = 'S1001';

-- S1002 - Wong Siu Ling (Emma)
UPDATE salary SET 
    card_number = '5412345678901234', 
    card_name = 'Wong Siu Ling', 
    bank_name = 'hang_seng_bank' 
WHERE salary_id = 'S1002';

-- S1003 - Lau Ka Chun (Michael)
UPDATE salary SET 
    card_number = '4000123456789012', 
    card_name = 'Lau Ka Chun', 
    bank_name = 'bank_of_china' 
WHERE salary_id = 'S1003';

-- S1004 - Li Wai Man (Sarah)
UPDATE salary SET 
    card_number = '5555666677778888', 
    card_name = 'Li Wai Man', 
    bank_name = 'standard_chartered' 
WHERE salary_id = 'S1004';

-- S1005 - Cheung Ho Fai (Christopher)
UPDATE salary SET 
    card_number = '4111222233334444', 
    card_name = 'Cheung Ho Fai', 
    bank_name = 'citibank' 
WHERE salary_id = 'S1005';

-- S1006 - Tam Ka Wai (Jessica)
UPDATE salary SET 
    card_number = '5200987654321098', 
    card_name = 'Tam Ka Wai', 
    bank_name = 'dbs_bank' 
WHERE salary_id = 'S1006';

-- S1007 - Ho Chun Ming (David)
UPDATE salary SET 
    card_number = '4567890123456789', 
    card_name = 'Ho Chun Ming', 
    bank_name = 'icbc' 
WHERE salary_id = 'S1007';

-- S1008 - Yuen Hoi Shan (Ashley)
UPDATE salary SET 
    card_number = '5432109876543210', 
    card_name = 'Yuen Hoi Shan', 
    bank_name = 'boc_hong_kong' 
WHERE salary_id = 'S1008';

-- S1009 - Ng Wing Chuen (James)
UPDATE salary SET 
    card_number = '4321098765432109', 
    card_name = 'Ng Wing Chuen', 
    bank_name = 'china_construction_bank' 
WHERE salary_id = 'S1009';

-- S1010 - Chow Pui Yi (Amanda)
UPDATE salary SET 
    card_number = '5678901234567890', 
    card_name = 'Chow Pui Yi', 
    bank_name = 'agricultural_bank_of_china' 
WHERE salary_id = 'S1010';

-- S1011 - Leung Wai Lun (Robert)
UPDATE salary SET 
    card_number = '4987654321098765', 
    card_name = 'Leung Wai Lun', 
    bank_name = 'hsbc' 
WHERE salary_id = 'S1011';

-- S1012 - Mak Hiu Tung (Michelle)
UPDATE salary SET 
    card_number = '5123456789012345', 
    card_name = 'Mak Hiu Tung', 
    bank_name = 'hang_seng_bank' 
WHERE salary_id = 'S1012';

-- S1013 - Tsang Chi Wai (Kevin)
UPDATE salary SET 
    card_number = '4444555566667777', 
    card_name = 'Tsang Chi Wai', 
    bank_name = 'standard_chartered' 
WHERE salary_id = 'S1013';

-- S1014 - Yu Shuk Fan (Nicole)
UPDATE salary SET 
    card_number = '5333444455556666', 
    card_name = 'Yu Shuk Fan', 
    bank_name = 'citibank' 
WHERE salary_id = 'S1014';

-- S1015 - Fung Kin Chung (Daniel)
UPDATE salary SET 
    card_number = '4777888899990000', 
    card_name = 'Fung Kin Chung', 
    bank_name = 'dbs_bank' 
WHERE salary_id = 'S1015';

-- S1016 - Ip Sze Wing (Stephanie)
UPDATE salary SET 
    card_number = '5888999900001111', 
    card_name = 'Ip Sze Wing', 
    bank_name = 'bank_of_china' 
WHERE salary_id = 'S1016';

-- S1017 - Kwok Chun Yip (Ryan)
UPDATE salary SET 
    card_number = '4666777788889999', 
    card_name = 'Kwok Chun Yip', 
    bank_name = 'icbc' 
WHERE salary_id = 'S1017';

-- S1020 - Chan Hoi Ying (Samantha)
UPDATE salary SET 
    card_number = '5999000011112222', 
    card_name = 'Chan Hoi Ying', 
    bank_name = 'boc_hong_kong' 
WHERE salary_id = 'S1020';

-- S1021 - Wan Cheuk Ling (Katherine)
UPDATE salary SET 
    card_number = '4222333344445555', 
    card_name = 'Wan Cheuk Ling', 
    bank_name = 'china_construction_bank' 
WHERE salary_id = 'S1021';

-- S1022 - 根據 staff_id 100020 查找對應員工姓名
UPDATE salary SET 
    card_number = '5777888899990000', 
    card_name = (SELECT name FROM staff WHERE staff_id = 100020), 
    bank_name = 'agricultural_bank_of_china' 
WHERE salary_id = 'S1022';