#pragma once
#include <drogon/drogon.h>
#include <drogon/orm/CoroMapper.h>
namespace business_desk::utils {
// Await the commit callback after releasing the last owner of the transaction.
// All mapper/DbClient copies must have left scope before awaiting this object.
struct CommitTransaction {
    std::shared_ptr<drogon::orm::Transaction> transaction;
    bool committed = false;
    bool await_ready() const noexcept { return false; }
    void await_suspend(std::coroutine_handle<> continuation) {
        transaction->setCommitCallback([this, continuation](bool ok) { committed = ok; continuation.resume(); });
        transaction.reset();
    }
    bool await_resume() const noexcept { return committed; }
};
}
