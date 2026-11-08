-- Optional synthetic fixtures ONLY for the explicitly requested existing tenant.
-- No real identity/health data, passwords or users are created. Reruns preserve edits.
BEGIN;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM tenants WHERE id='c6988bed-87d6-4058-ab95-5a833c27d513' AND is_deleted=false AND is_active=true) THEN
  RAISE EXCEPTION 'Create/activate the requested tenant before seeding employee fixtures';
 END IF;
END $$;
INSERT INTO hr_employee_biodata
 (id,tenant_id,employee_identifier,first_name,other_name,last_name,title,gender,status,
  department_name,category_name,date_appointed,date_of_birth,nationality,city_or_location,
  company_email,languages,interests,leave_days_entitled)
VALUES
 ('e0190000-0000-4000-8000-000000000001','c6988bed-87d6-4058-ab95-5a833c27d513','DEMO-EMP-001','Ama','','Mensah','Ms','Female',0,'Finance','Permanent','2024-01-15','1992-03-12','Ghanaian','Accra','ama.mensah@example.test','["English","Twi"]','["Reading"]',24),
 ('e0190000-0000-4000-8000-000000000002','c6988bed-87d6-4058-ab95-5a833c27d513','DEMO-EMP-002','Kojo','','Owusu','Mr','Male',0,'Operations','Permanent','2023-06-01','1989-07-22','Ghanaian','Accra','kojo.owusu@example.test','["English","Fante"]','["Cycling"]',24),
 ('e0190000-0000-4000-8000-000000000003','c6988bed-87d6-4058-ab95-5a833c27d513','DEMO-EMP-003','Abena','','Boateng','Ms','Female',0,'Human Resources','Permanent','2024-04-08','1994-11-04','Ghanaian','Tema','abena.boateng@example.test','["English","Twi"]','["Music"]',24),
 ('e0190000-0000-4000-8000-000000000004','c6988bed-87d6-4058-ab95-5a833c27d513','DEMO-EMP-004','Kofi','','Asare','Mr','Male',0,'IT','Contract','2025-02-03','1996-05-18','Ghanaian','Accra','kofi.asare@example.test','["English","Ga"]','["Technology"]',21),
 ('e0190000-0000-4000-8000-000000000005','c6988bed-87d6-4058-ab95-5a833c27d513','DEMO-EMP-005','Akosua','','Adjei','Ms','Female',0,'Procurement','Permanent','2024-09-02','1991-09-30','Ghanaian','Accra','akosua.adjei@example.test','["English","Twi"]','["Gardening"]',24)
ON CONFLICT (tenant_id,lower(btrim(employee_identifier))) DO NOTHING;
COMMIT;
