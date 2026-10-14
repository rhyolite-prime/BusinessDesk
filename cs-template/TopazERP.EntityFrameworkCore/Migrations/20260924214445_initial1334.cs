using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;
using TopazERP.Models.Ledger;

#nullable disable

namespace TopazERP.Migrations
{
    public partial class initial1334 : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PettyCashTransactions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    BatchDate = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    BatchNo = table.Column<string>(type: "text", nullable: true),
                    SourceDocNo = table.Column<string>(type: "text", nullable: true),
                    PettyCashAccountId = table.Column<Guid>(type: "uuid", nullable: false),
                    PettyCashAccountName = table.Column<string>(type: "text", nullable: true),
                    BatchOriginator = table.Column<string>(type: "text", nullable: true),
                    CurrencyId = table.Column<Guid>(type: "uuid", nullable: false),
                    CurrencyName = table.Column<string>(type: "text", nullable: true),
                    CurrencyCode = table.Column<string>(type: "text", nullable: true),
                    CurrencyRate = table.Column<decimal>(type: "numeric", nullable: false),
                    TotalAmount = table.Column<decimal>(type: "numeric", nullable: false),
                    IsPosted = table.Column<bool>(type: "boolean", nullable: false),
                    Details = table.Column<List<PettyCashTransactionDetail>>(type: "jsonb", nullable: true),
                    TenantId = table.Column<int>(type: "integer", nullable: false),
                    CreationTime = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    CreatorUserId = table.Column<long>(type: "bigint", nullable: true),
                    LastModificationTime = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    LastModifierUserId = table.Column<long>(type: "bigint", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeleterUserId = table.Column<long>(type: "bigint", nullable: true),
                    DeletionTime = table.Column<DateTime>(type: "timestamp without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PettyCashTransactions", x => x.Id);
                });
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PettyCashTransactions");
        }
    }
}
