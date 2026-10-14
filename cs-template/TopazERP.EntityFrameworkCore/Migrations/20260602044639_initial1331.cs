using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TopazERP.Migrations
{
    public partial class initial1331 : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "WithHoldingRate",
                table: "GlPaymentVouchers");

            migrationBuilder.RenameColumn(
                name: "withHoldingRate",
                table: "GlPaymentVouchers",
                newName: "WithHoldingRate");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "WithHoldingRate",
                table: "GlPaymentVouchers",
                newName: "withHoldingRate");

            migrationBuilder.AddColumn<decimal>(
                name: "WithHoldingRate",
                table: "GlPaymentVouchers",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);
        }
    }
}
