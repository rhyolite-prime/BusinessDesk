using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TopazERP.Migrations
{
    public partial class initial133 : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "WithHoldingRate",
                table: "GlPaymentVouchers",
                newName: "withHoldingRate");

            migrationBuilder.RenameColumn(
                name: "WithHoldRate",
                table: "GlPaymentVouchers",
                newName: "WithHoldingRate");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "withHoldingRate",
                table: "GlPaymentVouchers",
                newName: "WithHoldingRate");

            migrationBuilder.RenameColumn(
                name: "WithHoldingRate",
                table: "GlPaymentVouchers",
                newName: "WithHoldRate");
        }
    }
}
