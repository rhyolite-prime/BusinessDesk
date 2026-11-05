"""No external dependencies: regeneration regression + checked-in model checks."""
import importlib.util
from pathlib import Path
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('repair', ROOT / 'scripts/fix_generated_composite_relationships.py')
repair = importlib.util.module_from_spec(spec)
spec.loader.exec_module(repair)


def fixture(folder):
    for model in sorted({r[0] for r in repair.RELATIONS}):
        h, cc = '', ''
        for cls, method, target, table, foreign in repair.RELATIONS:
            if cls != model:
                continue
            h += f'    {target} getTenant(const DbClientPtr &clientPtr) const;\n'
            h += f'    void getTenant(const DbClientPtr &clientPtr,\n        const std::function<void({target})> &rcb, const ExceptionCallback &ecb) const;\n'
            # Mimic generated per-column tenant helpers as well as real ID helpers.
            for name, field in [('getTenant', 'tenantId_'), (method, foreign)]:
                cc += f'''{target} {model}::{name}(const DbClientPtr &clientPtr) const {{
    static const std::string sql = "select * from {table} where id = $1";
    binder << *{field} << Mode::Blocking;
}}
void {model}::{name}(const DbClientPtr &clientPtr,
    const std::function<void({target})> &rcb, const ExceptionCallback &ecb) const
{{
    static const std::string sql = "select * from {table} where id = $1";
    *clientPtr << sql << *{field} >> rcb >> ecb;
}}
'''
        # Genuine tenant relationships, if a future generator adds them, must survive.
        h += '    Tenants getTenant(const DbClientPtr &clientPtr) const;\n'
        cc += f'''Tenants {model}::getTenant(const DbClientPtr &clientPtr) const {{
    static const std::string sql = "select * from tenants where id = $1";
}}
'''
        (folder / f'{model}.h').write_text(h)
        (folder / f'{model}.cc').write_text(cc)


class CompositeRelationshipTests(unittest.TestCase):
    def test_repair_both_sync_and_async_without_removing_real_tenant_relation(self):
        with tempfile.TemporaryDirectory() as tmp:
            folder = Path(tmp)
            fixture(folder)
            self.assertEqual(repair.repair(folder), 4)
            for model, method, target, table, field in repair.RELATIONS:
                h, cc = (folder / f'{model}.h').read_text(), (folder / f'{model}.cc').read_text()
                self.assertNotIn(f'{target} getTenant(', h)
                self.assertNotIn(f'{target} {model}::getTenant(', cc)
                self.assertIn('Tenants getTenant(', h)
                self.assertIn(f'Tenants {model}::getTenant(', cc)
                self.assertEqual(cc.count(f'from {table} where tenant_id = $1 and id = $2 and is_deleted = false'), 2)
                self.assertEqual(cc.count(f'if (!tenantId_ || !{field})'), 2)
                self.assertEqual(cc.count(f'<< *tenantId_ << *{field}'), 2)
                self.assertIn('ecb(UnexpectedRows("Relationship is not set"));\n        return;', cc)
            before = {p: p.read_bytes() for p in folder.iterdir()}
            self.assertEqual(repair.repair(folder), 0)
            self.assertEqual(before, {p: p.read_bytes() for p in folder.iterdir()})

    def test_unknown_generator_output_fails_before_writing(self):
        with tempfile.TemporaryDirectory() as tmp:
            folder = Path(tmp)
            fixture(folder)
            p = folder / 'GlPaymentVouchers.cc'
            p.write_text(p.read_text().replace('select * from core_suppliers', 'SELECT * FROM core_suppliers'))
            before = {p: p.read_bytes() for p in folder.iterdir()}
            with self.assertRaisesRegex(ValueError, 'unrecognized generated query'):
                repair.repair(folder)
            self.assertEqual(before, {p: p.read_bytes() for p in folder.iterdir()})

    def test_checked_in_models_are_already_repaired(self):
        with tempfile.TemporaryDirectory() as tmp:
            folder = Path(tmp)
            for model in {r[0] for r in repair.RELATIONS}:
                for suffix in ('.h', '.cc'):
                    name = model + suffix
                    (folder / name).write_bytes((ROOT / 'models' / name).read_bytes())
            self.assertEqual(repair.repair(folder), 0)
            for model, method, target, table, field in repair.RELATIONS:
                h = (folder / f'{model}.h').read_text()
                cc = (folder / f'{model}.cc').read_text()
                self.assertNotIn(f'{target} getTenant(', h)
                self.assertEqual(cc.count(f'from {table} where tenant_id = $1 and id = $2 and is_deleted = false'), 2)
                self.assertEqual(cc.count(f'if (!tenantId_ || !{field})'), 2)
                self.assertEqual(cc.count(f'<< *tenantId_ << *{field}'), 2)

    def test_schema_preserves_single_primary_key_and_composite_foreign_keys(self):
        initial = (ROOT / 'database/migrations/001_create_ledger_schema.sql').read_text()
        table = initial.split('CREATE TABLE gl_payment_vouchers (', 1)[1].split('\n);', 1)[0]
        self.assertIn('id uuid PRIMARY KEY DEFAULT gen_random_uuid()', table)
        supplier = (ROOT / 'database/migrations/016_suppliers.sql').read_text()
        employee = (ROOT / 'database/migrations/019_employee_biodata.sql').read_text()
        self.assertIn('FOREIGN KEY(tenant_id,supplier_id) REFERENCES core_suppliers(tenant_id,id)', supplier)
        self.assertIn('FOREIGN KEY(tenant_id,employee_id) REFERENCES hr_employee_biodata(tenant_id,id)', employee)


if __name__ == '__main__':
    unittest.main()
