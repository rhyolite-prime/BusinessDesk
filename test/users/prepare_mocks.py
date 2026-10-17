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
namespace trantor { struct Date { static Date now() { return {}; } }; }
''')
write('drogon/HttpRequest.h', '''#pragma once
#include <any>
#include <map>
#include <memory>
#include <string>
namespace drogon {
struct Attributes {
 std::map<std::string,std::any> data;
 bool find(const std::string &k) { return data.count(k); }
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
struct Application { Json::Value config; int getDbClient() { return 0; } Json::Value getCustomConfig() { return config; } };
inline Application &app() { static Application instance; return instance; }
}
''')
write('drogon/utils/coroutine.h','#include <drogon/drogon.h>\n')
write('drogon/orm/CoroMapper.h', '''#pragma once
#include <drogon/drogon.h>
#include <functional>
#include <vector>
namespace drogon::orm {
struct DrogonDbException : std::runtime_error { using std::runtime_error::runtime_error; const auto &base() const { return *this; } };
struct UnexpectedRows : DrogonDbException { UnexpectedRows():DrogonDbException("Not found") {} };
enum class CompareOperator { EQ, NE, IsNull, Like };
struct Criteria {
 std::function<bool(const Json::Value &)> match = [](auto &) { return true; };
 Criteria() = default;
 Criteria(std::string k, CompareOperator op) { match = [k,op](auto &r) { return op==CompareOperator::IsNull && r[k].isNull(); }; }
 template<class T> Criteria(std::string k, CompareOperator op, T v) {
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
 size_t max=1000000, skip=0;
 explicit CoroMapper(int) {}
 auto &limit(size_t n) { max=n; return *this; } auto &offset(size_t n) { skip=n; return *this; }
 Task<size_t> count(Criteria c) { size_t n=0; for(auto &r:rows) if(c.match(r.toJson())) ++n; co_return n; }
 Task<std::vector<M>> findBy(Criteria c) { std::vector<M> result; size_t n=0; for(auto &r:rows) if(c.match(r.toJson()) && n++>=skip && result.size()<max) result.push_back(r); co_return result; }
 Task<M> findOne(Criteria c) { std::vector<M> found; for(auto &r:rows) if(c.match(r.toJson())) found.push_back(r); if(found.size()!=1) throw UnexpectedRows(); co_return found[0]; }
 Task<M> findByPrimaryKey(std::string id) { co_return co_await findOne(Criteria(M::Cols::_id,CompareOperator::EQ,id)); }
 Task<M> insert(M m) { if(m.getValueOfId().empty()) m.setId("id-"+std::to_string(rows.size()+1)); rows.push_back(m); co_return m; }
 Task<size_t> update(M m) { for(auto &r:rows) if(r.getValueOfId()==m.getValueOfId()) {r=m; co_return 1;} throw UnexpectedRows(); }
};
}
''')
for model in ['Users','Tenants','UserGroups','Roles']:
    header = (root / 'models' / (model+'.h')).read_text()
    cols = re.findall(r'static const std::string (_\w+);', header)
    setters = re.findall(r'void set(\w+)\(const (.+?) &p\w+\) noexcept;', header)
    getters = dict(re.findall(r'const (.+?) &getValueOf(\w+)\(\) const noexcept;', header))
    # map CamelCase names back to column names
    def column(name):
        return next(c[1:] for c in cols if c[1:].replace('_','').lower()==name.lower())
    text = '#pragma once\n#include <drogon/orm/CoroMapper.h>\n#include <vector>\nnamespace drogon_model::BusinessDesk {\nstruct '+model+' {\nJson::Value data;\nstruct Cols {\n'
    for col in cols: text += 'inline static const std::string '+col+'="'+col[1:]+'";\n'
    text += '};\nJson::Value toJson() const {return data;}\n'
    for name, typ in setters:
        key = column(name)
        if typ=='std::string': body='data["'+key+'"] = v;'
        elif typ in ['bool','int32_t']: body='data["'+key+'"] = v;'
        elif typ=='int64_t': body='data["'+key+'"] = Json::Int64(v);'
        else: body='(void)v; data["'+key+'"]="timestamp";'
        text += f'void set{name}(const {typ} &v) {{ {body} }}\n'
    for name in re.findall(r'void set(\w+)ToNull\(\) noexcept;',header): text += f'void set{name}ToNull() {{ data["{column(name)}"]=Json::nullValue; }}\n'
    for typ,name in re.findall(r'const (.+?) &getValueOf(\w+)\(\) const noexcept;',header):
        key=column(name)
        if typ=='std::string': expr=f'data["{key}"].isNull() ? "" : data["{key}"].asString()'
        elif typ=='bool': expr=f'data["{key}"].asBool()'
        elif typ in ['int32_t','int64_t']: expr=f'data["{key}"].asInt64()'
        else: expr='{}'
        text+=f'{typ} getValueOf{name}() const {{ return {expr}; }}\n'
    for name in ['Roles']:
        if name.lower() in [c[1:] for c in cols]: text+=f'bool get{name}() const {{ return !data["{name.lower()}"].isNull(); }}\n'
    text += '};\n}\n'
    write(model+'.h', text)
# HTTP seam so the production filters can be exercised, not reimplemented.
p = out / 'drogon/HttpRequest.h'
s = p.read_text().replace('struct HttpRequest {', 'enum HttpMethod { Get, Options };\nstruct HttpRequest {')
s = s.replace(' auto attributes() const', ''' std::string authorization;
 HttpMethod method = Get;
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
enum HttpStatusCode { k200OK=200, k401Unauthorized=401 };
struct HttpResponse {
 int status=200; Json::Value body;
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
