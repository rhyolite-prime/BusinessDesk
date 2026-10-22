"""Generate an in-memory Drogon/ORM seam; retain real JsonCpp, bcrypt and JWT crypto.
Usage: python3 test/users/prepare_mocks.py /tmp/user-service-mocks
Model setters/getters are derived from the checked-in declarations, not invented.
"""
import pathlib, re, sys
root = pathlib.Path(__file__).resolve().parents[2]
out = pathlib.Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
def write(name, text):
    path = out / name; path.parent.mkdir(parents=True, exist_ok=True); path.write_text(text)
write('trantor/utils/Date.h', '''#pragma once
namespace trantor { struct Date { Date() = default; Date(unsigned int, unsigned int, unsigned int) {} static Date now() { return {}; } }; }
''')
write('drogon/HttpRequest.h', '''#pragma once
#include <any>
#include <json/json.h>
#include <map>
#include <memory>
#include <string>
namespace drogon {
struct Attributes {
 std::map<std::string,std::any> data;
 bool find(const std::string &k) { return data.count(k); }
 void erase(const std::string &k) { data.erase(k); }
 template<class T> const T &get(const std::string &k) const { return std::any_cast<const T &>(data.at(k)); }
 template<class T> void insert(const std::string &k, T v) { data[k] = v; }
};
struct HttpRequest { std::shared_ptr<Attributes> attrs = std::make_shared<Attributes>();
 auto attributes() const { return attrs; }
};
using HttpRequestPtr = std::shared_ptr<HttpRequest>;
}
''')
write('drogon/drogon.h', '''#pragma once
#include <drogon/HttpRequest.h>
#include <trantor/utils/Date.h>
#include <json/json.h>
#include <coroutine>
#include <exception>
#include <optional>
#include <functional>
#include <iostream>
#include <utility>
#define LOG_ERROR std::cerr
namespace drogon {
template<class T> struct Task {
 struct promise_type {
  std::optional<T> value; std::exception_ptr error;
  Task get_return_object() { return Task{std::coroutine_handle<promise_type>::from_promise(*this)}; }
  std::suspend_never initial_suspend() { return {}; }
  std::suspend_always final_suspend() noexcept { return {}; }
  void unhandled_exception() { error = std::current_exception(); }
  template<class V> void return_value(V &&v) { value.emplace(std::forward<V>(v)); }
 };
 std::coroutine_handle<promise_type> h;
 Task(Task &&o): h(std::exchange(o.h, {})) {}
 explicit Task(std::coroutine_handle<promise_type> v):h(v) {}
 ~Task() { if (h) h.destroy(); }
 bool await_ready() { return true; } void await_suspend(std::coroutine_handle<>) {}
 T await_resume() { return get(); }
 T get() { if(h.promise().error) std::rethrow_exception(h.promise().error); return *h.promise().value; }
};
template<> struct Task<void> {
 struct promise_type { std::exception_ptr error;
 Task get_return_object(){return {std::coroutine_handle<promise_type>::from_promise(*this)};}
 std::suspend_never initial_suspend()noexcept{return {};}
 std::suspend_always final_suspend()noexcept{return {};}
 void return_void(){} void unhandled_exception(){error=std::current_exception();}};
 std::coroutine_handle<promise_type> handle;
 ~Task(){if(handle)handle.destroy();}
 bool await_ready()const noexcept{return true;}
 void await_suspend(std::coroutine_handle<>)const noexcept{}
 void await_resume(){if(handle.promise().error)std::rethrow_exception(handle.promise().error);}
 void get(){await_resume();}
};
template<typename F>void async_run(F&& f){auto task=f();task.get();}
struct TestField {
 Json::Value value;
 template<class T> T as() const {
  if constexpr (std::is_same_v<T,std::string>) return value.asString();
  else if constexpr (std::is_same_v<T,bool>) return value.asBool();
  else return value.asInt64();
 }
};
struct TestRow { Json::Value value; TestField operator[](const std::string &key) const {return {value[key]};} };
using TestResult = std::vector<TestRow>;
struct TestTransaction;
TestResult tenantAuthRows(const std::vector<Json::Value>& params,bool byAccount);
struct TestDb {
 Task<std::shared_ptr<TestTransaction>> newTransactionCoro();
 std::function<TestResult(const std::string &,const std::vector<Json::Value> &)> execute;
 template<class... Args> Task<TestResult> execSqlCoro(const std::string &sql,const Args &...args) {
  const std::vector<Json::Value> params{Json::Value(args)...};
  if(sql.find("/* tenant_auth_lookup */")!=std::string::npos) co_return tenantAuthRows(params,sql.find("tenancy_name=$1")!=std::string::npos);
  if(execute) co_return execute(sql,params);
  co_return TestResult{};
 }
};
struct TestTransaction : TestDb {
 inline static bool failCommit=false;
 std::function<void(bool)> commitCallback;
 bool rolledBack=false;
 void rollback(){rolledBack=true;}
 void setCommitCallback(std::function<void(bool)> callback){commitCallback=std::move(callback);}
 ~TestTransaction(){if(commitCallback)commitCallback(!rolledBack&&!failCommit);}
};
inline Task<std::shared_ptr<TestTransaction>> TestDb::newTransactionCoro(){auto tx=std::make_shared<TestTransaction>();tx->execute=execute;co_return tx;}
struct Application {
 Json::Value config;
 std::shared_ptr<TestDb> db=std::make_shared<TestDb>();
 auto getDbClient() { return db; }
 Json::Value getCustomConfig() { return config; }
 template<class T> T *getPlugin() { static T instance; return &instance; }
};
inline Application &app() { static Application instance; return instance; }
}
''')
write('drogon/utils/coroutine.h','#include <drogon/drogon.h>\n')
write('drogon/orm/CoroMapper.h', '''#pragma once
#include <drogon/drogon.h>
#include <functional>
#include <vector>
namespace drogon::orm {
using DbClientPtr = std::shared_ptr<drogon::TestDb>;
using Transaction = drogon::TestTransaction;
struct DrogonDbException : std::runtime_error { using std::runtime_error::runtime_error; const auto &base() const { return *this; } };
struct UniqueViolation : DrogonDbException { using DrogonDbException::DrogonDbException; };
struct UnexpectedRows : DrogonDbException { UnexpectedRows():DrogonDbException("Not found") {} };
enum class CompareOperator { EQ, NE, IsNull, Like };
inline bool rejectEmptyUuidParameters=false;
struct Criteria {
 std::function<bool(const Json::Value &)> match = [](auto &) { return true; };
 Criteria() = default;
 Criteria(std::string k, CompareOperator op) { match = [k,op](auto &r) { return op==CompareOperator::IsNull && r[k].isNull(); }; }
 template<class T> Criteria(std::string k, CompareOperator op, T v) {
  const Json::Value parameter(v);
  if(rejectEmptyUuidParameters && (k=="id" || k.ends_with("_id")) && parameter.isString() && parameter.asString().empty()) throw DrogonDbException("invalid input syntax for type uuid: empty string");
  match = [k,op,w=Json::Value(v)](auto &r) {
   if (op==CompareOperator::EQ) return r[k]==w;
   if (op==CompareOperator::NE) return r[k]!=w;
   if (op==CompareOperator::Like) { auto s=w.asString(); if(!s.empty()) s=s.substr(1,s.size()-2); return r[k].asString().find(s)!=std::string::npos; }
   return false;
  };
 }
 Criteria operator&&(Criteria b) const { Criteria r; r.match=[a=*this,b](auto &v){return a.match(v)&&b.match(v);}; return r; }
 Criteria operator||(Criteria b) const { Criteria r; r.match=[a=*this,b](auto &v){return a.match(v)||b.match(v);}; return r; }
};
template<class M> struct CoroMapper {
 inline static std::vector<M> rows;
 inline static bool failQueries=false, failUniqueWrites=false;
 inline static int queriesBeforeFailure=-1;
 size_t max=1000000, skip=0;
 template<class T> explicit CoroMapper(T) {}
 auto &orderBy(const std::string &) { return *this; }
 auto &forUpdate() { return *this; }
 auto &limit(size_t n) { max=n; return *this; } auto &offset(size_t n) { skip=n; return *this; }
 Task<size_t> count(Criteria c) { if(failQueries) throw DrogonDbException("private-db-detail"); size_t n=0; for(auto &r:rows) if(c.match(r.toJson())) ++n; co_return n; }
 Task<std::vector<M>> findBy(Criteria c) { if(failQueries) throw DrogonDbException("private-db-detail"); std::vector<M> result; size_t n=0; for(auto &r:rows) if(c.match(r.toJson()) && n++>=skip && result.size()<max) result.push_back(r); co_return result; }
 Task<M> findOne(Criteria c) { if(queriesBeforeFailure==0) throw DrogonDbException("private-db-detail"); if(queriesBeforeFailure>0) --queriesBeforeFailure; if(failQueries) throw DrogonDbException("private-db-detail"); std::vector<M> found; for(auto &r:rows) if(c.match(r.toJson())) found.push_back(r); if(found.size()!=1) throw UnexpectedRows(); co_return found[0]; }
 Task<M> findByPrimaryKey(std::string id) { co_return co_await findOne(Criteria(M::Cols::_id,CompareOperator::EQ,id)); }
 Task<M> insert(M m) { if(failUniqueWrites) throw UniqueViolation("private-db-detail"); if constexpr (requires { M::Cols::_is_deleted; }) { if (m.data["is_deleted"].isNull()) m.data["is_deleted"]=false; } if(m.getValueOfId().empty()) m.setId("00000000-0000-4000-8000-"+std::string(12-std::to_string(rows.size()+1).size(),'0')+std::to_string(rows.size()+1)); rows.push_back(m); co_return m; }
 Task<size_t> update(M m) { if(failUniqueWrites) throw UniqueViolation("private-db-detail"); for(auto &r:rows) if(r.getValueOfId()==m.getValueOfId()) {r=m; co_return 1;} throw UnexpectedRows(); }
};
}
''')
for model in ['CoreCurrencyRates','GlCashReceipts','GlFxRevaluationRuns','GlImprestRetirements','GlBudgets','GlCashReceiptLines','GlDefaultAccounts','GlDeletedJournals','GlFxRevaluationLines','GlImprestRefunds','GlImprestRetirementLines','GlImprestWriteOffs','GlImprests','GlJournalLines','GlPaymentVoucherLines','GlPaymentVoucherRetentions','GlPaymentVouchers','GlPettyCashTransactionLines','GlPettyCashTransactions','Users','Tenants','UserGroups','Roles','GlAccountGroups','GlAccountControls','GlAccounts','GlAccountingPeriods','GlAccountBalances','GlBankAccounts','CoreAccountingUnits','CoreCurrencies']:
    header = (root / 'models' / (model+'.h')).read_text()
    cols = re.findall(r'static const std::string (_\w+);', header)
    setters = re.findall(r'void set(\w+)\(const (.+?) &p\w+\) noexcept;', header)

    # map CamelCase names back to column names
    def column(name):
        return next(c[1:] for c in cols if c[1:].replace('_','').lower()==name.lower())
    text = '#pragma once\n#include <drogon/orm/CoroMapper.h>\n#include <vector>\nnamespace drogon_model::BusinessDesk {\nstruct '+model+' {\nJson::Value data;\nstruct Cols {\n'
    for col in cols: text += 'inline static const std::string '+col+'="'+col[1:]+'";\n'
    text += '};\nJson::Value toJson() const {return data;}\n'
    for name, typ in setters:
        key = column(name)
        if typ=='std::string': body='data["'+key+'"] = v;'
        elif typ in ['bool','short','int','int16_t','int32_t','double','float']: body='data["'+key+'"] = v;'
        elif typ=='int64_t': body='data["'+key+'"] = Json::Int64(v);'
        else: body='(void)v; data["'+key+'"]="timestamp";'
        text += f'void set{name}(const {typ} &v) {{ {body} }}\n'
    for name in re.findall(r'void set(\w+)ToNull\(\) noexcept;',header): text += f'void set{name}ToNull() {{ data["{column(name)}"]=Json::nullValue; }}\n'
    for typ,name in re.findall(r'const (.+?) &getValueOf(\w+)\(\) const noexcept;',header):
        key=column(name)
        if typ=='std::string': expr=f'data["{key}"].isNull() ? "" : data["{key}"].asString()'
        elif typ=='bool': expr=f'data["{key}"].asBool()'
        elif typ in ['short','int','int16_t','int32_t','int64_t']: expr=f'data["{key}"].asInt64()'
        elif typ in ['double','float']: expr=f'data["{key}"].asDouble()'
        else: expr='{}'
        text+=f'{typ} getValueOf{name}() const {{ return {expr}; }}\n'
    for typ,name in re.findall(r'const std::shared_ptr<(.+?)> &get(\w+)\(\) const noexcept;',header):
        if typ == 'std::string':
            text+=f'std::shared_ptr<std::string> get{name}() const {{ if (data["{column(name)}"].isNull()) return {{}}; return std::make_shared<std::string>(getValueOf{name}()); }}\n'
    text += '};\n}\n'
    write(model+'.h', text)
# Authentication reads only stable security fields, not the generated billing model.
p = out / 'Tenants.h'
p.write_text(p.read_text()+'''
namespace drogon {
inline TestResult tenantAuthRows(const std::vector<Json::Value>& params,bool byAccount) {
 using M=drogon_model::BusinessDesk::Tenants;using Mapper=orm::CoroMapper<M>;
 if(Mapper::queriesBeforeFailure==0 || Mapper::failQueries)throw orm::DrogonDbException("private-db-detail");
 if(Mapper::queriesBeforeFailure>0)--Mapper::queriesBeforeFailure;
 TestResult rows;for(const auto& m:Mapper::rows){auto v=m.toJson();if(v["is_deleted"]==false && v["is_active"]==true && v[byAccount?"tenancy_name":"id"]==params.at(0))rows.push_back({v});}return rows;
}
}
''')
# HTTP seam so the production filters can be exercised, not reimplemented.
p = out / 'drogon/HttpRequest.h'
s = p.read_text().replace('struct HttpRequest {', 'enum HttpMethod { Get, Post, Put, Delete, Options };\nstruct HttpRequest {')
s = s.replace(' auto attributes() const', ''' std::string requestPath;
 const std::string &path() const { return requestPath; }
 std::string authorization;
 HttpMethod method = Get;
 std::shared_ptr<Json::Value> json;
 std::map<std::string,std::string> parameters;
 const Json::Value *getJsonObject() const { return json.get(); }
 std::string getParameter(const std::string &key) const { auto i=parameters.find(key); return i==parameters.end()?"":i->second; }
 std::string getHeader(const std::string &) const { return authorization; }
 HttpMethod getMethod() const { return method; }
 std::string getMethodString() const { return "GET"; }
 auto attributes() const''')
p.write_text(s)
write('drogon/HttpFilter.h', '''#pragma once
#include <drogon/drogon.h>
#include <functional>
#define LOG_DEBUG if(false) std::cerr
#define LOG_WARN if(false) std::cerr
namespace drogon {
enum HttpStatusCode { k200OK=200, k201Created=201, k204NoContent=204, k400BadRequest=400, k401Unauthorized=401, k403Forbidden=403, k404NotFound=404, k409Conflict=409, k500InternalServerError=500,k503ServiceUnavailable=503 };
struct HttpResponse {
 int status=200; Json::Value body; std::map<std::string,std::string> headers;
 static auto newHttpResponse() { return std::make_shared<HttpResponse>(); }
 void addHeader(const std::string &key,const std::string &value) { headers[key]=value; }
 static auto newHttpJsonResponse(Json::Value body) {auto r=std::make_shared<HttpResponse>(); r->body=body; return r;}
 void setStatusCode(HttpStatusCode s) { status=s; }
};
using HttpResponsePtr=std::shared_ptr<HttpResponse>;
using FilterCallback=std::function<void(const HttpResponsePtr &)>;
using FilterChainCallback=std::function<void()>;
template<class T> struct HttpFilter { virtual ~HttpFilter()=default; virtual void doFilter(const HttpRequestPtr &,FilterCallback &&,FilterChainCallback &&)=0; };
}
''')
write('drogon/HttpAppFramework.h','#include <drogon/drogon.h>\n')

write('drogon/HttpController.h', """#pragma once
#include <drogon/HttpFilter.h>
#define METHOD_LIST_BEGIN
#define METHOD_LIST_END
#define ADD_METHOD_TO(...)
namespace drogon { template<class T> struct HttpController {}; }
""")
write('plugins/BusinessDeskServicePlugin.h', """#pragma once
#include "domain_services/tenants/TenantService.h"
#include "domain_services/users/UserService.h"
namespace business_desk::plugins {
struct BusinessDeskServicePlugin {
 domain_services::TenantService tenants;
 domain_services::UserService users;
 domain_services::UserService &getUserService() {return users;}
 domain_services::TenantService &getTenantService() {return tenants;}
};
}
""")
