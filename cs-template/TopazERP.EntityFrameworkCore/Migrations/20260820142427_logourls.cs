using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TopazERP.Migrations
{
    public partial class logourls : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "SchoolLogo",
                table: "SchoolProfiles",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SignatureUrl",
                table: "SchoolProfiles",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CompanyLogoUrl",
                table: "CompanyProfiles",
                type: "text",
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SchoolLogo",
                table: "SchoolProfiles");

            migrationBuilder.DropColumn(
                name: "SignatureUrl",
                table: "SchoolProfiles");

            migrationBuilder.DropColumn(
                name: "CompanyLogoUrl",
                table: "CompanyProfiles");
        }
    }
}
