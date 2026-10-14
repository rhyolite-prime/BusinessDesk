using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TopazERP.Migrations
{
    public partial class schPaymentnBillUpdate : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CanceledBy",
                table: "StudentBillInfos",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsCanceled",
                table: "StudentBillInfos",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<decimal>(
                name: "Balance",
                table: "SchPayments",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CanceledBy",
                table: "StudentBillInfos");

            migrationBuilder.DropColumn(
                name: "IsCanceled",
                table: "StudentBillInfos");

            migrationBuilder.DropColumn(
                name: "Balance",
                table: "SchPayments");
        }
    }
}
