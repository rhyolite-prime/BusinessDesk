"""Use the existing coroutine seam, but send SQL/binds to real PostgreSQL via libpq.
Only the test transport is synchronous; BankService.cc remains unmodified.
"""
import pathlib, runpy, sys
runpy.run_path(str(pathlib.Path(__file__).parents[1] / 'users/prepare_mocks.py'), run_name='__main__')
p = pathlib.Path(sys.argv[1]) / 'drogon/drogon.h'
s = p.read_text().replace('void rollback(){rolledBack=true;}', 'void rollback(){rolledBack=true;if(execute)execute("ROLLBACK",{});}')
s = s.replace('~TestTransaction(){if(commitCallback)commitCallback(!rolledBack&&!failCommit);}', '~TestTransaction(){if(execute&&!rolledBack)execute(failCommit?"ROLLBACK":"COMMIT",{});if(commitCallback)commitCallback(!rolledBack&&!failCommit);}')
s = s.replace('auto tx=std::make_shared<TestTransaction>();tx->execute=execute;co_return tx;', 'if(execute)execute("BEGIN",{});auto tx=std::make_shared<TestTransaction>();tx->execute=execute;co_return tx;')
p.write_text(s)
p = pathlib.Path(sys.argv[1]) / 'drogon/orm/CoroMapper.h'
p.write_text(p.read_text().replace('using DbClientPtr =', 'using Row = drogon::TestRow;\nusing DbClientPtr ='))
