using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TopazERP.Migrations
{
    public partial class initial132 : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CreditGlAccountName",
                table: "GlPaymentVouchers");

            migrationBuilder.DropColumn(
                name: "CreditGlId",
                table: "GlPaymentVouchers");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CreditGlAccountName",
                table: "GlPaymentVouchers",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CreditGlId",
                table: "GlPaymentVouchers",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));
        }
    }
}
