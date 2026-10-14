using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TopazERP.Migrations
{
    public partial class initial1333 : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsPosted",
                table: "GlPaymentVouchers",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsPosted",
                table: "GlPaymentVouchers");
        }
    }
}
