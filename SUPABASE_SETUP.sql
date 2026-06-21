-- ⚠️ Si ya creaste la tabla "records" antes, bórrala primero:
DROP TABLE IF EXISTS records;
DROP TABLE IF EXISTS reimbursements;

-- 1. Tabla de registros de horas (concepto: Trabajo / Reunión)
CREATE TABLE records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_email TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  date DATE NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  hours NUMERIC NOT NULL,
  concept TEXT NOT NULL,
  status TEXT NOT NULL,
  description TEXT,
  deliverable TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla de reembolsos (separada de las horas)
CREATE TABLE reimbursements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_email TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  date DATE NOT NULL,
  concept TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Seguridad a nivel de fila
ALTER TABLE records ENABLE ROW LEVEL SECURITY;
ALTER TABLE reimbursements ENABLE ROW LEVEL SECURITY;

-- 4. Políticas para "records"
CREATE POLICY "ver_propios_records" ON records FOR SELECT USING (auth.email() = employee_email OR auth.email() = 'yohan@timely.app');
CREATE POLICY "insertar_propios_records" ON records FOR INSERT WITH CHECK (auth.email() = employee_email);
CREATE POLICY "borrar_records" ON records FOR DELETE USING (auth.email() = employee_email OR auth.email() = 'yohan@timely.app');

-- 5. Políticas para "reimbursements"
CREATE POLICY "ver_propios_reimb" ON reimbursements FOR SELECT USING (auth.email() = employee_email OR auth.email() = 'yohan@timely.app');
CREATE POLICY "insertar_propios_reimb" ON reimbursements FOR INSERT WITH CHECK (auth.email() = employee_email);
CREATE POLICY "borrar_reimb" ON reimbursements FOR DELETE USING (auth.email() = employee_email OR auth.email() = 'yohan@timely.app');
