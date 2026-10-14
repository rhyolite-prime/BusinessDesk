using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TopazERP.Migrations
{
    public partial class initial131 : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "IsFixedAmount",
                table: "PvRetensions",
                newName: "IsPercentage");

            migrationBuilder.RenameColumn(
                name: "CreditGLName",
                table: "PvRetensions",
                newName: "CreditAccountName");

            migrationBuilder.RenameColumn(
                name: "CreditGLId",
                table: "PvRetensions",
                newName: "CreditAccountId");

            migrationBuilder.AddColumn<string>(
                name: "TaxType",
                table: "GlPaymentVouchers",
                type: "text",
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "TaxType",
                table: "GlPaymentVouchers");

            migrationBuilder.RenameColumn(
                name: "IsPercentage",
                table: "PvRetensions",
                newName: "IsFixedAmount");

            migrationBuilder.RenameColumn(
                name: "CreditAccountName",
                table: "PvRetensions",
                newName: "CreditGLName");

            migrationBuilder.RenameColumn(
                name: "CreditAccountId",
                table: "PvRetensions",
                newName: "CreditGLId");
        }
    }
}
