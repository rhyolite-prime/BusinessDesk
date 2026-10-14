using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TopazERP.Migrations
{
    public partial class initial1332 : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsTemporary",
                table: "Journals",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsTemporary",
                table: "Journals");
        }
    }
}
