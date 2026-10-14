using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;
using TopazERP.Models.Sch;

#nullable disable

namespace TopazERP.Migrations
{
    public partial class schbillnPaymentinit : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "CurrencyId",
                table: "StudentOpeningBalances",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<DateTime>(
                name: "Date",
                table: "StudentOpeningBalances",
                type: "timestamp without time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<decimal>(
                name: "Rate",
                table: "StudentOpeningBalances",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<Guid>(
                name: "AcademicYearId",
                table: "StudentBillInfos",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<int>(
                name: "BillStatusId",
                table: "StudentBillInfos",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<Guid>(
                name: "ClassId",
                table: "StudentBillInfos",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "TermId",
                table: "StudentBillInfos",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.CreateTable(
                name: "BillFooters",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<int>(type: "integer", nullable: false),
                    Message = table.Column<string>(type: "text", nullable: true),
                    AcademicYearId = table.Column<Guid>(type: "uuid", nullable: false),
                    TermId = table.Column<Guid>(type: "uuid", nullable: false),
                    ToSchool = table.Column<bool>(type: "boolean", nullable: false),
                    ToClass = table.Column<bool>(type: "boolean", nullable: false),
                    OrderNumber = table.Column<int>(type: "integer", nullable: false),
                    Details = table.Column<List<BillFooterDetails>>(type: "jsonb", nullable: true),
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
                    table.PrimaryKey("PK_BillFooters", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Bills",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    AcademicYearId = table.Column<Guid>(type: "uuid", nullable: false),
                    TermId = table.Column<Guid>(type: "uuid", nullable: false),
                    ClassId = table.Column<Guid>(type: "uuid", nullable: false),
                    LevelId = table.Column<Guid>(type: "uuid", nullable: false),
                    BillNumber = table.Column<string>(type: "text", nullable: true),
                    BillDate = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    BillingScopeId = table.Column<int>(type: "integer", nullable: false),
                    IsProcessed = table.Column<bool>(type: "boolean", nullable: false),
                    IsPosted = table.Column<bool>(type: "boolean", nullable: false),
                    IsCancelled = table.Column<bool>(type: "boolean", nullable: false),
                    CanceledBy = table.Column<string>(type: "text", nullable: true),
                    CanceledDate = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    BillTypeId = table.Column<int>(type: "integer", nullable: false),
                    BatchNumber = table.Column<string>(type: "text", nullable: true),
                    TenantId = table.Column<int>(type: "integer", nullable: false),
                    Details = table.Column<List<BillDetail>>(type: "jsonb", nullable: true),
                    Students = table.Column<List<BilledStudent>>(type: "jsonb", nullable: true),
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
                    table.PrimaryKey("PK_Bills", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "BoardingFees",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    AcademicYearId = table.Column<Guid>(type: "uuid", nullable: false),
                    TermId = table.Column<Guid>(type: "uuid", nullable: false),
                    ClassId = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<int>(type: "integer", nullable: false),
                    Details = table.Column<List<BoardingFeeDetail>>(type: "jsonb", nullable: true),
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
                    table.PrimaryKey("PK_BoardingFees", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "BoardingItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: true),
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
                    table.PrimaryKey("PK_BoardingItems", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "FeeSetUps",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    AcademicYearId = table.Column<Guid>(type: "uuid", nullable: false),
                    TermId = table.Column<Guid>(type: "uuid", nullable: false),
                    ClassId = table.Column<Guid>(type: "uuid", nullable: false),
                    LevelId = table.Column<Guid>(type: "uuid", nullable: false),
                    IsClassFee = table.Column<bool>(type: "boolean", nullable: false),
                    IsLevelFee = table.Column<bool>(type: "boolean", nullable: false),
                    IsSchoolFee = table.Column<bool>(type: "boolean", nullable: false),
                    FeeType = table.Column<string>(type: "text", nullable: true),
                    TenantId = table.Column<int>(type: "integer", nullable: false),
                    Details = table.Column<List<FeeSetUpDetail>>(type: "jsonb", nullable: true),
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
                    table.PrimaryKey("PK_FeeSetUps", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "SchBillAccounts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    BillTypeId = table.Column<int>(type: "integer", nullable: false),
                    FeeItemId = table.Column<Guid>(type: "uuid", nullable: false),
                    BankGlId = table.Column<Guid>(type: "uuid", nullable: false),
                    DebitGlId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreditGlId = table.Column<Guid>(type: "uuid", nullable: false),
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
                    table.PrimaryKey("PK_SchBillAccounts", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "SchCreditMemoAccounts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    DebitGlId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreditGlId = table.Column<Guid>(type: "uuid", nullable: false),
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
                    table.PrimaryKey("PK_SchCreditMemoAccounts", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "SchCreditMemos",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    AcademicYearId = table.Column<Guid>(type: "uuid", nullable: false),
                    TermId = table.Column<Guid>(type: "uuid", nullable: false),
                    ClassId = table.Column<Guid>(type: "uuid", nullable: false),
                    StudentId = table.Column<Guid>(type: "uuid", nullable: false),
                    Date = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    ReceiptNumber = table.Column<string>(type: "text", nullable: true),
                    AmountDue = table.Column<decimal>(type: "numeric", nullable: false),
                    AmountToCredit = table.Column<decimal>(type: "numeric", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    IsPosted = table.Column<bool>(type: "boolean", nullable: false),
                    IsCanceled = table.Column<bool>(type: "boolean", nullable: false),
                    CanceledBy = table.Column<string>(type: "text", nullable: true),
                    CanceledDate = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    IsProcessed = table.Column<bool>(type: "boolean", nullable: false),
                    CurrencyId = table.Column<Guid>(type: "uuid", nullable: false),
                    Rate = table.Column<decimal>(type: "numeric", nullable: false),
                    BankId = table.Column<Guid>(type: "uuid", nullable: false),
                    BankBranchId = table.Column<Guid>(type: "uuid", nullable: false),
                    ChequeNumber = table.Column<string>(type: "text", nullable: true),
                    ChequeDate = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    PaymentMethod = table.Column<int>(type: "integer", nullable: false),
                    CreditGlId = table.Column<Guid>(type: "uuid", nullable: false),
                    DebitGlId = table.Column<Guid>(type: "uuid", nullable: false),
                    IsMultiCurrency = table.Column<bool>(type: "boolean", nullable: false),
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
                    table.PrimaryKey("PK_SchCreditMemos", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "SchPaymentAccounts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    LocalDebitGlId = table.Column<Guid>(type: "uuid", nullable: false),
                    ForeignDebitGlId = table.Column<Guid>(type: "uuid", nullable: false),
                    LocalCreditGlId = table.Column<Guid>(type: "uuid", nullable: false),
                    LocalOverPaymentGlId = table.Column<Guid>(type: "uuid", nullable: false),
                    ForeignOverPaymentGlId = table.Column<Guid>(type: "uuid", nullable: false),
                    OtherPaymentDebitGlId = table.Column<Guid>(type: "uuid", nullable: false),
                    OtherPaymentCreditGlId = table.Column<Guid>(type: "uuid", nullable: false),
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
                    table.PrimaryKey("PK_SchPaymentAccounts", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "SchPayments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    AcademicYearId = table.Column<Guid>(type: "uuid", nullable: false),
                    TermId = table.Column<Guid>(type: "uuid", nullable: false),
                    ClassId = table.Column<Guid>(type: "uuid", nullable: false),
                    StudentId = table.Column<Guid>(type: "uuid", nullable: false),
                    PaymentDate = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    AmountDue = table.Column<decimal>(type: "numeric", nullable: false),
                    AmountToPaid = table.Column<decimal>(type: "numeric", nullable: false),
                    PaymentMethod = table.Column<int>(type: "integer", nullable: false),
                    ReferenceNumber = table.Column<string>(type: "text", nullable: true),
                    BatchNumber = table.Column<string>(type: "text", nullable: true),
                    CurrencyId = table.Column<Guid>(type: "uuid", nullable: false),
                    BuyRate = table.Column<decimal>(type: "numeric", nullable: false),
                    BankGlId = table.Column<Guid>(type: "uuid", nullable: false),
                    BankId = table.Column<Guid>(type: "uuid", nullable: false),
                    BankBranchId = table.Column<Guid>(type: "uuid", nullable: false),
                    ChequeNumber = table.Column<string>(type: "text", nullable: true),
                    ChequeDate = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    IsPosted = table.Column<bool>(type: "boolean", nullable: false),
                    IsCanceled = table.Column<bool>(type: "boolean", nullable: false),
                    CanceledBy = table.Column<string>(type: "text", nullable: true),
                    CanceledDate = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    ReceiptNumber = table.Column<string>(type: "text", nullable: true),
                    IsProcessed = table.Column<bool>(type: "boolean", nullable: false),
                    LegalGuardianId = table.Column<Guid>(type: "uuid", nullable: false),
                    ByLegalGuardian = table.Column<bool>(type: "boolean", nullable: false),
                    CreditGlId = table.Column<Guid>(type: "uuid", nullable: false),
                    DebitGlId = table.Column<Guid>(type: "uuid", nullable: false),
                    IsMultiCurrency = table.Column<bool>(type: "boolean", nullable: false),
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
                    table.PrimaryKey("PK_SchPayments", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "TransportationBills",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    AcademicYearId = table.Column<Guid>(type: "uuid", nullable: false),
                    TermId = table.Column<Guid>(type: "uuid", nullable: false),
                    ClassId = table.Column<Guid>(type: "uuid", nullable: false),
                    LevelId = table.Column<Guid>(type: "uuid", nullable: false),
                    IsProcessed = table.Column<bool>(type: "boolean", nullable: false),
                    IsCancelled = table.Column<bool>(type: "boolean", nullable: false),
                    BillNumber = table.Column<string>(type: "text", nullable: true),
                    TenantId = table.Column<int>(type: "integer", nullable: false),
                    BillDate = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    IsPosted = table.Column<bool>(type: "boolean", nullable: false),
                    CanceledBy = table.Column<string>(type: "text", nullable: true),
                    CanceledDate = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    BatchNumber = table.Column<string>(type: "text", nullable: true),
                    Details = table.Column<List<TransportationBillDetails>>(type: "jsonb", nullable: true),
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
                    table.PrimaryKey("PK_TransportationBills", x => x.Id);
                });
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "BillFooters");

            migrationBuilder.DropTable(
                name: "Bills");

            migrationBuilder.DropTable(
                name: "BoardingFees");

            migrationBuilder.DropTable(
                name: "BoardingItems");

            migrationBuilder.DropTable(
                name: "FeeSetUps");

            migrationBuilder.DropTable(
                name: "SchBillAccounts");

            migrationBuilder.DropTable(
                name: "SchCreditMemoAccounts");

            migrationBuilder.DropTable(
                name: "SchCreditMemos");

            migrationBuilder.DropTable(
                name: "SchPaymentAccounts");

            migrationBuilder.DropTable(
                name: "SchPayments");

            migrationBuilder.DropTable(
                name: "TransportationBills");

            migrationBuilder.DropColumn(
                name: "CurrencyId",
                table: "StudentOpeningBalances");

            migrationBuilder.DropColumn(
                name: "Date",
                table: "StudentOpeningBalances");

            migrationBuilder.DropColumn(
                name: "Rate",
                table: "StudentOpeningBalances");

            migrationBuilder.DropColumn(
                name: "AcademicYearId",
                table: "StudentBillInfos");

            migrationBuilder.DropColumn(
                name: "BillStatusId",
                table: "StudentBillInfos");

            migrationBuilder.DropColumn(
                name: "ClassId",
                table: "StudentBillInfos");

            migrationBuilder.DropColumn(
                name: "TermId",
                table: "StudentBillInfos");
        }
    }
}
