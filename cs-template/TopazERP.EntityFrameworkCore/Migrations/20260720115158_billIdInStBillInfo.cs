using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TopazERP.Migrations
{
    public partial class billIdInStBillInfo : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "BillId",
                table: "StudentBillInfos",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BillId",
                table: "StudentBillInfos");
        }
    }
}
