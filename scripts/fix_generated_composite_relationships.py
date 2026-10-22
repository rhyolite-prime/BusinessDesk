#!/usr/bin/env python3
"""Repair Drogon per-column helpers for known tenant-scoped composite FKs.

Run after `drogon_ctl create model models`. No schema/constraint changes.
Unknown generated SQL fails explicitly rather than silently rewriting it.
"""
import argparse
import re
from pathlib import Path

RELATIONS = (
    ('GlPaymentVouchers', 'getSupplier', 'CoreSuppliers', 'core_suppliers', 'supplierId_'),
    ('GlPaymentVouchers', 'getEmployee', 'HrEmployeeBiodata', 'hr_employee_biodata', 'employeeId_'),
    ('GlImprests', 'getEmployee', 'HrEmployeeBiodata', 'hr_employee_biodata', 'employeeId_'),
)


def repair(model_dir: Path) -> int:
    changes = {}
    for model in sorted({r[0] for r in RELATIONS}):
        header_path = model_dir / f'{model}.h'
        source_path = model_dir / f'{model}.cc'
        header, source = header_path.read_text(), source_path.read_text()
        old_header, old_source = header, source
        targets = {r[2] for r in RELATIONS if r[0] == model}
        tables = {r[3] for r in RELATIONS if r[0] == model}

        def remove_declaration(match):
            block = match[0]
            if any(re.search(r'\b' + target + r'\b', block) for target in targets):
                return ''
            return block

        header = re.sub(r'^    (?:\w+) getTenant\(.*?;\n', remove_declaration,
                        header, flags=re.M | re.S)
        # Generated functions close at column zero (nested branches/lambdas do not).
        def remove_definition(match):
            block = match[0]
            if any(f'from {table} where' in block for table in tables):
                return ''
            return block

        source = re.sub(r'^\w+ ' + model + r'::getTenant\(.*?^}\n\n?',
                        remove_definition, source, flags=re.M | re.S)
        for cls, method, target, table, foreign in RELATIONS:
            if cls != model:
                continue
            pattern = r'^(?:' + target + r'|void) ' + model + r'::' + method + r'\(.*?^}\n'
            matches = list(re.finditer(pattern, source, flags=re.M | re.S))
            if len(matches) != 2:
                raise ValueError(f'{model}::{method}: expected sync + async helpers, found {len(matches)}')

            def fix(match):
                block = match[0]
                sql = f'select * from {table} where tenant_id = $1 and id = $2 and is_deleted = false'
                guard = f'if (!tenantId_ || !{foreign})'
                if sql in block and guard in block:
                    if (block.count(sql) != 1 or block.count(guard) != 1
                            or block.count(f'<< *tenantId_ << *{foreign}') != 1
                            or block.index(guard) > block.index(sql)):
                        raise ValueError(f'{model}::{method}: invalid repaired query/bindings/guard')
                    return block
                old_sql = f'select * from {table} where id = $1'
                if block.count(old_sql) != 1:
                    raise ValueError(f'{model}::{method}: unrecognized generated query; review composite FK handling')
                block = block.replace(old_sql, sql)
                if block.startswith('void '):
                    old_bind = f'<< *{foreign}'
                    if block.count(old_bind) != 1:
                        raise ValueError(f'{model}::{method}: unexpected async binding')
                    block = block.replace(old_bind, f'<< *tenantId_ << *{foreign}')
                    check = f'    {guard}\n    {{\n        ecb(UnexpectedRows("Relationship is not set"));\n        return;\n    }}\n'
                else:
                    old_bind = f'binder << *{foreign}'
                    if block.count(old_bind) != 1:
                        raise ValueError(f'{model}::{method}: unexpected sync binding')
                    block = block.replace(old_bind, f'binder << *tenantId_ << *{foreign}')
                    check = f'    {guard}\n        throw UnexpectedRows("Relationship is not set");\n'
                # Insert after the function body opening, not the callback's braces.
                opening = block.index('{') + 1
                return block[:opening] + '\n' + check + block[opening:]

            source = re.sub(pattern, fix, source, flags=re.M | re.S)
        if header != old_header:
            changes[header_path] = header
        if source != old_source:
            changes[source_path] = source
    # Validate every model before writing anything (all-or-nothing for validation errors).
    for path, content in changes.items():
        path.write_text(content)
    return len(changes)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('model_dir', nargs='?', type=Path, default=Path(__file__).resolve().parents[1] / 'models')
    args = parser.parse_args()
    print(f'Repaired {repair(args.model_dir)} generated model files.')
